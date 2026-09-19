export class ApiFailure extends Error {
  constructor(message: string, public code: string, public status: number) { super(message); }
}

export async function postJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal, cache: "no-store" }).catch((error) => {
    if (signal?.aborted) throw error;
    throw new ApiFailure("Could not reach the service. Check your connection and try again.", "NETWORK_ERROR", 0);
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new ApiFailure(result?.error?.message ?? "The request could not be completed. Please try again.", result?.error?.code ?? "REQUEST_FAILED", response.status);
  return result as T;
}