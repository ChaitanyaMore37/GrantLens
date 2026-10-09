export const config = {
  mode: import.meta.env.VITE_DATA_SOURCE === "mock" ? "mock" : "api",
  baseUrl: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1",
};
