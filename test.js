// React reads this as it loads.
globalThis.process = { env: {} }

// In the order a development build loads them, the host before the graph.
require('./lib/devtools')

require('./test/refresh')
require('./test/props')
require('./test/render')
require('./test/devtools')
