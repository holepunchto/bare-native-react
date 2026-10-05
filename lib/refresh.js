const runtime = require('react-refresh/runtime')
const refresh = require('bare-refresh/hot')

const failures = require('./failures')

// The hook must exist before the renderer loads, so this module must be
// required first and must not require the renderer itself.
runtime.injectIntoGlobalHook(globalThis)

{
  const hook = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__

  const committed = hook.onCommitFiberRoot

  hook.onCommitFiberRoot = function (id, root, priority, didError) {
    if (didError) failures.lost()

    return committed.apply(this, arguments)
  }
}

// Modules whose every export was a component when they last ran. Only these
// can be swapped in place, because an importer keeps the exports it already
// read and only a component can be replaced behind its name.
const components = new Set()

module.exports = {
  evaluated(href, exports) {
    let only = false

    for (const [name, value] of named(exports)) {
      only = runtime.isLikelyComponentType(value)

      if (!only) break

      runtime.register(value, href + '#' + name)

      sign(value)
    }

    if (only) components.add(href)
    else components.delete(href)
  },

  accepts(href) {
    return components.has(href)
  },

  // A tree that came down cannot be refreshed back into existence, and the
  // refresh runtime retrying it is what spins, so the graph is reloaded
  // instead. The tree can also come down during the refresh itself.
  settled() {
    if (reloadIfLost()) return

    runtime.performReactRefresh()

    if (reloadIfLost()) return

    failures.refreshed()
  },

  failed(err, report) {
    failures.report({ ...report, error: err })
  }
}

function reloadIfLost() {
  if (!failures.wasLost()) return false

  failures.refreshed()

  // Deferred, because this runs inside the update that lost the tree.
  setTimeout(() => refresh.reload(), 0)

  return true
}

// A module that is itself a component is read as a single default export.
function* named(exports) {
  if (runtime.isLikelyComponentType(exports)) {
    yield ['default', exports]

    return
  }

  if (exports === null || typeof exports !== 'object') return

  for (const name of Object.keys(exports)) yield [name, exports[name]]
}

// Without a signature React assumes the hooks are unchanged and keeps state
// that may no longer fit. Without a compiler the hooks are read from the
// source, which misses hooks called inside closures or custom hooks.
function sign(value) {
  if (typeof value === 'function') {
    const hooks = value.toString().match(/\buse[A-Z]\w*/g)

    runtime.setSignature(value, hooks === null ? '' : hooks.join('\n'))

    return
  }

  if (value === null || typeof value !== 'object') return

  if (typeof value.render === 'function') sign(value.render)
  if (value.type !== undefined) sign(value.type)
}
