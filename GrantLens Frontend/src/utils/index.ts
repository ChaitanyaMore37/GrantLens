import Papa from "papaparse";
import { config } from "../config";
export const money = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
export const compactMoney = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(2)}L` : money(n);
export const statuses = {
  NEEDS_REVIEW: "Needs review",
  IN_INVESTIGATION: "In investigation",
  VERIFICATION_REQUESTED: "Verification requested",
  CLEARED: "Cleared",
};
export const riskLabel = (score: number) =>
  score >= 80
    ? "Critical"
    : score >= 60
      ? "High"
      : score >= 30
        ? "Medium"
        : "Low";
const mockSchemas: Record<string, string[]> = {
  "beneficiaries.csv": [
    "id",
    "name",
    "district",
    "institution",
    "scheme",
    "account",
  ],
  "applications.csv": ["id", "beneficiary_id", "scheme", "amount"],
  "transactions.csv": ["id", "source", "target", "amount", "date"],
};
export const schemas: Record<string, string[]> =
  config.mode === "mock"
    ? mockSchemas
    : {
        "beneficiaries.csv":
          "beneficiary_id full_name dob gender phone address district state pincode bank_account_id ifsc_code institution_id registration_date".split(
            " ",
          ),
        "applications.csv":
          "application_id beneficiary_id scheme_id academic_year institution_id enrollment_status income_band application_status approved_amount application_date".split(
            " ",
          ),
        "transactions.csv":
          "transaction_id timestamp sender_account receiver_account amount transaction_type application_id".split(
            " ",
          ),
      };
export function validateCsv(text: string, name: string) {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  const columns = parsed.meta.fields || [];
  const errors = parsed.errors.map(
    (e) => `Row ${typeof e.row === "number" ? e.row + 2 : "?"}: ${e.message}`,
  );
  const missing = (schemas[name] || []).filter((c) => !columns.includes(c));
  if (missing.length) errors.push(`Missing columns: ${missing.join(", ")}`);
  if (!parsed.data.length) errors.push("The file has no data records.");
  const seen = new Set<string>();
  parsed.data.forEach((row, i) => {
    for (const col of schemas[name] || [])
      if (
        !row[col]?.trim() &&
        !(name === "transactions.csv" && col === "application_id")
      )
        errors.push(`Row ${i + 2}: ${col} is required.`);
    if (row.id) {
      if (seen.has(row.id))
        errors.push(`Row ${i + 2}: duplicate id ${row.id}.`);
      seen.add(row.id);
    }
    if (
      row.amount &&
      (!Number.isFinite(Number(row.amount)) || Number(row.amount) < 0)
    )
      errors.push(`Row ${i + 2}: amount must be a non-negative number.`);
    if (row.date && Number.isNaN(Date.parse(row.date)))
      errors.push(`Row ${i + 2}: invalid date.`);
  });
  return { columns, rows: parsed.data.length, errors };
}
export function download(
  name: string,
  content: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
