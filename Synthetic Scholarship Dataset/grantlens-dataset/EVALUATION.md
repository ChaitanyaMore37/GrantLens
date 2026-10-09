# Offline evaluation protocol

Use ordinary inputs to produce predictions first. Load labels only in a separate evaluator. Never expose ground_truth, ring metadata, generated summaries, case member lists or injected generator definitions to the detection feature pipeline.

## Identity linkage

Treat each predicted pair as an unordered pair of distinct beneficiary IDs and deduplicate it. A pair is a true match exactly when both records share actual_person_id in ground_truth.csv. All true pairs are supplied in ground_truth_pairs.csv. Its negative pairs combine small legitimate-control pairs and a random sample; absence from this file does not mean negative.

For full-dataset predictions, compute TP by joining both endpoints to the full person mapping. FP is the number of predicted pairs with different actual_person_id; FN is the total number of positive ground-truth pairs minus TP. Pair precision = TP/(TP+FP). Pair recall = TP/(TP+FN). If a denominator is zero, report undefined and the counts, not a manufactured perfect score.

If a model outputs identity clusters, its implied positive pairs are all within-cluster combinations. Large clusters can be evaluated using per-person contingency counts and combinatorial n*(n-1)/2 totals without materializing all possible pairs. Report cluster size extremes to catch runaway merging.

Report sampled-pair benchmark precision separately from full-prediction precision. Sampling changes the prevalence of negatives, so a score on the pair CSV cannot be presented as population precision. Candidate-generation recall and final-match recall should also be distinguished.

## Suspicious beneficiary / case detection

At a predeclared risk threshold, compare one binary prediction per beneficiary against is_injected_suspicious. Count TP, FP, FN and TN. Precision = TP/(TP+FP), recall = TP/(TP+FN), and false-positive rate = FP/(FP+TN). Report class support and optionally PR curves over thresholds; do not optimize a threshold on the final evaluation split.

Primary scenario labels partition suspicious records. Use scenario_memberships.csv for multi-label recall, because CL-017 belongs to five scenarios. Report per-scenario counts and missed members, and separately report false-positive rate on each legitimate control type in lookalike_cases.csv. Control cases can overlap, so do not sum their denominators as if disjoint.

At the planted-case level, predeclare a discovery criterion, for example at least half of a planted ring's members retrieved with at least 50% member precision. Report cases found / total planted cases and false alerted cases. For more stringent evaluation, use the one-to-one ring matching procedure below. Do not call a case discovered merely because one high-degree account was flagged.

## Ring discovery

Community IDs are arbitrary. CL-017 is a ground-truth case label, not a predicted Louvain label. Compare beneficiary-member sets after clustering; ignore internal community numbers.

For each predicted community P and true ring T compute overlap, member precision |P∩T|/|P|, member recall |P∩T|/|T|, and Jaccard |P∩T|/|P∪T|. Predeclare an IoU/Jaccard threshold (for example 0.5) and use maximum-weight one-to-one matching across candidate overlaps to prevent multiple communities from claiming the same ring. Report matched rings/true rings, matched communities/predicted communities, and split/merge cases. Report CL-017 separately without tuning rules to its saved member IDs.

Some shared-account or service hubs are legitimate and some rings share multiple kinds of evidence. Connected components are not automatically fraud communities. Evaluate the investigative graph view described in README separately from the full heterogeneous graph with ubiquitous context nodes.

## Transfer and cycle evaluation

ring_evidence.json lists the staged transfer IDs and ordered account sequences for each planted or benign cycle. Evaluate whether the engine finds the supporting edges with correct direction and time order, then evaluate whether it classifies the case appropriately. Aggregate graph cycles and time-respecting transaction sequences are different concepts. The main fixture has one additional aggregate cycle induced by CL-017 collection edges; that extra topology is not an additional planted case.

When attributing disbursements, join through application_id to beneficiary_id. Two shared payout accounts do not imply two students, and transfers from a pooled account do not identify which of its students funded the transfer.

## Splits and limitations

Use independent seeds and keep all aliases of one person and all members of a planted ring together within a split. Also keep connected legitimate control groups together where feasible; shared accounts and households can leak across random row splits. Define a temporal holdout deliberately, keeping cross-year identity linkage available or withheld according to the stated evaluation task.

Shipped sample/main/stress datasets are scale fixtures, not disjoint evaluation splits. Their IDs are local and can overlap. Do not concatenate them. The generator preserves scenario templates and demo structure across seeds, so unseen seeds are still synthetic in-distribution testing; stronger generalization claims require changed mechanisms and external permitted evaluation data.

No detector has been run in this project. Validation PASS means data integrity and scenario evidence passed the stated checks. It is not fraud-detection accuracy, precision or recall.
