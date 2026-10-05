// React reads `process.env.NODE_ENV` when it loads, which must happen before
// anything here runs.
if (globalThis.process === undefined) {
  throw new Error(
    'React needs a process global. Set `globalThis.process = { env: {} }` at the top of your entry, before requiring React.'
  )
}

exports.Reconciler = require('react-reconciler')
exports.constants = require('react-reconciler/constants')
