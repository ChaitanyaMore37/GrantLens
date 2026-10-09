# GrantLens synthetic scholarship dataset

A generated relational dataset for scholarship identity matching, financial graph analysis and offline fraud-scenario evaluation. All people, institutions, banks, accounts, applications and transfers are fictional. District names provide geographic context. No real student data or official eligibility rules were used. Names can coincide with real names by chance.

## Start here

The ready-to-load main fixture contains exactly 10,000 beneficiaries. Read `DATASET_CONTRACT.md` before backend integration and `dataset_summary.md` for the generated statistics and CL-017 members.

```text
grantlens-dataset/
  data/
    main/                      # detection CSVs: beneficiaries, applications, transactions
      reference/               # institutions, schemes, accounts, guardian authorizations
    ground_truth/              # offline labels, pairs, rings, memberships and controls
    generation_metadata.json
    detection_manifest.json    # ordinary input allowlist
    sample/                    # independent 1,000-record fixture, same internal layout
    stress/                    # independent 50,000-record fixture, same internal layout
  scripts/                     # generator, validator, loader and release/documentation tools
  config/generation_config.json
  tests/test_dataset.py
  reports/                     # main/sample/stress validation and executed test evidence
  DATA_DICTIONARY.md
  DATASET_CONTRACT.md
  EVALUATION.md
  dataset_summary.md
  requirements.txt
```

The sample and stress fixtures are complete independent generations, not slices of the main dataset. Their IDs may overlap main IDs. Never concatenate these datasets or use them as disjoint train/test splits. The extra nested stress directory is included to provide actual scale-test data and evidence, rather than an unexecuted scalability claim.

## Reproduce

Python 3.10+ is sufficient for generation, validation and tests; no network or external package is needed. Commands below run from the project directory.

```bash
python3 scripts/generate_dataset.py --config config/generation_config.json --output data
python3 scripts/validate_dataset.py --data data --report reports/validation_report.json
python3 -m unittest discover -s tests -v
python3 scripts/build_documentation.py
```

Custom sizes and seeds:

```bash
python3 scripts/generate_dataset.py --beneficiaries 1000 --seed 42 --output data/sample
python3 scripts/validate_dataset.py --data data/sample --report reports/sample_validation_report.json
python3 scripts/generate_dataset.py --beneficiaries 50000 --seed 42 --output data/stress
python3 scripts/validate_dataset.py --data data/stress --report reports/stress_validation_report.json
```

`--disbursements-per-beneficiary` accepts 1.25 to 1.5 (default 1.35). CLI values override the JSON config. The generator overwrites its known output files; choose a new output directory to retain an earlier fixture. Counts below 1,000 are rejected because the complete planted/control suite requires enough records. 1,000, 10,000 and 50,000 are tested supported sizes.

Run `python3 scripts/run_release_checks.py` to regenerate and validate all three shipped fixture sizes and save test logs. Then run `python3 scripts/build_documentation.py` to refresh counts and actual saved examples. A fixed seed/configuration and unchanged generator produce byte-identical CSVs and generation metadata; no wall-clock time is embedded in them. Runtime timings in release reports are naturally variable. Reproducibility was checked within the recorded Python runtime; cross-version byte identity is not promised.

## Backend input and Pandas

Only ordinary files listed in each root's `detection_manifest.json` may enter detection. Do not glob the entire `data/` tree. Ground truth, evaluation metadata, summary/report contents, and the generator's planted-case definitions must not become features. The full archive contains labels because it is an evaluation release, so file separation is not an access-control boundary.

Pandas is optional. In your own Python environment:

```bash
python3 -m pip install -r requirements.txt
python3 scripts/load_dataset.py --data data
python3 scripts/load_dataset.py --data data --with-evaluation-labels
```

The second command loads only the three ordinary primary tables. The last also demonstrates loading `ground_truth.csv` separately for offline evaluation. Monetary amounts serialize as numeric INR; the example converts this whole-rupee fixture to exact integer rupees. A production loader for paise should use `Decimal` or integer paise.

## How the data is built

Names, regional institutions and residences are constructed together. Institutional enrollment remains in the student's district. Weighted district, age, scheme and income choices replace uniform sampling. Registration year constrains academic year, application precedes disbursement, and each approved award determines one or two payments. Tuition award ranges differ from materials and maintenance grants. All approved applications are fully paid by the snapshot.

Names and addresses use constructed combinations, not a personal-information source. Phone strings use `+91-000-XXXXXXX`, deliberately non-dialable while retaining a consistent phone-like shape. IFSC-shaped strings start `SYNB0`; PINs use synthetic six-digit values inspired by district prefixes. They are graph tokens, not valid banking/postal/contact instructions. All customer accounts, including collectors, use the same shuffled ACC-* namespace and neutral account roles.

The seven injected scenario values are:

- IDENTITY_CLONING: name variants share an underlying persona while retaining linkage evidence; many aliases use distinct accounts.
- SHARED_PAYOUT_ACCOUNT: unrelated identities concentrate payments in one or two accounts.
- INCOMPATIBLE_SCHEME_CLAIMS: connected claimants receive both exclusive tuition schemes in the same person/year.
- GHOST_IDENTITY: coordinated fabricated personas combine payout/contact/timing links and some approved NOT_FOUND enrollment claims.
- COMMON_COLLECTION_ACCOUNT: funded recipients forward 35% of their aggregate scholarship receipts to one downstream account.
- CIRCULAR_TRANSFERS: actual chronological transfers return money through a directed cycle.
- BATCH_FABRICATION: related names, sequential synthetic contacts, close registration timestamps, shared locations/institutions and common payouts.

CL-017 combines five of these scenarios across 16 beneficiary records and eight personas. It has exactly two payout accounts, four phone tokens, three residences, INR 820000 in associated DBT payments, a collector and a funded cycle. Its primary scenario is IDENTITY_CLONING. See `ground_truth/scenario_memberships.csv` for overlapping labels and `ring_evidence.json` for exact observable edges. No risk score or predicted community label is provided.

Legitimate controls include hostel residents, family contacts, guardian accounts with authorization, identical names with distinct DOBs, common surnames, compatible schemes, corrected applications, campus registration bursts, benign expense cycles and service collection accounts. The latter collect smaller ordinary payments; some signals are intentionally strong for a hackathon demonstration. These distributions are synthetic engineering assumptions, not population prevalence estimates.

## Graph views

Construct the full heterogeneous graph with typed nodes and edges:

| Source | Relationship | Target | Ordinary evidence |
|---|---|---|---|
| BENEFICIARY | USES_ACCOUNT | BANK_ACCOUNT | beneficiaries.bank_account_id |
| BENEFICIARY | HAS_PHONE | PHONE | beneficiaries.phone |
| BENEFICIARY | RESIDES_AT | ADDRESS | beneficiaries.address |
| BENEFICIARY | ENROLLED_AT | INSTITUTION | beneficiaries.institution_id |
| BENEFICIARY | APPLIED_FOR | SCHEME | applications.beneficiary_id + scheme_id |
| BANK_ACCOUNT | TRANSFERRED_TO | BANK_ACCOUNT | ACCOUNT_TRANSFER ledger rows |

Namespace nodes by type to avoid identifier collisions. Preserve application ID, academic year and status on application edges. Preserve amount and timestamp on directed transfer edges. DBT payments are separate source edges; their application IDs resolve exactly which beneficiary received an award even when accounts are shared.

A full graph containing the treasury and six broadly used schemes will naturally connect most or all beneficiaries. For ring discovery, use an investigative projection of shared accounts/contacts/addresses and customer transfers, keeping institution and scheme nodes as context rather than unweighted bridges. The validator reports connectivity for that view. Do not treat one common institution, popular service account, or scheme as sufficient evidence to merge an entire population into a fraud case. Degree normalization or time-limited weighting can be chosen by the independent backend team; no clustering or scoring algorithm is implemented here.

## Validation and scope

The independent validator checks saved CSV schemas, identifiers, reference integrity, chronology, financial conservation from zero opening balances, approved award reconciliation, rule conflicts and labeled enrollment exceptions. It verifies every scenario group, collector edges, chronological staged cycles, all positive identity pairs, and legitimate controls. It also checks checksums and produces distribution reports. It does not silently permit any unlabeled eligibility or cash-flow exception.

Cycle counting uses strongly connected components and exact simple-cycle enumeration inside the small generated components. Arbitrary externally edited components over 20 nodes fail explicitly rather than risking unbounded enumeration. This validation utility is not a fraud-detection implementation.

Automated tests exercise 1,000-record generation, multiple seeds, byte reproducibility, a known graph, configuration boundaries, and mutations for broken IDs, labels, dates, missing transfers, unfunded flows and payment reconciliation. Release checks additionally generate/validate the 10,000 and 50,000 fixtures. Timings are measured on the execution host, not performance guarantees.

This is a paid-recipient demonstration cohort. Real identity spelling, migration, fee structures, transaction noise and adjudication are more complex. No fraud-detection model, ML model, API or frontend is included. Use `EVALUATION.md` to assess future predictions; this release makes no model-accuracy claim.
