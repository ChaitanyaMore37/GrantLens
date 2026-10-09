#!/usr/bin/env python3
"""Create a deterministic ZIP and verify its contents and CRCs."""
import hashlib
import json
from pathlib import Path
import zipfile

def main():
    root=Path(__file__).resolve().parents[1]
    target=root.parent/'grantlens-dataset.zip'
    files=sorted(p for p in root.rglob('*') if p.is_file() and not any(s in ('__pycache__','.git','.venv') for s in p.parts) and p.suffix not in ('.pyc','.zip'))
    with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
        for path in files:
            name=(Path(root.name)/path.relative_to(root)).as_posix()
            info=zipfile.ZipInfo(name,date_time=(2026,10,9,0,0,0))
            info.compress_type=zipfile.ZIP_DEFLATED
            info.external_attr=0o644<<16
            archive.writestr(info,path.read_bytes())
    with zipfile.ZipFile(target) as archive:
        assert archive.testzip() is None, 'ZIP CRC validation failed'
        assert len(archive.namelist())==len(files)
        for path in files:
            name=(Path(root.name)/path.relative_to(root)).as_posix()
            assert archive.read(name)==path.read_bytes(),f'Archive bytes differ: {name}'
    digest=hashlib.sha256(target.read_bytes()).hexdigest()
    target.with_suffix('.zip.sha256').write_text(f'{digest}  {target.name}\n')
    print(json.dumps(dict(archive=str(target),files=len(files),bytes=target.stat().st_size,sha256=digest,crc_and_file_bytes='PASS'),indent=2))

if __name__=='__main__': main()
