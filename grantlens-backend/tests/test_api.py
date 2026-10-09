import importlib
import io
import json
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path,monkeypatch):
    monkeypatch.setenv('GRANTLENS_DATA',str(tmp_path))
    monkeypatch.setenv('GRANTLENS_DB',f'sqlite:///{tmp_path / "test.db"}')
    import app.db
    import app.main
    app.db.engine.dispose()
    importlib.reload(app.db); importlib.reload(app.main)
    with TestClient(app.main.app) as c:
        yield c
    app.db.engine.dispose()


def test_full_api(client):
    c=client
    assert c.get('/api/v1/health').status_code==200
    assert c.get('/api/v1/config').json()['exclusive_schemes']
    seeded=c.post('/api/v1/demo/seed',json={'count':300})
    assert seeded.status_code==201,seeded.text
    aid=seeded.json()['audit_id']; query={'audit_id':aid}
    assert c.get(f'/api/v1/audits/{aid}/summary').status_code==409
    response=c.post(f'/api/v1/audits/{aid}/run')
    assert response.status_code==202,response.text
    assert c.get(f'/api/v1/audits/{aid}/status').json()['status']=='Completed'
    assert c.get(f'/api/v1/audits/{aid}/summary').json()['cycle_count']==2
    listing=c.get('/api/v1/beneficiaries',params={**query,'limit':3}).json()
    assert len(listing['items'])==3 and listing['total']==300
    assert listing['items'][0]['bank_account_id'].startswith('••••')
    assert 'original' not in listing['items'][0]
    assert c.get('/api/v1/beneficiaries/BEN-000021/matches',params=query).json()['total']>=1
    assert c.get('/api/v1/beneficiaries/BEN-000001',params=query).status_code==200
    clusters=c.get('/api/v1/clusters',params=query).json()['items']
    cid=clusters[0]['cluster_id']
    for suffix in ['', '/graph']:
        assert c.get(f'/api/v1/clusters/{cid}{suffix}',params=query).status_code==200
    graph=c.get('/api/v1/graph/neighbors',params={**query,'node_id':'BEN-000001','hops':3,'limit':15}).json()
    assert len(graph['nodes'])<=15
    assert c.get('/api/v1/graph/path',params={**query,'source':'BEN-000001','target':'BEN-000002'}).status_code==200
    assert c.get('/api/v1/cases',params=query).json()['total']>0
    demo=c.get('/api/v1/cases/CL-017',params=query).json()
    assert len(demo['beneficiary_ids'])==16 and demo['risk_score']>=30
    patch=c.patch('/api/v1/cases/CL-017',params=query,json={'status':'In Investigation','note':'Verify guardian arrangement.'})
    assert patch.status_code==200,patch.text
    report=c.get('/api/v1/cases/CL-017/report',params=query).json()
    assert report['status']=='In Investigation' and len(report['notes'])==1
    assert c.patch('/api/v1/cases/CL-017',params=query,json={'status':'Guilty'}).status_code==422
    assert c.get('/api/v1/graph/neighbors',params={**query,'node_id':'missing'}).status_code==404
    assert c.get('/api/v1/beneficiaries',params={'limit':10000}).status_code==422
    # Reruns preserve reviewer decisions.
    c.post(f'/api/v1/audits/{aid}/run')
    assert c.get('/api/v1/cases/CL-017',params=query).json()['status']=='In Investigation'
    assert c.get('/openapi.json').status_code==200


def test_upload_and_errors(client,tmp_path):
    from app.services.synthetic import generate
    path=generate(tmp_path/'upload',300)
    files={name:(name+'.csv',(path/(name+'.csv')).read_bytes(),'text/csv') for name in ['beneficiaries','applications','transactions']}
    response=client.post('/api/v1/audits/upload',files=files)
    assert response.status_code==201,response.text
    files['beneficiaries']=('bad.csv',b'x\n1\n','text/csv')
    response=client.post('/api/v1/audits/upload',files=files)
    assert response.status_code==422 and response.json()['error']['code']=='dataset_invalid'


def test_supplied_upload_ui_scope_and_filters(client):
    from pathlib import Path
    root=Path(__file__).resolve().parents[2]/'Synthetic Scholarship Dataset'/'grantlens-dataset'/'data'/'sample'/'main'
    files={p.stem:(p.name,p.read_bytes(),'text/csv') for p in [*(root/f'{n}.csv' for n in ['beneficiaries','applications','transactions']),*sorted((root/'reference').glob('*.csv'))]}
    uploaded=client.post('/api/v1/audits/upload',files=files)
    assert uploaded.status_code==201,uploaded.text
    aid=uploaded.json()['audit_id']; params={'audit_id':aid}
    client.post(f'/api/v1/audits/{aid}/run')
    ui=client.get('/api/v1/ui/results',params=params).json()
    summary=client.get('/api/v1/ui/summary',params=params).json()
    raw=client.get(f'/api/v1/audits/{aid}/summary').json()
    assert len(ui['beneficiaries'])==summary['beneficiaries']==1000
    assert len(ui['clusters'])==summary['clusters']==raw['suspicious_cluster_count']
    assert sum(t['amount'] for t in ui['transactions'] if t['beneficiaryId'])==raw['total_disbursed']
    for c in ui['clusters']+ui['reviewCases']:
        assert c['score']==min(100,sum(e['contribution'] for e in c['evidence']))
    scheme=client.get('/api/v1/ui/summary',params={**params,'scheme':'SCH-01'}).json()
    assert scheme['payments']==sum(t.get('scheme')=='SCH-01' for t in ui['transactions'])
    case=ui['reviewCases'][0]['id']
    assert client.get(f'/api/v1/clusters/{case}/graph',params=params).status_code==200
    other=client.post('/api/v1/demo/seed',json={'count':300}).json()['audit_id']
    client.post(f'/api/v1/audits/{other}/run')
    assert client.get('/api/v1/ui/summary',params=params).json()['beneficiaries']==1000
    assert client.get('/api/v1/ui/summary',params={'audit_id':other}).json()['beneficiaries']==300
    assert client.get('/api/v1/ui/results',params={'audit_id':'missing'}).status_code==404
    assert len(client.get('/api/v1/audits').json())==2
