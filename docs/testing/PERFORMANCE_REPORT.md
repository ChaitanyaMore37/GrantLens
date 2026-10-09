# V2 performance measurements

Unchanged supplied 50,000-beneficiary stress dataset, local Python 3.13/macOS, single worker. Run `.venv/bin/python -m scripts.benchmark_v2` from the backend. Temporary database paths are recorded in v2-results/performance.json; no supplied data is generated or modified.

- Detector pipeline: 9.3453 seconds.
- Analysis plus SQLite persistence through TestClient: 19.01 seconds.
- Peak entire-process RSS: 1.87 GiB (macOS ru_maxrss bytes).
- SQLite size: 303.2 MiB.
- Separate offline detector evaluation: 9.2743 seconds, 5391.21 beneficiaries/second, peak RSS 692.2 MiB.
- Stress evaluation: precision 100.0000%, recall 99.6677%, FP 0, FN 18. Same generator family; not real-world validation.

Ten successive pages per endpoint, 25 rows/page, local TestClient, warm process. These are API measurements, not browser rendering times or concurrency/load tests.

| Endpoint | Median ms | Maximum ms | Largest page bytes |
|---|---:|---:|---:|
| review-queue | 122.72 | 130.93 | 38,979 |
| clusters | 10.67 | 12.81 | 131,944 |
| anomalies | 1.29 | 1.74 | 43,471 |

SQL queries apply audit isolation, filtering, stable ordering, offset and limit before materializing rows. An audit/kind/risk/ID expression index supports the registry. Compound JSON filters can still scan audit rows. Cluster evidence can make a 25-row page considerably larger than a beneficiary page.

The pipeline still builds in-memory graphs and Record objects; persistence substantially increases peak memory. Legacy overview/detail/report projections retain full snapshots. No claim is made that all 50,000-record screens are low-memory or multi-user safe. Bounded graph rendering remains capped at 500 nodes. Further work should replace remaining snapshots with focused aggregates/details and stream persistence before increasing dataset limits.
