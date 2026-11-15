import "server-only";

export async function withGeminiCapacityRetry<T>(request: (signal: AbortSignal) => Promise<T>): Promise<T> {
  // One shared deadline: a retry must not double the wait or outlive hosting.
  const deadline = Date.now() + 15000;
  const controller = new AbortController();
  const signal = controller.signal;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error("Gemini request timed out.");
      error.name = "TimeoutError";
      reject(error);
      controller.abort();
    }, 15000);
  });
  const run = async () => {
    try {
      return await request(signal);
    } catch (error) {
      if ((error as { status?: number } | null)?.status !== 503 || signal.aborted || deadline - Date.now() < 5000) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
      signal.throwIfAborted();
      return request(signal);
    }
  };
  try { return await Promise.race([run(), timeout]); }
  finally { clearTimeout(timer); }

}

