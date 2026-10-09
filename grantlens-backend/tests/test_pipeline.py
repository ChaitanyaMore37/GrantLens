import json
import pandas as pd
import pytest
from app.services.synthetic import generate
from app.services.pipeline import run
from app.services.ingestion import ingest,ValidationError
from app.services.evaluation import evaluate
from app.services.graphs import neighbors,serialize


@pytest.fixture(scope='module')
def processed(tmp_path_factory):
    path=generate(tmp_path_factory.mktemp('ledger'),1000)
    return path,run(path)


def test_scenarios_and_legitimate_controls(processed):
    path,result=processed
    metrics=evaluate(result,path/'ground_truth.csv')
    for scenario in ['identity_cloning','shared_payout','scheme_overlap','ghost_identity','collector','circular_transfer','batch_fabrication']:
        assert metrics['scenario_flag_rates'][scenario]==1, scenario
    for scenario in ['legitimate_hostel','legitimate_guardian','legitimate_same_name']:
        assert metrics['scenario_flag_rates'][scenario]==0, scenario
    assert metrics['identity_matching']['precision']>=.95
    assert metrics['identity_matching']['recall']>=.9
    assert len(result.cycles)==2
    assert all(len(c['transactions'])==3 for c in result.cycles)


def test_truth_never_affects_detection(processed):
    path,result=processed
    (path/'ground_truth.csv').write_text('deliberately invalid labels',encoding='utf-8')
    repeated=run(path)
    assert result.risks==repeated.risks
    assert result.matches==repeated.matches


def test_reproducible(tmp_path):
    a=generate(tmp_path/'a',300); b=generate(tmp_path/'b',300)
    assert (a/'beneficiaries.csv').read_bytes()==(b/'beneficiaries.csv').read_bytes()


def test_invalid_rows_reported(tmp_path):
    path=generate(tmp_path,300)
    frame=pd.read_csv(path/'transactions.csv'); frame.loc[0,'amount']=-1
    frame.to_csv(path/'transactions.csv',index=False)
    with pytest.raises(ValidationError) as exc: ingest(path)
    assert exc.value.report['rejected_rows'][0]['record_id']=='TXN-0000001'


def test_graph_bound_and_no_institution_projection(processed):
    _,r=processed
    nodes,truncated=neighbors(r.graph,'BEN-000001',3,20)
    output=serialize(r.graph,nodes,r.risks,20)
    assert len(output['nodes'])<=20
    assert truncated
    assert not any(set(c['beneficiary_ids']) & {'BEN-000161'} for c in r.clusters)


def test_cycle_order_and_risk_contributions(processed):
    _,r=processed
    for c in r.cycles:
        timestamps=[t['timestamp'] for t in c['transactions']]
        assert timestamps==sorted(timestamps)
    for risk in r.risks.values():
        assert risk['risk_score']==min(100,sum(e['contribution'] for e in risk['evidence']))
    assert not any(m['verified_merge'] for m in r.matches)
