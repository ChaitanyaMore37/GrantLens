import re
from dataclasses import dataclass, field
from pathlib import Path
import pandas as pd

FIELDS = {
    'beneficiaries': 'beneficiary_id full_name dob gender phone address district state pincode bank_account_id ifsc_code institution_id registration_date'.split(),
    'applications': 'application_id beneficiary_id scheme_id academic_year institution_id enrollment_status income_band application_status approved_amount application_date'.split(),
    'transactions': 'transaction_id timestamp sender_account receiver_account amount transaction_type application_id'.split(),
}
DATES = {'beneficiaries':['dob','registration_date'], 'applications':['application_date'], 'transactions':['timestamp']}


class ValidationError(ValueError):
    def __init__(self, report):
        self.report = report
        super().__init__('Dataset validation failed; no records were committed')


@dataclass
class Dataset:
    beneficiaries: list
    applications: list
    transactions: list
    report: dict
    references: dict = field(default_factory=dict)


def normalize(value):
    return re.sub(r'\s+', ' ', str(value).strip()).casefold()


def ingest(directory):
    tables, rejected, warnings = {}, [], []
    for table, fields in FIELDS.items():
        file = Path(directory)/f'{table}.csv'
        try:
            frame = pd.read_csv(file, dtype=str, keep_default_na=False, encoding='utf-8-sig')
        except (OSError, ValueError, UnicodeError) as exc:
            raise ValidationError({'rejected_rows':[], 'errors':[f'{table}: {exc}'], 'warnings':[]}) from exc
        missing = sorted(set(fields)-set(frame.columns))
        if missing:
            raise ValidationError({'rejected_rows':[], 'errors':[f'{table}: missing columns {missing}'], 'warnings':[]})
        if len(frame) > 250000:
            raise ValidationError({'errors':[f'{table}: maximum 250000 rows'], 'rejected_rows':[], 'warnings':[]})
        rows, seen = [], set()
        for index, raw in enumerate(frame[fields].to_dict('records'), 2):
            row = {k:v.strip() for k,v in raw.items()}
            errors = [f'{k} is required' for k,v in row.items() if not v and not (table=='transactions' and k=='application_id')]
            pk = row[fields[0]]
            if pk in seen:
                errors.append('duplicate primary identifier')
            seen.add(pk)
            for key in DATES[table]:
                try:
                    row[key] = pd.Timestamp(row[key]).isoformat()
                    if row[key] == 'NaT':
                        raise ValueError('missing date')
                except (ValueError, TypeError):
                    errors.append(f'invalid {key}')
            if table == 'applications':
                row['application_status'] = row['application_status'].title()
            if table == 'transactions':
                row['transaction_type'] = {'DBT_DISBURSEMENT':'DISBURSEMENT', 'ACCOUNT_TRANSFER':'TRANSFER'}.get(row['transaction_type'], row['transaction_type'])
            for key in ['approved_amount','amount']:
                if key in row:
                    try:
                        from decimal import Decimal, InvalidOperation
                        amount = Decimal(row[key])
                        if not amount.is_finite() or amount < 0 or (amount == 0 and (key == 'amount' or row.get('application_status') in ['Approved','Paid'])) or amount != amount.quantize(Decimal('0.01')):
                            raise ValueError()
                        row[key] = float(amount)
                    except (ValueError, InvalidOperation):
                        errors.append(f'{key} must be positive finite money with at most two decimals')
            if table == 'beneficiaries':
                row['name_normalized'] = re.sub(r'[^\w\s]', '', normalize(row['full_name']))
                row['address_normalized'] = normalize(row['address'])
                row['phone'] = re.sub(r'[^0-9A-Z]', '', row['phone'].upper())
                for key in ['district','pincode']:
                    row[key] = normalize(row[key])
            for key in ['bank_account_id','sender_account','receiver_account','ifsc_code']:
                if key in row:
                    row[key] = row[key].upper().replace(' ', '')
            if table == 'transactions' and row['transaction_type'] not in ['TRANSFER','DISBURSEMENT']:
                errors.append('transaction_type must be TRANSFER or DISBURSEMENT')
            if errors:
                rejected.append({'table':table, 'row':index, 'record_id':pk, 'errors':errors, 'original':raw})
            else:
                row['original'] = raw
                rows.append(row)
        tables[table] = rows
    beneficiaries = {r['beneficiary_id']:r for r in tables['beneficiaries']}
    applications = {r['application_id']:r for r in tables['applications']}
    for table, fk, target in [('applications','beneficiary_id',beneficiaries), ('transactions','application_id',applications)]:
        for row in tables[table]:
            if row[fk] and row[fk] not in target:
                rejected.append({'table':table,'record_id':row[FIELDS[table][0]],'errors':[f'unknown {fk}']})
    for row in tables['transactions']:
        if row['transaction_type'] == 'DISBURSEMENT' and not row['application_id']:
            rejected.append({'table':'transactions','record_id':row['transaction_id'],'errors':['disbursement requires application_id']})
    references = {}
    refdir = Path(directory)/'reference'
    refkeys = {'institutions':'institution_id', 'accounts':'bank_account_id', 'scheme_rules':'scheme_id', 'account_authorizations':'beneficiary_id'}
    if refdir.exists():
        for name, key in refkeys.items():
            file = refdir/f'{name}.csv'
            if not file.exists():
                rejected.append({'table':name,'errors':['All four reference files are required together']})
                continue
            frame = pd.read_csv(file,dtype=str,keep_default_na=False)
            required = {'institutions':['institution_id','fictional_institution_name'], 'accounts':['bank_account_id','account_role'], 'scheme_rules':['scheme_id','scheme_name','exclusivity_group'], 'account_authorizations':['beneficiary_id','bank_account_id','relationship','authorization_date']}[name]
            if set(required)-set(frame.columns):
                rejected.append({'table':name,'errors':['Missing reference columns']})
                continue
            references[name] = frame.to_dict('records')
            keys = [r[key] if name != 'account_authorizations' else (r[key],r['bank_account_id']) for r in references[name]]
            if len(keys) != len(set(keys)):
                rejected.append({'table':name,'errors':['Duplicate reference key']})
        targets = {name:{r[key] for r in references.get(name,[])} for name,key in refkeys.items()}
        for table, cols in {'beneficiaries':{'bank_account_id':'accounts','institution_id':'institutions'},'applications':{'scheme_id':'scheme_rules','institution_id':'institutions'},'transactions':{'sender_account':'accounts','receiver_account':'accounts'}}.items():
            for row in tables[table]:
                for col, target in cols.items():
                    if row[col] not in targets[target]:
                        rejected.append({'table':table,'record_id':row[FIELDS[table][0]],'errors':[f'Unknown reference {col}']})
        for row in references.get('account_authorizations',[]):
            if row['beneficiary_id'] not in beneficiaries or row['bank_account_id'] not in targets['accounts']:
                rejected.append({'table':'account_authorizations','errors':['Unknown beneficiary or account']})
    else:
        warnings.append('Reference tables not supplied; reference validation and reference-based scheme rules unavailable.')
    for row in tables['applications']:
        if row['application_status'] not in ['Approved','Paid','Rejected','Pending','Cancelled']:
            rejected.append({'table':'applications','errors':['Unknown application status']})
        elif row['application_status'] not in ['Approved','Paid'] and row['approved_amount'] != 0:
            rejected.append({'table':'applications','errors':['Unapproved award must be zero']})
    for row in tables['transactions']:
        a = applications.get(row['application_id'])
        if row['transaction_type']=='DISBURSEMENT' and a and (a['application_status'] not in ['Approved','Paid'] or beneficiaries.get(a['beneficiary_id'],{}).get('bank_account_id') != row['receiver_account']):
            rejected.append({'table':'transactions','record_id':row['transaction_id'],'errors':['Disbursement must reference approved application and its beneficiary payout account']})
    report = {'rejected_rows':rejected, 'warnings':warnings, 'errors':[], 'accepted_counts':{k:len(v) for k,v in tables.items()}}
    if rejected:
        raise ValidationError(report)
    return Dataset(**tables, report=report, references=references)
