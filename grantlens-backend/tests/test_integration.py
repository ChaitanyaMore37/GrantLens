from pathlib import Path
import shutil
import pytest
from app.services.ingestion import ingest,ValidationError
from app.services.pipeline import run
from app.services.graphs import serialize,node_id
DATA=Path(__file__).resolve().parents[2]/'Synthetic Scholarship Dataset'/'grantlens-dataset'/'data'/'sample'/'main'

def test_supplied_schema_and_direction():
    result=run(DATA)
    assert len(result.dataset.beneficiaries)==1000
    assert set(result.dataset.references)=={'institutions','accounts','scheme_rules','account_authorizations'}
    assert any(a['approved_amount']==0 for a in result.dataset.applications)
    assert all(t['transaction_type'] in ['TRANSFER','DISBURSEMENT'] for t in result.dataset.transactions)
    t=next(t for t in result.dataset.transactions if t['transaction_type']=='TRANSFER')
    a,b=node_id('BANK_ACCOUNT',t['sender_account']),node_id('BANK_ACCOUNT',t['receiver_account'])
    g=serialize(result.graph,[a,b],{})
    edge=next(e['data'] for e in g['edges'] if e['data']['id']==t['transaction_id'])
    assert (edge['source'],edge['target'],edge['amount'])==(a,b,t['amount'])
    assert result.summary['total_disbursed']==27324250

def test_unknown_reference_rejected(tmp_path):
    shutil.copytree(DATA,tmp_path/'input')
    p=tmp_path/'input'/'reference'/'institutions.csv'
    s=p.read_text();p.write_text(s.replace('INST-','MISSING-',1))
    with pytest.raises(ValidationError): ingest(tmp_path/'input')

def test_no_labels_read(tmp_path):
    shutil.copytree(DATA,tmp_path/'input')
    first=run(tmp_path/'input')
    (tmp_path/'input'/'ground_truth.csv').write_text('INVALID EVALUATION FILE')
    second=run(tmp_path/'input')
    assert first.risks==second.risks and first.matches==second.matches
