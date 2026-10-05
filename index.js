const bare = require('bare-native')
const { createElement } = require('react')
const refresh = require('bare-refresh/hot')

const failures = require('./lib/failures')
const { constants } = require('./lib/react')
const elements = require('./lib/elements')
const ErrorBoundary = require('./lib/error-boundary')
const reconciler = require('./lib/host')

const roots = new WeakMap()

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

module.exports = exports = function render(element, window, callback = null) {
  let mounted = roots.get(window)

  if (mounted === undefined) {
    const view = new bare.View()
    view.style = { flexGrow: 1 }

    window.content(view)

    const root = reconciler.createContainer(
      { view, window },
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

    mounted = { root, view }

    roots.set(window, mounted)
  }

  // An unmounted root is one the refresh runtime tries to mount again, which
  // hangs the application, so the root is never allowed to unmount on error.
  reconciler.updateContainer(
    createElement(ErrorBoundary, { onError: failures.lost }, element),
    mounted.root,
    null,
    callback
  )

  return mounted.root
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

exports.unmount = function unmount(window) {
  const mounted = roots.get(window)

  if (mounted === undefined) return

  // A concurrent root does not unmount synchronously.
  reconciler.updateContainer(null, mounted.root, null, () => {
    mounted.view.destroy()
  })

  roots.delete(window)
}
