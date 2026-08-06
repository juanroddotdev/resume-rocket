import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createLatestWinsSaveQueue } from '../utils/latestWinsSaveQueue.ts'

describe('createLatestWinsSaveQueue', () => {
  it('runs the in-flight body then the latest queued body', async () => {
    const seen = []
    const queue = createLatestWinsSaveQueue()
    let releaseFirst
    const firstGate = new Promise((resolve) => {
      releaseFirst = resolve
    })
    let firstStarted
    const startedGate = new Promise((resolve) => {
      firstStarted = resolve
    })

    const p1 = queue.enqueue({ n: 1 }, async (body) => {
      seen.push(body.n)
      firstStarted()
      await firstGate
    })

    await startedGate

    const p2 = queue.enqueue({ n: 2 }, async (body) => {
      seen.push(body.n)
    })
    const p3 = queue.enqueue({ n: 3 }, async (body) => {
      seen.push(body.n)
    })

    releaseFirst()
    await Promise.all([p1, p2, p3])

    assert.deepEqual(seen, [1, 3])
  })

  it('collapses synchronous bursts to the latest body', async () => {
    const seen = []
    const queue = createLatestWinsSaveQueue()

    const p1 = queue.enqueue({ n: 1 }, async (body) => { seen.push(body.n) })
    const p2 = queue.enqueue({ n: 2 }, async (body) => { seen.push(body.n) })
    const p3 = queue.enqueue({ n: 3 }, async (body) => { seen.push(body.n) })
    await Promise.all([p1, p2, p3])

    assert.deepEqual(seen, [3])
  })
})
