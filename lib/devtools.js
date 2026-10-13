// The backend is built for a browser. It wraps its bundle in a reference to
// `self` and reads the hook and much else off `window`, which React Native also
// points at the global object.
globalThis.self ??= globalThis
globalThis.window ??= globalThis

const ws = require('bare-ws')
const backend = require('react-devtools-core/backend')

// A hook that outlived a graph would keep it alive through what the graph
// wrapped around it and registered with it, so every graph gets a new one. The
// backend installs a hook on `window` as a property that cannot be replaced, so
// each is installed on an object of its own and the global only points at the
// current one.
let hook = null

function installHook() {
  const target = {}
  const previous = globalThis.window

  globalThis.window = target

  try {
    backend.initialize()
  } finally {
    globalThis.window = previous
  }

  hook = target.__REACT_DEVTOOLS_GLOBAL_HOOK__
}

// The hook must exist before any renderer loads, so this module must be
// required before the graph starts.
installHook()

Object.defineProperty(globalThis, '__REACT_DEVTOOLS_GLOBAL_HOOK__', {
  configurable: true,
  get: () => hook
})

module.exports = function devtools(refresh, opts = {}) {
  return new Connection(refresh, opts)
}

// The app can be opened and closed at will, so a connection that fails or
// drops is made again.
class Connection {
  constructor(refresh, opts) {
    const { host = '127.0.0.1', port = 8097, retry = 2000 } = opts

    this._refresh = refresh
    this._host = host
    this._port = port
    this._retry = retry
    this._socket = null
    this._timer = null
    this._closed = false
    this._immediate = false

    this._ondispose = this._ondispose.bind(this)

    if (refresh !== null) refresh.on('dispose', this._ondispose)

    this._connect()
  }

  close() {
    this._closed = true

    if (this._refresh !== null) this._refresh.off('dispose', this._ondispose)

    if (this._timer !== null) clearTimeout(this._timer)
    if (this._socket !== null) this._socket.destroy()
  }

  // An agent belongs to the hook it was made with, so the connection starts
  // over with the new one.
  _ondispose() {
    installHook()

    if (this._socket === null) return

    this._immediate = true
    this._socket.destroy()
  }

  _connect() {
    this._timer = null

    const socket = new ws.Socket({ host: this._host, port: this._port })
    const listeners = new Set()

    let detach = null

    socket
      .on('open', () => {
        detach = backend.connectWithCustomMessagingProtocol({
          onSubscribe: (fn) => listeners.add(fn),
          onUnsubscribe: (fn) => listeners.delete(fn),
          onMessage: (event, payload) => socket.write(JSON.stringify({ event, payload }))
        })
      })
      .on('data', (data) => {
        try {
          const message = JSON.parse(data.toString())

          for (const fn of listeners) fn(message)
        } catch (err) {
          console.error('React DevTools failed to handle a message', err)
        }
      })
      // An app that is not running is the usual case, and is retried.
      .on('error', noop)
      .on('close', () => {
        // Told what the app says as it closes, so that the agent shuts down
        // and lets go of the hook rather than lingering on it.
        if (detach !== null) {
          for (const fn of listeners) fn({ event: 'shutdown' })

          detach()
        }

        this._socket = null

        if (this._closed) return

        const delay = this._immediate ? 0 : this._retry

        this._immediate = false

        this._timer = setTimeout(() => this._connect(), delay)
        this._timer.unref()
      })

    this._socket = socket
  }
}

function noop() {}
