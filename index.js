const bare = require('bare-native')
const { createContext, createElement, useContext } = require('react')
const refresh = require('bare-refresh/hot')

const failures = require('./lib/failures')
const { constants } = require('./lib/react')
const elements = require('./lib/elements')
const ErrorBoundary = require('./lib/error-boundary')
const inspector = require('./lib/inspector')
const reconciler = require('./lib/host')
const windows = require('./lib/windows')

const roots = new Map()

const WindowContext = createContext(null)

const detachInspector = inspector()

// A graph that is replaced leaves its trees behind unless they are unmounted,
// and their effects keep running.
refresh.dispose(() => {
  detachInspector()

  for (const window of roots.keys()) exports.unmount(window)
})

// These must never throw. Throwing re-enters React's error handling, which
// retries the render and throws again, spinning without reporting anything.
function onUncaughtError(error, info) {
  failures.lost()

  report('An error was thrown and no boundary caught it', error, info)
}

function onCaughtError(error, info) {
  report('An error was thrown and a boundary caught it', error, info)
}

function onRecoverableError(error, info) {
  report('An error was thrown and React recovered', error, info)
}

function report(what, error, info) {
  if (info && info.componentStack) {
    error.stack = `${error.stack || error.message}\n${info.componentStack}`
  }

  console.error(what, error)

  refresh.report(error)
}

module.exports = exports = function render(element, window, opts = {}) {
  const { module = null, callback = null } = opts

  let root = roots.get(window)

  if (root === undefined) {
    // The tree sits in a view of its own, below whatever portals have put in
    // the window.
    const view = new bare.View()
    view.style = { flexGrow: 1 }

    windows.content(window).insertChild(view, 0)

    root = reconciler.createContainer(
      view,
      constants.ConcurrentRoot,
      null,
      false,
      null,
      '',
      onUncaughtError,
      onCaughtError,
      onRecoverableError,
      null
    )

    roots.set(window, root)

    // A module that accepts its own changes is evaluated again rather than
    // disposed with the graph, and would otherwise leave its tree behind.
    if (module !== null) refresh.hot(module).dispose(() => exports.unmount(window))
  }

  // An unmounted root is one the refresh runtime tries to mount again, which
  // hangs the application, so the root is never allowed to unmount on error.
  reconciler.updateContainer(
    createElement(
      WindowContext.Provider,
      { value: window },
      createElement(ErrorBoundary, { onError: failures.lost }, element)
    ),
    root,
    null,
    callback
  )

  return root
}

exports.View = elements.View
exports.Text = elements.Text
exports.Image = elements.Image
exports.TextInput = elements.TextInput
exports.ScrollView = elements.ScrollView
exports.WebView = elements.WebView
exports.Switch = elements.Switch
exports.ActivityIndicator = elements.ActivityIndicator

exports.Pressable = require('./lib/pressable')
exports.ErrorBoundary = ErrorBoundary

exports.StyleSheet = bare.StyleSheet
exports.Alert = bare.Alert
exports.Appearance = bare.Appearance
exports.Clipboard = bare.Clipboard
exports.Dimensions = bare.Dimensions
exports.Keyboard = bare.Keyboard

exports.FlatList = require('./lib/flat-list')
exports.SectionList = require('./lib/section-list')
exports.VirtualizedList = require('./lib/virtualized-list')

// The window the calling component was rendered into, which is also where a
// portal above the tree goes.
exports.useWindow = function useWindow() {
  const window = useContext(WindowContext)

  if (window === null) {
    throw new Error('useWindow() must be called in a tree rendered with render()')
  }

  return window
}

// Renders `children` into another node, or into a window above any tree in it,
// while they stay part of the tree they were rendered from for context and
// errors.
exports.createPortal = function createPortal(children, target, key = null) {
  const view = target instanceof bare.Window ? windows.content(target) : target

  return reconciler.createPortal(children, view, null, key)
}

exports.unmount = function unmount(window) {
  const root = roots.get(window)

  if (root === undefined) return

  // Synchronously, so that a graph being disposed is rid of its tree before the
  // next one starts.
  reconciler.updateContainerSync(null, root, null, null)
  reconciler.flushSyncWork()

  windows.destroy(window)

  roots.delete(window)
}
