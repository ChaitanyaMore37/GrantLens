"""Semantic and adversarial validator tests; no detection model is implemented."""
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from generate_dataset import generate
from validate_dataset import validate, ValidationError, simple_cycles
from schema import read_csv, write_csv

class DatasetTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp=tempfile.TemporaryDirectory()
        cls.base=Path(cls.tmp.name)/'base'
        cls.meta=generate(1000,42,cls.base)

    @classmethod
    def tearDownClass(cls): cls.tmp.cleanup()

    def test_complete_small_dataset(self):
        report=validate(self.base)
        self.assertEqual(report['statistics']['beneficiaries'],1000)
        self.assertEqual(report['statistics']['dbt_disbursements'],1350)
        self.assertEqual(report['statistics']['cl017']['disbursed_inr'],'820000.00')

    def test_byte_reproducibility(self):
        other=Path(self.tmp.name)/'same'
        generate(1000,42,other)
        for path in self.base.rglob('*'):
            if path.is_file(): self.assertEqual(path.read_bytes(),(other/path.relative_to(self.base)).read_bytes(),str(path))

    def test_multiple_seeds(self):
        for seed in (0,7,123,2026):
            with self.subTest(seed=seed):
                path=Path(self.tmp.name)/f'seed-{seed}'
                generate(1000,seed,path)
                self.assertEqual(validate(path)['status'],'PASS')

    def mutate(self,relative,edit):
        path=Path(self.tmp.name)/'mutation'
        if path.exists(): shutil.rmtree(path)
        shutil.copytree(self.base,path)
        headers,rows=read_csv(path/relative)
        edit(headers,rows)
        write_csv(path/relative,headers,rows)
        return path

    def test_duplicate_primary_key_rejected(self):
        def edit(h,r): r[1]['beneficiary_id']=r[0]['beneficiary_id']
        with self.assertRaisesRegex(ValidationError,'Duplicate key'):
            validate(self.mutate('main/beneficiaries.csv',edit),False)

    def test_missing_foreign_key_rejected(self):
        def edit(h,r): r[0]['beneficiary_id']='BEN-999999'
        with self.assertRaisesRegex(ValidationError,'foreign key'):
            validate(self.mutate('main/applications.csv',edit),False)

    def test_label_leakage_column_rejected(self):
        def edit(h,r): h.append('actual_person_id')
        with self.assertRaisesRegex(ValidationError,'header mismatch'):
            validate(self.mutate('main/beneficiaries.csv',edit),False)

    def test_unfunded_transfer_rejected(self):
        def edit(h,r):
            transfer=next(t for t in r if t['transaction_type']=='ACCOUNT_TRANSFER')
            transfer['amount']='999999999.00'
        with self.assertRaisesRegex(ValidationError,'Unfunded transfer'):
            validate(self.mutate('main/transactions.csv',edit),False)

    def test_unapproved_disbursement_rejected(self):
        def edit(h,r):
            a=next(a for a in r if a['application_status']=='APPROVED' and a['enrollment_status']=='ENROLLED')
            a['application_status']='REJECTED'; a['approved_amount']='0.00'
        with self.assertRaisesRegex(ValidationError,'Unapproved disbursement'):
            validate(self.mutate('main/applications.csv',edit),False)

    def test_missing_identity_positive_rejected(self):
        def edit(h,r):
            r.remove(next(p for p in r if p['same_actual_person']=='1'))
        with self.assertRaisesRegex(ValidationError,'Positive identity pairs are incomplete'):
            validate(self.mutate('ground_truth/ground_truth_pairs.csv',edit),False)

    def test_payment_amount_mismatch_rejected(self):
        def edit(h,r):
            payment=next(t for t in r if t['transaction_type']=='DBT_DISBURSEMENT')
            payment['amount']=f'{float(payment["amount"])+1:.2f}'
        with self.assertRaisesRegex(ValidationError,'Award payment reconciliation'):
            validate(self.mutate('main/transactions.csv',edit),False)

    def test_collector_edge_removal_rejected(self):
        ev=json.loads((self.base/'ground_truth/ring_evidence.json').read_text())['rings']
        rid=next(r for r in ev if r['scenarios']==['COMMON_COLLECTION_ACCOUNT'])
        victim=rid['transfer_ids'][0]
        def edit(h,r): r.remove(next(t for t in r if t['transaction_id']==victim))
        with self.assertRaisesRegex(ValidationError,'Missing ring transfer'):
            validate(self.mutate('main/transactions.csv',edit),False)

    def test_bad_date_rejected(self):
        def edit(h,r): r[0]['dob']='2004-02-31'
        with self.assertRaises(ValueError): validate(self.mutate('main/beneficiaries.csv',edit),False)

    def test_pair_false_label_rejected(self):
        def edit(h,r): r[0]['same_actual_person']=str(1-int(r[0]['same_actual_person']))
        with self.assertRaisesRegex(ValidationError,'pair truth inconsistency'):
            validate(self.mutate('ground_truth/ground_truth_pairs.csv',edit),False)

    def test_cycle_algorithm_known_graph(self):
        comps,cycles=simple_cycles({('a','b'),('b','a'),('b','c'),('c','a'),('q','r')})
        self.assertEqual(len(comps),1)
        self.assertEqual({tuple(x) for x in cycles},{('a','b'),('a','b','c')})

    def test_configuration_boundary(self):
        with self.assertRaises(ValueError): generate(999,42,Path(self.tmp.name)/'bad')
        with self.assertRaises(ValueError): generate(1000,42,Path(self.tmp.name)/'bad',1.1)

if __name__=='__main__': unittest.main(verbosity=2)
