const MIN_GAP_MS = 6000;

function wait(durationMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

export function createRequestQueue(minGapMs = MIN_GAP_MS) {
  let chain = Promise.resolve();
  let lastStartedAt = 0;

  return {
    enqueue(task) {
      const runTask = async () => {
        const now = Date.now();
        const elapsed = now - lastStartedAt;

        if (lastStartedAt && elapsed < minGapMs) {
          await wait(minGapMs - elapsed);
        }

        lastStartedAt = Date.now();
        return task();
      };

      const scheduled = chain.then(runTask);
      chain = scheduled.catch(() => undefined);
      return scheduled;
    }
  };
}

export const requestQueue = createRequestQueue();
