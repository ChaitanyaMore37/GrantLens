"""Read-only regression against the pre-refactor sample/main and API contracts.

Run from backend: PYTHONHASHSEED=0 .venv/bin/python -m scripts.verify_structure
The fixed hash seed controls existing set traversal order; it is not a scoring change.
"""
import hashlib
import json
import os
from pathlib import Path
from app.main import app
from app.services.pipeline import run


def execute():
    if os.getenv('PYTHONHASHSEED') != '0':
        raise SystemExit('Run with PYTHONHASHSEED=0 for the recorded comparison')
    root = Path(__file__).resolve().parents[2]
    evidence = root / 'refactor-results'
    expected = json.loads((evidence / 'controlled-before-pipeline.json').read_text())
    hashes = {}
    for name, relative in [('sample', 'sample/main'), ('main', 'main')]:
        result = run(root / 'Synthetic Scholarship Dataset/grantlens-dataset/data' / relative)
        summary = {k: v for k, v in result.summary.items() if k not in ['processing_seconds', 'records_per_second']}
        value = {'summary': summary, 'risks': result.risks, 'clusters': result.clusters,
                 'matches': result.matches, 'cycles': result.cycles}
        hashes[name] = hashlib.sha256(json.dumps(value, sort_keys=True, default=str).encode()).hexdigest()
    assert hashes == expected, 'Forensic result regression'
    assert app.openapi() == json.loads((evidence / 'controlled-before-openapi.json').read_text()), 'API contract regression'
    protected = json.loads((evidence / 'source-checksums.json').read_text())
    changed = [p for p, digest in protected.items() if hashlib.sha256((root / p).read_bytes()).hexdigest() != digest]
    assert not changed, f'Protected source changes: {changed}'
    report = {'pipeline_hashes': hashes, 'openapi_unchanged': True, 'protected_files_unchanged': len(protected)}
    (evidence / 'regression.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    execute()
