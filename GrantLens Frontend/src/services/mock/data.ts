import type {
  AuditJob,
  Beneficiary,
  Cluster,
  FinancialTransaction,
  GraphResponse,
  InvestigationCase,
  ScholarshipApplication,
} from "../../types";
export const schemes = [
  "Post-Matric Merit Scholarship",
  "Higher Education Assistance",
];
const names = [
  "Aarav Deshmukh",
  "Ananya Patil",
  "Rohan Kulkarni",
  "Ishita Joshi",
  "Aditya Pawar",
  "Sai Deshmukh",
  "Priya Shinde",
  "Omkar Jadhav",
  "Sneha More",
  "Atharva Patil",
  "Meera Kale",
  "Vedant Joshi",
  "Aditi Chavan",
  "Soham Shinde",
  "Tanvi Kulkarni",
  "Rohit Deshmukh",
  "Neha Sawant",
  "Nikhil Bhosale",
  "Sakshi Naik",
  "Arjun Kadam",
  "Riya Jagtap",
  "Yash Mali",
  "Pooja Gaikwad",
  "Dhruv Patil",
  "Isha Mane",
  "Sahil More",
  "Gauri Shinde",
  "Aniket Kale",
  "Shruti Pawar",
  "Pranav Joshi",
  "Maya Patil",
  "Kunal Jadhav",
];
export const beneficiaries: Beneficiary[] = names.map((name, i) => ({
  id: `BEN-${String(i + 1).padStart(3, "0")}`,
  name,
  district:
    i < 16
      ? "Pune"
      : ["Nashik", "Nagpur", "Mumbai", "Satara"][Math.floor((i - 16) / 4)],
  institution:
    i < 16
      ? "Deccan Institute of Technology (Fictional)"
      : "Sahyadri Arts & Science College (Fictional)",
  scheme: schemes[i < 24 ? 0 : 1],
  account: `AC-${i < 16 ? (i % 3) + 1 : i + 1}`,
  phone: `+91 •••••• ${String(i >= 24 && i < 28 ? 2100 : 2100 + (i % 5))}`,
  address: `Address group ${i >= 28 ? 1 : (i % 2) + 1}, ${i < 16 ? "Pune" : ["Nashik", "Nagpur", "Mumbai", "Satara"][Math.floor((i - 16) / 4)]}`,
  score: i < 16 ? 95 : [89, 78, 64, 42][Math.floor((i - 16) / 4)],
  clusterId: `CL-${i < 16 ? "017" : String(18 + Math.floor((i - 16) / 4)).padStart(3, "0")}`,
  sourceId: `beneficiaries.csv:row:${i + 2}`,
}));
export const transactions: FinancialTransaction[] = beneficiaries.flatMap(
  (b, i) =>
    [0, 1, 2].map((m) => ({
      id: `TX-${String(i * 3 + m + 1).padStart(4, "0")}`,
      beneficiaryId: b.id,
      source: b.scheme === schemes[0] ? "SCHEME-01" : "SCHEME-02",
      target: b.account,
      amount: i < 16 ? 15000 : 12000,
      date: `2024-${String(8 + m).padStart(2, "0")}-15`,
      reference: `transactions.csv:row:${i * 3 + m + 2}`,
    })),
);
transactions.push(
  ...[
    { source: "AC-1", target: "COL-01" },
    { source: "COL-01", target: "AC-2" },
    { source: "AC-2", target: "AC-1" },
  ].map((t, i) => ({
    ...t,
    id: `TX-C${i + 1}`,
    amount: 18000,
    date: "2024-10-18",
    reference: `transactions.csv:row:${98 + i}`,
  })),
);
transactions.push({
  id: "TX-C4",
  source: "AC-21",
  target: "COL-02",
  amount: 12000,
  date: "2024-10-18",
  reference: "transactions.csv:row:101",
});
export const applications: ScholarshipApplication[] = beneficiaries.map(
  (b) => ({
    id: `APP-${b.id.slice(4)}`,
    beneficiaryId: b.id,
    scheme: b.scheme,
    academicYear: "2024–25",
    amount: transactions
      .filter((t) => t.beneficiaryId === b.id)
      .reduce((s, t) => s + t.amount, 0),
    status: "Disbursed",
  }),
);
export const clusters: Cluster[] = [
  "Shared payout network",
  "Identity overlap",
  "Collector account links",
  "Repeated contact details",
  "Institution address overlap",
].map((name, i) => {
  const members = beneficiaries.filter(
    (b) => b.clusterId === `CL-${String(17 + i).padStart(3, "0")}`,
  );
  const score = [95, 89, 78, 64, 42][i];
  return {
    id: `CL-${String(17 + i).padStart(3, "0")}`,
    name,
    beneficiaryIds: members.map((b) => b.id),
    district: members[0].district,
    scheme: members[0].scheme,
    score,
    accountIds: [...new Set(members.map((b) => b.account))],
    identityMatches: i === 0 ? 3 : i === 1 ? 1 : 0,
    transactionPatterns: i === 0 ? 2 : i === 2 ? 1 : 0,
    amount: transactions
      .filter((t) => members.some((b) => b.id === t.beneficiaryId))
      .reduce((s, t) => s + t.amount, 0),
    indicator: [
      "Shared payout accounts",
      "Strong identity similarity",
      "Common collector account",
      "Shared phone number",
      "Common address",
    ][i],
    batch: "AUD-2024-012",
    evidence:
      i === 0
        ? [
            {
              id: "EV-01",
              label: "Shared payout account",
              description:
                "16 synthetic beneficiary records use three payout accounts. Verify account ownership and disbursement authorization.",
              contribution: 30,
              records: ["BEN-001", "BEN-004", "AC-1"],
            },
            {
              id: "EV-02",
              label: "Strong identity similarity",
              description:
                "Three precomputed identity-match flags supplied by the demo dataset. Similarity alone does not establish duplication.",
              contribution: 25,
              records: ["BEN-001", "BEN-006", "BEN-016"],
            },
            {
              id: "EV-03",
              label: "Common collector account",
              description:
                "A downstream transfer connects AC-1 to the synthetic collector account COL-01.",
              contribution: 20,
              records: ["TX-C1", "COL-01"],
            },
            {
              id: "EV-04",
              label: "Scheme conflict",
              description:
                "Demo source flag requires independent eligibility verification against the application record.",
              contribution: 10,
              records: ["APP-001"],
            },
            {
              id: "EV-05",
              label: "Transaction cycle",
              description:
                "Three recorded transfers form AC-1 → COL-01 → AC-2 → AC-1.",
              contribution: 10,
              records: ["TX-C1", "TX-C2", "TX-C3"],
            },
          ]
        : [
            {
              id: `EV-${i + 10}`,
              label: [
                "",
                "Identity similarity",
                "Collector association",
                "Shared contact",
                "Shared address",
              ][i],
              description:
                "Synthetic review-priority indicator supplied for interface demonstration. Check source records before reaching a conclusion.",
              contribution: score,
              records: members.map((b) => b.id),
            },
          ],
  };
});
export const cases: InvestigationCase[] = clusters.map((c, i) => ({
  id: `INV-${String(104 + i)}`,
  clusterId: c.id,
  status: [
    "NEEDS_REVIEW",
    "IN_INVESTIGATION",
    "VERIFICATION_REQUESTED",
    "NEEDS_REVIEW",
    "CLEARED",
  ][i] as InvestigationCase["status"],
  auditor: i === 4 ? "Anika Rao" : "Arjun Mehta",
  updatedAt: "2024-12-20T10:30:00.000Z",
  notes: [],
}));
export const jobs: AuditJob[] = [
  {
    id: "AUD-2024-012",
    name: "Maharashtra scholarship audit · 2024",
    status: "COMPLETED",
    progress: 100,
    stage: "Complete",
    createdAt: "2024-12-20T09:00:00Z",
    files: [
      { name: "beneficiaries.csv", rows: 32 },
      { name: "applications.csv", rows: 32 },
      { name: "transactions.csv", rows: 100 },
    ],
  },
];
export function graphFor(clusterId: string): GraphResponse {
  const c = clusters.find((c) => c.id === clusterId);
  if (!c) return { nodes: [], edges: [] };
  const members = beneficiaries.filter((b) => c.beneficiaryIds.includes(b.id));
  const nodes: GraphResponse["nodes"] = members.map((b, i) => ({
    data: {
      id: b.id,
      label: b.name.split(" ")[0] + " · " + b.id.slice(4),
      type: "beneficiary",
      maskedInfo: `${b.name} · ${b.phone}`,
      sourceRecords: [b.sourceId],
    },
    position: {
      x: 310 + Math.cos((i * 2 * Math.PI) / members.length) * 245,
      y: 245 + Math.sin((i * 2 * Math.PI) / members.length) * 190,
    },
  }));
  const schemeId = c.scheme === schemes[0] ? "SCHEME-01" : "SCHEME-02";
  const edges: GraphResponse["edges"] = [];
  const add = (
    source: string,
    target: string,
    type: string,
    label: string,
    records: string[],
  ) =>
    edges.push({
      data: {
        id: `${source}-${target}-${type}`,
        source,
        target,
        type,
        label,
        confidence: type === "identity" ? 0.92 : undefined,
        records,
      },
    });
  c.accountIds.forEach((a, i) =>
    nodes.push({
      data: {
        id: a,
        label: `A/c ••${4100 + Number(a.slice(3))}`,
        type: "account",
        maskedInfo: `Synthetic payout account •••• ${4100 + Number(a.slice(3))}`,
        sourceRecords: [`account-reference:${a}`],
      },
      position: { x: 215 + i * 85, y: 215 },
    }),
  );
  for (const [id, type, label, x, y] of [
    ["PH-01", "phone", "Phone ••2100", 210, 355],
    ["ADDR-01", "address", "Address group 1", 420, 345],
    [
      "INST-01",
      "institution",
      clusterId === "CL-017" ? "Deccan Institute" : "Sahyadri College",
      320,
      65,
    ],
    [schemeId, "scheme", "Scholarship scheme", 320, 445],
  ] as const)
    nodes.push({
      data: {
        id,
        type,
        label,
        maskedInfo:
          (type === "institution"
            ? members[0].institution
            : type === "scheme"
              ? c.scheme
              : type === "address"
                ? members[0].address
                : label) + " (synthetic)",
        sourceRecords: [`reference:${id}`],
      },
      position: { x, y },
    });
  members.forEach((b, i) => {
    add(
      b.id,
      b.account,
      "payout",
      "Payout account",
      transactions.filter((t) => t.beneficiaryId === b.id).map((t) => t.id),
    );
    if (b.phone.endsWith("2100"))
      add(b.id, "PH-01", "phone", "Shared phone", [b.sourceId]);
    if (b.address.includes("group 1"))
      add(b.id, "ADDR-01", "address", "Shared address", [b.sourceId]);
    if (i % 5 === 0)
      add(b.id, "INST-01", "enrolled", "Enrolled at", [`APP-${b.id.slice(4)}`]);
  });
  add(schemeId, members[0].id, "application", "Application", [
    `APP-${members[0].id.slice(4)}`,
  ]);
  if (clusterId === "CL-017") {
    nodes.push({
      data: {
        id: "COL-01",
        label: "Collector ••8901",
        type: "collector",
        maskedInfo: "Synthetic downstream account •••• 8901",
        sourceRecords: ["TX-C1", "TX-C2"],
      },
      position: { x: 325, y: 310 },
    });
    add("BEN-001", "BEN-006", "identity", "Identity match", ["EV-02"]);
    add("BEN-001", "BEN-016", "identity", "Identity match", ["EV-02"]);
    add("BEN-006", "BEN-016", "identity", "Identity match", ["EV-02"]);
    transactions
      .filter((t) => ["TX-C1", "TX-C2", "TX-C3"].includes(t.id))
      .forEach((t) =>
        add(t.source, t.target, "transfer", "₹18,000 transfer", [t.id]),
      );
  }
  if (clusterId === "CL-018")
    add("BEN-017", "BEN-018", "identity", "Identity match", ["EV-11"]);
  if (clusterId === "CL-019") {
    nodes.push({
      data: {
        id: "COL-02",
        label: "Collector ••8902",
        type: "collector",
        maskedInfo: "Synthetic downstream account •••• 8902",
        sourceRecords: ["TX-C4"],
      },
      position: { x: 325, y: 310 },
    });
    add("AC-21", "COL-02", "transfer", "₹12,000 transfer", ["TX-C4"]);
  }
  return { nodes, edges };
}
