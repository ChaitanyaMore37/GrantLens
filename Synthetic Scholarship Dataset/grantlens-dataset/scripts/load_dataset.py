#!/usr/bin/env python3
"""Pandas backend loading example. Evaluation labels require a separate opt-in."""
from pathlib import Path
import argparse
import pandas as pd

def load_detection_data(data_dir='data'):
    root=Path(data_dir)
    beneficiaries=pd.read_csv(root/'main/beneficiaries.csv',dtype='string',keep_default_na=False)
    applications=pd.read_csv(root/'main/applications.csv',dtype='string',keep_default_na=False)
    transactions=pd.read_csv(root/'main/transactions.csv',dtype='string',keep_default_na=False)
    # Keep identifiers (including PIN and phone) as text. Whole-rupee fixture
    # amounts convert exactly to integers; production paise should use Decimal.
    applications['approved_amount']=pd.to_numeric(applications['approved_amount']).astype('int64')
    transactions['amount']=pd.to_numeric(transactions['amount']).astype('int64')
    transactions['application_id']=transactions['application_id'].replace('',pd.NA)
    for frame,col in [(beneficiaries,'dob'),(applications,'application_date')]:
        frame[col]=pd.to_datetime(frame[col],format='%Y-%m-%d')
    for frame,col in [(beneficiaries,'registration_date'),(transactions,'timestamp')]:
        frame[col]=pd.to_datetime(frame[col],utc=True)
    return beneficiaries,applications,transactions

def load_evaluation_labels(data_dir='data'):
    """Offline evaluator ONLY. Never join into features or engine input."""
    return pd.read_csv(Path(data_dir)/'ground_truth/ground_truth.csv',dtype={'record_id':'string','actual_person_id':'string','scenario_type':'string','fraud_ring_id':'string','description':'string','is_injected_suspicious':'int8'},keep_default_na=False)

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data',default='data')
    parser.add_argument('--with-evaluation-labels',action='store_true')
    args=parser.parse_args()
    b,a,t=load_detection_data(args.data)
    print(f'Detection inputs: {len(b)} beneficiaries, {len(a)} applications, {len(t)} transactions')
    if args.with_evaluation_labels:
        labels=load_evaluation_labels(args.data)
        print(f'Offline evaluation only: {len(labels)} labels; not joined to detection inputs')
