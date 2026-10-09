#!/usr/bin/env python3
"""Generate and validate all supported fixture sizes; save actual test evidence."""
import json
from pathlib import Path
import platform
import subprocess
import sys
from time import perf_counter

from generate_dataset import generate
from validate_dataset import validate, write_reports

def main():
    root=Path(__file__).resolve().parents[1]
    runs=[]
    for label,n,path in [('main',10000,'data'),('sample',1000,'data/sample'),('stress',50000,'data/stress')]:
        start=perf_counter(); meta=generate(n,42,root/path); generation_seconds=perf_counter()-start
        start=perf_counter(); report=validate(root/path); validation_seconds=perf_counter()-start
        stem='validation_report' if label=='main' else f'{label}_validation_report'
        write_reports(report,root/'reports'/f'{stem}.json',root/'reports'/f'{stem}.md')
        runs.append(dict(dataset=label,beneficiaries=n,seed=42,generation_seconds=round(generation_seconds,4),validation_seconds=round(validation_seconds,4),status=report['status'],dataset_path=path,csv_sha256=meta['files_sha256']))
        print(f'{label}: {n} beneficiaries; {report["status"]}; generate {generation_seconds:.3f}s, validate {validation_seconds:.3f}s',flush=True)
    result=subprocess.run([sys.executable,'-m','unittest','discover','-s','tests','-v'],cwd=root,capture_output=True,text=True)
    (root/'reports/test_results.txt').write_text(result.stdout+result.stderr)
    (root/'reports/release_checks.json').write_text(json.dumps(dict(python=platform.python_version(),platform=platform.platform(),runs=runs,unittest_command='python3 -m unittest discover -s tests -v',unittest_exit_code=result.returncode),indent=2)+'\n')
    print(result.stdout+result.stderr)
    raise SystemExit(result.returncode)

if __name__=='__main__': main()
