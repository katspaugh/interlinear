import assert from 'node:assert/strict'
import { test } from 'node:test'
import { z } from 'zod'
import { err, event, intent, intentEffectError, projection } from '@intenteffect/core'
import { createIntentEffect } from '@intenteffect/server'
import { createMemoryStore } from '../src/index.js'

/* A miniature app: an in-memory table mutated by handlers via the tx handle. */

interface Tables {
  tasks: Map<string, string>
}

const taskCreated = event('task.created', z.object({ id: z.string(), title: z.string() }))
const createTask = intent(
  'task.create',
  z.object({ id: z.string(), title: z.string().min(1) }),
  { emits: [taskCreated] },
)
const failTask = intent('task.fail', z.object({}), { emits: [] })

const taskList = projection({
  name: 'tasks.list',
  result: z.array(z.object({ id: z.string(), title: z.string() })),
}).on(taskCreated, (tasks, data) => [...tasks, data])

function makeApp() {
  const tables: Tables = { tasks: new Map() }
  const store = createMemoryStore({ tx: tables })
  const app = createIntentEffect<Record<string, never>, Tables>({ store })
  app.handle(createTask, async ({ input, tx, emit }) => {
    tx.tasks.set(input.id, input.title)
    emit(taskCreated, input)
  })
  app.handle(failTask, async () => {
    return err(intentEffectError('handler_failed', 'nope'))
  })
  app.project(taskList, {
    query: async ({ tx }) =>
      [...tx.tasks.entries()].map(([id, title]) => ({ id, title })),
  })
  return { app, store, tables }
}

test('intent mutates, emits, and the projection snapshot is cursor-consistent', async () => {
  const { app, store } = makeApp()

  const sent = await app.executeSend(
    { intentId: crypto.randomUUID(), type: 'task.create', input: { id: 't1', title: 'one' } },
    {},
  )
  assert.ok(sent.ok)
  assert.equal(sent.value.events.length, 1)
  assert.equal(sent.value.events[0]!.type, 'task.created')
  assert.equal(sent.value.events[0]!.id, 1)

  const snapshot = await app.executeProjection({ name: 'tasks.list', params: {} }, {})
  assert.ok(snapshot.ok)
  assert.deepEqual(snapshot.value.result, [{ id: 't1', title: 'one' }])
  assert.equal(snapshot.value.cursor, 1)
  assert.equal(store.log.length, 1)
})

test('a replayed intentId returns the stored outcome without re-running', async () => {
  const { app, tables } = makeApp()
  const intentId = crypto.randomUUID()
  const body = { intentId, type: 'task.create', input: { id: 't1', title: 'one' } }

  const first = await app.executeSend(body, {})
  assert.ok(first.ok)
  assert.equal(first.value.deduped, false)

  tables.tasks.clear() // prove the handler does not run again
  const second = await app.executeSend(body, {})
  assert.ok(second.ok)
  assert.equal(second.value.deduped, true)
  assert.deepEqual(second.value.events, first.value.events)
  assert.equal(tables.tasks.size, 0)
})

test('a failed intent is recorded and replays as the same failure', async () => {
  const { app } = makeApp()
  const intentId = crypto.randomUUID()

  const first = await app.executeSend({ intentId, type: 'task.fail', input: {} }, {})
  assert.ok(!first.ok)
  assert.equal(first.error.code, 'handler_failed')

  const second = await app.executeSend({ intentId, type: 'task.fail', input: {} }, {})
  assert.ok(!second.ok)
  assert.equal(second.error.deduped, true)
})

test('subscribers are woken after a commit', async () => {
  const { app, store } = makeApp()
  let wakes = 0
  const unsubscribe = store.subscribe(() => wakes++)

  await app.executeSend(
    { intentId: crypto.randomUUID(), type: 'task.create', input: { id: 't1', title: 'one' } },
    {},
  )
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.ok(wakes >= 1)

  unsubscribe()
  const before = wakes
  await app.executeSend(
    { intentId: crypto.randomUUID(), type: 'task.create', input: { id: 't2', title: 'two' } },
    {},
  )
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(wakes, before)
})

test('non-uuid intentIds are rejected at the boundary', async () => {
  const { app } = makeApp()
  const result = await app.executeSend(
    { intentId: 'retry-42!', type: 'task.create', input: { id: 't1', title: 'one' } },
    {},
  )
  assert.ok(!result.ok)
  assert.equal(result.error.code, 'validation_failed')
})
