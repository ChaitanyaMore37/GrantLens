"""Graphs HTTP endpoints; existing API contract preserved."""
import networkx as nx
from fastapi import HTTPException, Query
from app.schemas import GraphResponse
from app.services.graphs import serialize, neighbors
from fastapi import APIRouter
from app.api.dependencies import audit, record, graph
from app.api.routes.investigations import case

PREFIX='/api/v1'
router=APIRouter()

@router.get(PREFIX+'/clusters/{cluster_id}/graph',response_model=GraphResponse)
def cluster_graph(cluster_id:str,audit_id:str|None=None,limit:int=Query(200,ge=1,le=500)):
    aid=audit(audit_id).id
    c=case(cluster_id,aid) if cluster_id.startswith('CASE-') else record(aid,'cluster',cluster_id)
    g=graph(aid)
    nodes=set(c['beneficiary_ids'])
    for bid in c['beneficiary_ids']:
        nodes.update(g.neighbors(bid))
    for n in list(nodes):
        if g.nodes[n]['type']=='BANK_ACCOUNT':
            nodes.update(other for other in g.neighbors(n) if g.nodes[other]['type']=='BANK_ACCOUNT')
    return serialize(g,nodes,{},limit)


@router.get(PREFIX+'/graph/neighbors',response_model=GraphResponse)
def graph_neighbors(node_id:str,audit_id:str|None=None,hops:int=Query(1,ge=1,le=3),limit:int=Query(100,ge=1,le=500)):
    g=graph(audit(audit_id).id)
    if node_id not in g: raise HTTPException(404,'Node not found')
    nodes,truncated=neighbors(g,node_id,hops,limit)
    output=serialize(g,nodes,{},limit); output['truncated']|=truncated
    return output


@router.get(PREFIX+'/graph/path',response_model=GraphResponse)
def graph_path(source:str,target:str,audit_id:str|None=None,max_hops:int=Query(6,ge=1,le=6),limit:int=Query(500,ge=2,le=500)):
    g=graph(audit(audit_id).id)
    if source not in g or target not in g: raise HTTPException(404,'Node not found')
    nodes,truncated=neighbors(g,source,max_hops,limit)
    try: path=nx.shortest_path(g.subgraph(nodes),source,target)
    except (nx.NetworkXNoPath,nx.NodeNotFound):
        raise HTTPException(404,'No path within bounded search; increase limit if appropriate')
    if len(path)-1>max_hops: raise HTTPException(404,'No path within hop limit')
    out=serialize(g,path,{},limit); out['truncated']=truncated
    return out
