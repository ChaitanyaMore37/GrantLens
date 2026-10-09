# GrantLens V2 detection evaluation

All measurements are offline and synthetic. No ground-truth files enter the production detector. Supplied data and labels remain unchanged.

| Run | Records | Precision | Recall | F1 | FP | FN | Pipeline seconds |
|---|---:|---:|---:|---:|---:|---:|---:|
| baseline-main | 10000 | 34.4293% | 99.3613% | 0.5114 | 2074 | 7 | 1.0650 |
| revised-main | 10000 | 100.0000% | 99.3613% | 0.9968 | 0 | 7 | 0.8434 |
| baseline-heldout | 1000 | 37.0482% | 99.1935% | 0.5395 | 209 | 1 | 0.0787 |
| revised-heldout | 1000 | 100.0000% | 99.1935% | 0.9960 | 0 | 1 | 0.0739 |

## Method and reproducibility

The original main set was already inspected during V1, so it is a regression set, not a blind holdout. Temporary independent development seed 73 and initial validation seed 101 (1,000 records each) were generated under /tmp using the unchanged dataset generator. An initial conservative rule missed 24 records, including collector/cycle rings. This was rejected. Final rules were frozen after development inspection, then evaluated once on previously unseen seed 202. These seeds share a generator and scenario design; independence of seed does not imply distribution independence. No thresholds were subsequently tuned against seed 202 or the supplied stress dataset.

Commands (from backend): `.venv/bin/python -m scripts.evaluate_v2 --data DATASET_ROOT --output OUTPUT.json`; add `--baseline` for the preserved `scripts/baseline_risk_v1.py`. DATASET_ROOT contains main/ and ground_truth/. Fixture generation: `python3 scripts/generate_dataset.py --beneficiaries 1000 --seed 202 --output /tmp/grantlens-v2-heldout` from the dataset project. Use seeds 73/101 to reproduce development fixtures. JSON artifacts retain configuration, scenario rates, identity metrics, runtime, throughput and process peak RSS.

## False-positive diagnosis

Fresh V1 main run: 2,074 false positives. Collector evidence occurred in 2,009; circular transfer evidence in 90 (25 overlap). The baseline JSON retains 12 source-referenced examples. A common receiver or chronological cycle alone was too permissive. No changes were made to labels or global risk thresholds.

V2 collector rule requires at least four funded recipient source accounts each moving at least 20% of cumulative prior disbursements, coordinated within 14 days. It does not assume their latest disbursements occurred together. Account attribution remains uncertain when multiple beneficiaries share an account. V2 suspicious cycles require chronological directed legs (existing bounded graph detector), duration <=1 hour, amount continuity >=80%, and >=20% of at least one funded participant's prior receipts or independent corroboration. Other detected cycles remain context with zero contribution. The maximum receipt fraction is recorded; this is not a traced-funds guarantee.

Guardian/family authorizations must cover all shared-account owners and predate registration to suppress concentration alone. Independent identity, eligibility or batch evidence remains active. Direct Strong identity matches support tentative cross-alias award conflicts; aliases remain separate. Repeated applications and aggregate overpayment use explicit award rules; ordinary installments are not automatically penalized. Enrollment, income band and amount checks use actual reference fields. No termination-date or external eligibility verification is invented.

Community maximum score remains compatible; mean member score, flagged fraction and contributing indicator-type count add context. The type count is descriptive, not proof of statistical independence. Overlapping batch/concentration and direct/alias scheme evidence are suppressed.

## Tradeoffs and limitations

Main V2: 7 suspicious records remain missed. Identity linkage: 171 true matches, 17 misses, no false matches. Held-out seed 202: 123/124 suspicious records found; identity 24/26 links found. Ring recall is 100% on both, defined as at least half of labeled ring members flagged, NOT exact community recovery.

The older backend-generated fixture loses four low-proportion collector records: recall 92/96 (95.83%), collector scenario recall 60%, ring recall 100%. Tests explicitly preserve this known tradeoff rather than lowering the threshold to fit it. Zero false positives on these generator controls is not a real-world precision claim. Benign large coordinated payments may still trigger; slow, dispersed or low-value diversion may be missed. Account roles are not independently verified. Rules need external datasets and domain review before use beyond this local prototype.
