import logging
from fastapi import HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from app.services.ingestion import ValidationError

async def http_error(request,exc):
    return JSONResponse(status_code=exc.status_code,content={'error':{'code':str(exc.status_code),'message':exc.detail}})


async def request_error(request,exc):
    return JSONResponse(status_code=422,content={'error':{'code':'validation_error','message':'Invalid request','details':[{'location':list(e['loc']),'message':e['msg']} for e in exc.errors()]}})


async def dataset_error(request,exc):
    # Raw originals remain local; do not leak sensitive values through validation responses.
    report={**exc.report,'rejected_rows':[{k:v for k,v in r.items() if k!='original'} for r in exc.report.get('rejected_rows',[])]}
    return JSONResponse(status_code=422,content={'error':{'code':'dataset_invalid','message':str(exc),'details':report}})


async def unexpected_error(request,exc):
    logging.exception('Unhandled API error')
    return JSONResponse(status_code=500,content={'error':{'code':'internal_error','message':'Unexpected server error; inspect local server logs.'}})


def register_errors(app):
    app.add_exception_handler(HTTPException, http_error)
    app.add_exception_handler(RequestValidationError, request_error)
    app.add_exception_handler(ValidationError, dataset_error)
    app.add_exception_handler(Exception, unexpected_error)
