# Dataset location and preservation

The canonical release remains at `Synthetic Scholarship Dataset/grantlens-dataset/` relative to the workspace root. Its own README, EVALUATION.md, configuration, manifests, validation reports and scripts are authoritative.

- Main operational CSVs: `data/main/`; references: `data/main/reference/`.
- Main offline labels: `data/ground_truth/`.
- Sample: `data/sample/main/` and `data/sample/ground_truth/`.
- Stress: `data/stress/main/` and `data/stress/ground_truth/`.

These paths were deliberately preserved because the generator, manifests, import scripts and persisted audit provenance depend on them. No dataset file or label was changed or regenerated. Refactor checksums include the release archive, scripts, configuration and data; evidence is in `refactor-results/integrity.json` at the workspace root. Tests generate only temporary fixtures.
