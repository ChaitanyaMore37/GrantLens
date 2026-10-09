"""Create a portable source/demo archive without local databases or environments."""
from hashlib import sha256
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED


def package():
    root = Path(__file__).resolve().parents[1]
    output = root / 'deliverables'
    output.mkdir(exist_ok=True)
    archive = output / 'GrantLens-Backend-Astra.zip'
    files = []
    for folder in ['app', 'scripts', 'tests', 'benchmark-results', 'data/synthetic']:
        files.extend(p for p in (root / folder).rglob('*')
                     if p.is_file() and '__pycache__' not in p.parts and p.suffix != '.pyc')
    files.extend(root / name for name in [
        'README.md', 'API_CONTRACT.md', 'FRONTEND_HANDOFF_ASTRA.md', 'openapi.json',
        'requirements.txt', 'requirements-tested.txt', '.env.example', '.gitignore',
    ])
    with ZipFile(archive, 'w', compression=ZIP_DEFLATED, compresslevel=9) as zipped:
        for file in sorted(files):
            zipped.write(file, 'grantlens-backend/' + file.relative_to(root).as_posix())
    with ZipFile(archive) as zipped:
        assert zipped.testzip() is None, 'Archive integrity check failed'
        assert len(zipped.namelist()) == len(files)
        assert not any('/.venv/' in n or n.endswith('.db') for n in zipped.namelist())
    digest = sha256(archive.read_bytes()).hexdigest()
    archive.with_suffix('.zip.sha256').write_text(f'{digest}  {archive.name}\n', encoding='utf-8')
    print(f'{archive}\nFiles: {len(files)}\nBytes: {archive.stat().st_size}\nSHA256: {digest}')


if __name__ == '__main__':
    package()
