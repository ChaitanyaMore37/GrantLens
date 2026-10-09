import { config } from "../../config";
export class ApiError extends Error {
  constructor(
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}
export async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(config.baseUrl + path, {
    ...options,
    headers:
      options?.body instanceof FormData
        ? undefined
        : { "Content-Type": "application/json", ...options?.headers },
  }).catch(() => {
    throw new Error(
      `Cannot reach GrantLens API at ${config.baseUrl}. Start the backend and retry.`,
    );
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const details = body?.error?.details;
    const errors = details?.errors || [];
    const rows =
      details?.rejected_rows
        ?.slice(0, 3)
        .map(
          (r: { table: string; row?: number; errors: string[] }) =>
            `${r.table}${r.row ? ` row ${r.row}` : ""}: ${r.errors.join(", ")}`,
        ) || [];
    throw new ApiError(
      `API request failed (${response.status}): ${body?.error?.message || "Check the backend connection and selected audit."} ${[...errors, ...rows].join("; ")}`,
      details,
    );
  }
  const data = await response.json();
  if (data == null) throw new Error("The API returned an empty response.");
  return data as T;
}
