from test_api import client


def test_v2_workflow_and_isolation(client):
    c=client
    a=c.post('/api/v1/demo/initialize',json={'dataset':'sample'})
    assert a.status_code==200,a.text
    aid=a.json()['audit_id']; p={'audit_id':aid}
    assert c.post('/api/v1/demo/initialize',json={'dataset':'sample'}).json()['audit_id']==aid
    assert c.get('/api/v1/review-queue',params=p).status_code==409
    c.post(f'/api/v1/audits/{aid}/run')
    state=c.get(f'/api/v1/audits/{aid}/status').json()
    assert state['status']=='Completed'
    assert state['summary']['started_at']<state['summary']['completed_at']
    queue=c.get('/api/v1/review-queue',params={**p,'limit':3}).json()
    assert queue['total']==1000 and len(queue['items'])==3
    assert queue['items'][0]['risk_score']>=queue['items'][-1]['risk_score']
    first=queue['items'][0]; cid=first['case_id']
    transactions=c.get('/api/v1/beneficiaries/'+first['beneficiary_id']+'/transactions',params={**p,'limit':2}).json()
    assert transactions['total']>0 and len(transactions['items'])<=2
    assert transactions['items'][0]['receiver_account'].startswith('••••')
    assert 'original' not in first and first['bank_account_id'].startswith('••••')
    assert c.get('/api/v1/review-queue',params={**p,'q':first['beneficiary_id']}).json()['total']==1
    assert c.get('/api/v1/review-queue',params={**p,'sort':'invalid'}).status_code==422
    assert c.get('/api/v1/review-queue',params={**p,'scheme':first['schemes'][0]}).json()['total']>0
    update=c.patch('/api/v1/cases/'+cid,params=p,json={'assigned_reviewer':'Demo reviewer','priority':'Urgent','resolution':'Verify original ledger','status':'In Investigation','note':'Real API test note'})
    assert update.status_code==200,update.text
    assert update.json()['assigned_reviewer']=='Demo reviewer'
    assert c.get('/api/v1/review-queue',params={**p,'case_status':'In Investigation'}).json()['total']>0
    fs=c.get('/api/v1/anomalies',params={**p,'limit':200}).json()
    assert fs['total']>0
    cycle=next(f for f in fs['items'] if f['indicator']=='circular_transfer')
    assert len(cycle['transactions'])==3
    assert all(t['sender_account'].startswith('••••') for t in cycle['transactions'])
    assert c.get('/api/v1/anomalies/'+cycle['finding_id'],params=p).status_code==200
    report=c.post('/api/v1/reports',params=p)
    assert report.status_code==201,report.text
    rid=report.json()['report_id']
    csv=c.get('/api/v1/reports/'+rid+'/csv',params=p)
    assert csv.status_code==200 and csv.headers['content-type'].startswith('text/csv')
    assert aid in csv.text and cid in csv.text and 'risk_score' in csv.text
    assert report.json()['audit_id']==aid and report.json()['summary']['detector_version']=='2.0'
    assert c.get('/api/v1/reports/'+rid,params=p).json()==report.json()
    events=c.get('/api/v1/events',params=p).json()['items']
    assert {'audit_created','validation_completed','analysis_started','analysis_completed','case_updated','report_generated','reviewer_note_added'}<={e['event_type'] for e in events}
    other=c.post('/api/v1/demo/seed',json={'count':300}).json()['audit_id']
    c.post(f'/api/v1/audits/{other}/run')
    assert c.get('/api/v1/reports/'+rid,params={'audit_id':other}).status_code==404
    assert all(e['audit_id']==other for e in c.get('/api/v1/events',params={'audit_id':other}).json()['items'])
    assert c.get('/api/v1/history',params={'status':'Completed','limit':1}).json()['total']==2
    c.post(f'/api/v1/audits/{aid}/run')
    assert c.get('/api/v1/reports/'+rid,params=p).status_code==200
    assert c.get('/api/v1/cases/'+cid,params=p).json()['assigned_reviewer']=='Demo reviewer'
    assert len(c.get('/api/v1/evaluations').json()['runs'])==4
    schema=c.get('/openapi.json').json()
    for endpoint in ['/review-queue','/history','/events','/anomalies','/evaluations','/reports']:
        assert schema['paths']['/api/v1'+endpoint]['get']['responses']['200']['content']['application/json']['schema']


def test_explicit_mapping_preserves_source_and_rejects_unsafe_files(client,tmp_path):
    from app.services.synthetic import generate
    from app import db
    import json
    path=generate(tmp_path/'mapped',300)
    names=['beneficiaries','applications','transactions']
    files={n:(n+'.csv',(path/(n+'.csv')).read_bytes(),'text/csv') for n in names}
    original=files['beneficiaries'][1].replace(b'full_name',b'applicant_name',1)
    files['beneficiaries']=('beneficiaries.csv',original,'text/csv')
    response=client.post('/api/v1/audits/upload',files=files,data={'column_mapping':json.dumps({'tables':{'beneficiaries':{'full_name':'applicant_name'}}})})
    assert response.status_code==201,response.text
    aid=response.json()['audit_id']
    assert (db.DATA/'audits'/aid/'raw'/'beneficiaries.csv').read_bytes()==original
    client.post(f'/api/v1/audits/{aid}/run')
    person=client.get('/api/v1/review-queue',params={'audit_id':aid,'limit':1}).json()['items'][0]
    assert person['source_row']>=2 and person['source_file']=='beneficiaries.csv'
    files['beneficiaries']=('../escape.csv',original,'text/csv')
    assert client.post('/api/v1/audits/upload',files=files).status_code==422


def test_failed_job_recovery_and_restart_event(client,monkeypatch):
    from app import db
    from app.services import jobs
    aid=client.post('/api/v1/demo/seed',json={'count':300}).json()['audit_id']
    original=jobs.run
    def broken(*args,**kwargs): raise RuntimeError('Deliberate test failure')
    monkeypatch.setattr(jobs,'run',broken)
    client.post(f'/api/v1/audits/{aid}/run')
    failed=client.get(f'/api/v1/audits/{aid}/status').json()
    assert failed['status']=='Failed' and failed['summary']['completed_at']
    assert 'Deliberate test failure' not in failed['summary']['error']
    monkeypatch.setattr(jobs,'run',original)
    client.post(f'/api/v1/audits/{aid}/run')
    assert client.get(f'/api/v1/audits/{aid}/status').json()['status']=='Completed'
    with db.Session.begin() as s: s.get(db.Audit,aid).status='Running'
    db.initialize()
    assert client.get(f'/api/v1/audits/{aid}/status').json()['status']=='Failed'
    events=client.get('/api/v1/events',params={'audit_id':aid,'event_type':'analysis_failed'}).json()
    assert events['total']==2
    assert client.get('/api/v1/history',params={'sort':'invalid'}).status_code==422
