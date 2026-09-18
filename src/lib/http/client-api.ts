export interface ApiPayload {
  success?: boolean;
  error?: { message?: string } | string;
}

/**
 * Client-side API boundary: inspect response status and content type before
 * JSON parsing so HTML 404/redirect/error documents cannot crash a workspace.
 */
export async function readApiJson<T extends ApiPayload>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    const detail = response.status === 404
      ? "The requested service endpoint was not found. Refresh the app and try again."
      : "The server returned a non-JSON response. Refresh the app and try again.";
    throw new Error(`${detail} (HTTP ${response.status || "unknown"})`);
  }

  const payload = await response.json() as T;
  if (!response.ok || !payload.success) {
    const message = typeof payload.error === "string" ? payload.error : payload.error?.message;
    throw new Error(message || `The request could not be completed. (HTTP ${response.status})`);
  }
  return payload;
}
