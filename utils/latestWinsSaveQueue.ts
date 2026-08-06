/**
 * Serializes async saves so overlapping PATCHes cannot finish out of order.
 * Always runs the latest enqueued body after the current request settles.
 * Every enqueue awaits the shared chain, so flushAutosave waits for the final write.
 */
export function createLatestWinsSaveQueue<T>() {
  let chain: Promise<void> = Promise.resolve()
  let latest: { body: T; run: (body: T) => Promise<void> } | null = null

  function enqueue(body: T, run: (body: T) => Promise<void>): Promise<void> {
    latest = { body, run }
    chain = chain.then(async () => {
      while (latest) {
        const job = latest
        latest = null
        try {
          await job.run(job.body)
        } catch {
          // Callers should handle errors inside run; keep the chain healthy.
        }
      }
    })
    return chain
  }

  return { enqueue }
}
