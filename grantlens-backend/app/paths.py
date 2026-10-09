"""Source-relative shared workspace assets; persisted audit paths are unchanged."""
from pathlib import Path

WORKSPACE_ROOT = Path(__file__).resolve().parents[2]
