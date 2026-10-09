"""Audit-scoped lookups, masking and bounded graph cache shared by routers."""
import networkx as nx
from fastapi import HTTPException
from sqlalchemy import select
from app import db
from app.services.graphs import node_id

CACHE={}

def audit(aid=None, completed=True):
    with db.Session() as s:
        if aid:
            item=s.get(db.Audit,aid)
        else:
            item=s.scalar(select(db.Audit).where(db.Audit.status=='Completed').order_by(db.Audit.created_at.desc()))
        if not item:
            raise HTTPException(404,'Audit not found; seed or upload a dataset first')
        if completed and item.status!='Completed':
            raise HTTPException(409,'Audit is not completed')
        return item


def records(aid,kind):
    with db.Session() as s:
        return [r.payload for r in s.scalars(select(db.Record).where(db.Record.audit_id==aid,db.Record.kind==kind).order_by(db.Record.id))]


def record(aid,kind,rid):
    with db.Session() as s:
        r=s.get(db.Record,(aid,kind,rid))
        if not r:
            raise HTTPException(404,f'{kind} not found')
        return r.payload


def public(item):
    if isinstance(item,list):
        return [public(x) for x in item]
    if not isinstance(item,dict):
        return item
    result={}
    for key,value in item.items():
        if key in ['original','name_normalized','address_normalized']:
            continue
        if key in ['bank_account_id','sender_account','receiver_account']:
            result[key]='••••'+value[-4:]
            result[key+'_node_id']=node_id('BANK_ACCOUNT',value)
        elif key=='phone':
            result[key]='••••'+value[-4:]
        elif key in ['accounts','cycle_path']:
            result[key]=[node_id('BANK_ACCOUNT',v) for v in value]
        else:
            result[key]=public(value)
    return result


def page(items,offset,limit):
    return {'items':public(items[offset:offset+limit]),'total':len(items),'offset':offset,'limit':limit}


def graph(aid):
    if aid not in CACHE:
        g=nx.node_link_graph(record(aid,'graph','entities'),edges='edges')
        CACHE.clear() # single audit cache, bounded for the local prototype
        CACHE[aid]=g
    return CACHE[aid]


def case_data(item):
    return {**item.payload,'case_id':item.id,'status':item.status,'notes':item.notes}
