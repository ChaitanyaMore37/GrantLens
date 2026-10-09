"""Test supplied datasets through a running server without regenerating them."""
import json,time,csv
from pathlib import Path
import httpx
ROOT=Path(__file__).resolve().parents[2]
DATA=ROOT/'Synthetic Scholarship Dataset'/'grantlens-dataset'/'data'
OUT=ROOT/'integration-results'
def checked(r):
    r.raise_for_status()
    return r.json()
def execute():
    reports=[]
    with httpx.Client(base_url='http://127.0.0.1:8000/api/v1',timeout=120) as c:
        checked(c.get('/health'))
        for name,root in [('sample',DATA/'sample'/'main'),('main',DATA/'main')]:
            files={p.stem:(p.name,p.read_bytes(),'text/csv') for p in [*(root/f'{n}.csv' for n in ['beneficiaries','applications','transactions']),*sorted((root/'reference').glob('*.csv'))]}
            a=checked(c.post('/audits/upload',files=files)); aid=a['audit_id']; q={'audit_id':aid}
            checked(c.post(f'/audits/{aid}/run'))
            deadline=time.monotonic()+240
            while time.monotonic()<deadline:
                status=checked(c.get(f'/audits/{aid}/status'))
                if status['status']!='Running': break
                time.sleep(.3)
            assert status['status']=='Completed',status
            summary=checked(c.get(f'/audits/{aid}/summary'))
            ui=checked(c.get('/ui/results',params=q)); dashboard=checked(c.get('/ui/summary',params=q))
            with (root/'transactions.csv').open() as f:
                payments=[r for r in csv.DictReader(f) if r['transaction_type']=='DBT_DISBURSEMENT']
            assert summary['total_disbursed']==sum(float(t['amount']) for t in payments)
            assert dashboard['payments']==len(payments)
            assert len(ui['beneficiaries'])==summary['beneficiary_count']==(1000 if name=='sample' else 10000)
            assert sum(d['value'] for d in dashboard['distribution'])==summary['beneficiary_count']
            assert sum(m['high']+m['medium']+m['low'] for m in dashboard['monthly'])==len(payments)
            first=ui['clusters'][0]; cid=first['id']
            assert min(100,sum(e['contribution'] for e in first['evidence']))==first['score']
            g=checked(c.get(f'/clusters/{cid}/graph',params=q)); ids={n['data']['id'] for n in g['nodes']}
            assert g['nodes'] and g['edges'] and all(e['data']['source'] in ids and e['data']['target'] in ids for e in g['edges'])
            tx={t['id']:t for t in ui['transactions']}
            for edge in g['edges']:
                e=edge['data']
                if e['relationship']=='TRANSFER': assert (e['source'],e['target'])==(tx[e['id']]['source'],tx[e['id']]['target'])
            bid=first['beneficiaryIds'][0]; b=checked(c.get(f'/beneficiaries/{bid}',params=q))
            assert b['risk_score']==next(b['score'] for b in ui['beneficiaries'] if b['id']==bid)
            checked(c.get('/graph/neighbors',params={**q,'node_id':bid,'hops':2}))
            checked(c.get('/graph/path',params={**q,'source':bid,'target':b['bank_account_id_node_id']}))
            original=checked(c.get(f'/cases/{cid}',params=q))
            note=f'Integration verification: {name} dataset; evidence inspected.'
            changed=checked(c.patch(f'/cases/{cid}',params=q,json={'status':'In Investigation','note':note}))
            assert changed['status']=='In Investigation' and changed['notes'][-1]['text']==note
            report=checked(c.get(f'/cases/{cid}/report',params=q)); assert report['risk_score']==first['score']
            checked(c.patch(f'/cases/{cid}',params=q,json={'status':original['status']}))
            assert c.options('/cases',headers={'Origin':'http://localhost:5173','Access-Control-Request-Method':'GET'}).headers['access-control-allow-origin']=='http://localhost:5173'
            reports.append({'dataset':name,'audit_id':aid,'summary':summary,'graph_nodes':len(g['nodes']),'graph_edges':len(g['edges']),'case_id':cid,'checks':'upload, references, pipeline, totals, graph, evidence, path, status/note, report, CORS passed'})
            (OUT/f'{name}-results.json').write_text(json.dumps(reports[-1],indent=2))
            print(name,aid,summary['beneficiary_count'],summary['total_disbursed'],flush=True)
        for r,count in zip(reports,[1000,10000]):
            assert len(checked(c.get('/ui/results',params={'audit_id':r['audit_id']}))['beneficiaries'])==count
        reports.append({'audit_isolation':'PASS: sample remains 1000 after main completes'})
        (OUT/'api-workflow.json').write_text(json.dumps(reports,indent=2))
if __name__=='__main__': execute()
