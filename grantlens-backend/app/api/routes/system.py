"""System HTTP endpoints; existing API contract preserved."""
import json
from fastapi import HTTPException
from sqlalchemy import select
from app import db
from app.core import CONFIG
from app.schemas import Detail, HealthResponse, EvaluationResponse
from fastapi import APIRouter
from app.paths import WORKSPACE_ROOT

PREFIX='/api/v1'
router=APIRouter()

@router.get(PREFIX+'/health',response_model=HealthResponse)
def health():
    with db.Session() as s:
        s.execute(select(1))
    return {'status':'ok','version':'2.0.0'}


@router.get(PREFIX+'/config',response_model=Detail)
def config():
    return CONFIG.public()


@router.get(PREFIX+'/dataset/sample/{filename}')
def sample_file(filename:str):
    from fastapi.responses import FileResponse
    if filename not in ['beneficiaries.csv','applications.csv','transactions.csv']:
        raise HTTPException(404,'Unknown sample file')
    path=WORKSPACE_ROOT/'Synthetic Scholarship Dataset'/'grantlens-dataset'/'data'/'sample'/'main'/filename
    if not path.exists(): raise HTTPException(404,'Supplied sample dataset not found')
    return FileResponse(path,media_type='text/csv',filename=filename)


@router.get(PREFIX+'/evaluations',response_model=EvaluationResponse)
def evaluations():
    root=WORKSPACE_ROOT/'v2-results'
    names=['baseline-main.json','revised-main.json','baseline-heldout.json','revised-heldout.json']
    runs=[]
    for name in names:
        path=root/name
        if path.exists():
            data=json.loads(path.read_text())
            runs.append({k:v for k,v in data.items() if k not in ['false_positive_examples','dataset']} | {'dataset':name,'configuration':data['summary'].get('configuration',{})})
    return {'environment':'Offline synthetic-data evaluation; not operational labels or real-world validation','runs':runs}
