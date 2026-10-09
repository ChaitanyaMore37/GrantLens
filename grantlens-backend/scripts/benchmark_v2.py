"""Exercise existing data in temporary SQLite; no regeneration."""
import os,tempfile,time,json,resource,statistics
from pathlib import Path
root=Path(tempfile.mkdtemp(prefix='grantlens-v2-benchmark-'))
os.environ['GRANTLENS_DATA']=str(root)
os.environ['GRANTLENS_DB']='sqlite:///'+str(root/'benchmark.db')
from fastapi.testclient import TestClient
from app.main import app
from app import db
source=Path(__file__).resolve().parents[2]/'Synthetic Scholarship Dataset/grantlens-dataset/data/stress/main'
with TestClient(app) as c:
    aid=db.create_audit(source)
    start=time.perf_counter(); response=c.post(f'/api/v1/audits/{aid}/run'); assert response.status_code==202,response.text
    state=c.get(f'/api/v1/audits/{aid}/status').json();assert state['status']=='Completed',state
    wall=time.perf_counter()-start
    measurements={}
    for endpoint in ['review-queue','clusters','anomalies']:
        times=[];sizes=[]
        for page in range(10):
            start=time.perf_counter();response=c.get('/api/v1/'+endpoint,params={'audit_id':aid,'offset':page*25,'limit':25});times.append(time.perf_counter()-start)
            assert response.status_code==200,response.text
            assert len(response.json()['items'])<=25
            sizes.append(len(response.content))
        measurements[endpoint]={'median_ms':statistics.median(times)*1000,'max_ms':max(times)*1000,'max_response_bytes':max(sizes),'total':response.json()['total']}
    out={'dataset':'supplied stress, unchanged','beneficiaries':state['summary']['beneficiary_count'],'pipeline_seconds':state['summary']['processing_seconds'],'process_and_persist_seconds':wall,'query_measurements':measurements,'peak_rss_bytes_macos':resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,'sqlite_bytes':(root/'benchmark.db').stat().st_size,'temporary_database':str(root)}
    target=Path(__file__).resolve().parents[2]/'v2-results/performance.json';target.write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
