const { test } = require('bare-tap')
const ws = require('bare-ws')

const devtools = require('../lib/devtools')

test('the development tools are reached once they listen', async (t) => {
  connect(t, null, { port: 8098, retry: 50 })

  await new Promise((resolve) => setTimeout(resolve, 100))

  const data = await new Promise((resolve) => {
    serve(t, 8098, (socket) => socket.once('data', resolve))
  })

  t.strictEqual(JSON.parse(data).event, 'backendInitialized')
})

test('the development tools are answered', async (t) => {
  const payload = await new Promise((resolve) => {
    serve(t, 8099, (socket) => {
      socket.on('data', (data) => {
        const { event, payload } = JSON.parse(data)

        if (event === 'backendInitialized') {
          socket.write(JSON.stringify({ event: 'getBackendVersion' }))
        }

        if (event === 'backendVersion') resolve(payload)
      })
    })

    connect(t, null, { port: 8099, retry: 50 })
  })

  t.strictEqual(typeof payload, 'string')
})

test('the development tools are reached again after they go away', async (t) => {
  connect(t, null, { port: 8100, retry: 50 })

  const first = await session(t, 8100)

  t.strictEqual(first.event, 'backendInitialized', 'the first time')

  first.socket.destroy()

  await new Promise((resolve) => first.server.close(resolve))

  const second = await session(t, 8100)

  t.strictEqual(second.event, 'backendInitialized', 'and the second')
})

test('a replaced graph gets a new hook and the development tools are reached again', async (t) => {
  const disposals = new Set()

  const refresh = {
    on: (event, fn) => disposals.add(fn),
    off: (event, fn) => disposals.delete(fn)
  }

  const sessions = []

  const second = new Promise((resolve) => {
    serve(t, 8101, (socket) => {
      socket.once('data', (data) => {
        sessions.push(JSON.parse(data).event)

        if (sessions.length === 1) {
          const hook = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__

          for (const fn of disposals) fn()

          t.notStrictEqual(globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__, hook, 'the hook is a new one')
        } else {
          resolve()
        }
      })
    })
  })

  connect(t, refresh, { port: 8101, retry: 50 })

  await second

  t.deepStrictEqual(sessions, ['backendInitialized', 'backendInitialized'], 'before and after')
})

test('a message the development tools fail on is logged and the connection kept', async (t) => {
  const logged = []

  const error = console.error

  console.error = (...args) => logged.push(args)

  t.teardown(() => {
    console.error = error
  })

  await new Promise((resolve) => {
    serve(t, 8102, (socket) => {
      socket.on('data', (data) => {
        const { event } = JSON.parse(data)

        if (event === 'backendInitialized') {
          socket.write('nope')
          socket.write(JSON.stringify({ event: 'getBackendVersion' }))
        }

        if (event === 'backendVersion') resolve()
      })
    })

    connect(t, null, { port: 8102, retry: 50 })
  })

  t.strictEqual(logged.length, 1, 'the message that failed was logged')
  t.pass('and the next one was answered')
})

test('the agent shuts down when the development tools go away', async (t) => {
  const hook = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__

  connect(t, null, { port: 8103, retry: 1000 })

  const { socket } = await session(t, 8103)

  t.ok(hook.reactDevtoolsAgent, 'there is an agent while connected')

  socket.destroy()

  await new Promise((resolve) => setTimeout(resolve, 50))

  t.strictEqual(hook.reactDevtoolsAgent, null, 'and none once they are gone')
})

// The first message of the next connection to a server on `port`.
function session(t, port) {
  return new Promise((resolve) => {
    const server = serve(t, port, (socket) => {
      socket.once('data', (data) => resolve({ server, socket, event: JSON.parse(data).event }))
    })
  })
}

// A backend that is closed resets the connection, which is not a failure here.
// The backend connects to 127.0.0.1, which `localhost` may not resolve to.
function serve(t, port, onconnection) {
  const server = new ws.Server({ port, host: '127.0.0.1' }, (socket) => {
    socket.on('error', noop)

    onconnection(socket)
  })

  t.teardown(() => server.close())

  return server
}

function connect(t, refresh, opts) {
  const connection = devtools(refresh, opts)

  t.teardown(() => connection.close())
}

function noop() {}
