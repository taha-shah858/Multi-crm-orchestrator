/** Send JSON whitespace immediately while a bounded operation runs. Whitespace
 * keeps intermediaries active and remains valid for Response.json() clients.
 * Once headers are sent, failures are represented by success:false in the body.
 */
export function streamJsonResponse(operation: () => Promise<Response>) {
  const encoder = new TextEncoder();
  let closed = false;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode("\n"));
      heartbeat = setInterval(() => { if (!closed) controller.enqueue(encoder.encode("\n")); }, 5000);
      // Return the generation promise as part of stream initialization instead
      // of detaching it from the request lifecycle in serverless runtimes.
        try {
          const response = await operation();
          const body = await response.text();
          if (!closed) controller.enqueue(encoder.encode(body));
        } catch {
          if (!closed) controller.enqueue(encoder.encode(JSON.stringify({ success: false, error: { message: "The analysis request could not finish. Your text is retained; check saved analyses before retrying." } })));
        } finally {
          clearInterval(heartbeat);
          if (!closed) { closed = true; controller.close(); }
        }
    },
    cancel() { closed = true; clearInterval(heartbeat); },
  });
  return new Response(stream, { headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, no-transform",
    "X-Accel-Buffering": "no",
  } });
}
