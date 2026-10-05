globalThis.process = { env: {} }

const test = require('brittle')
const runtime = require('react-refresh/runtime')

const plugin = require('./lib/refresh')

// The runtime does not expose signatures, so they are recorded on the way in.
const signatures = new Map()

const setSignature = runtime.setSignature

runtime.setSignature = function (type, key, ...rest) {
  signatures.set(type, key)

  return setSignature.call(runtime, type, key, ...rest)
}

const FORWARD_REF = Symbol.for('react.forward_ref')
const MEMO = Symbol.for('react.memo')

function Component() {
  return null
}

test('a module of nothing but components may be read again on its own', (t) => {
  plugin.evaluated('file:///a.js', { Component, Other: Component })

  t.ok(plugin.accepts('file:///a.js'))
})

test('a module that exports anything else may not', (t) => {
  plugin.evaluated('file:///b.js', { Component, inset: 12 })

  t.absent(plugin.accepts('file:///b.js'), 'the number would be left stale behind its name')
})

test('a module that is itself a component counts', (t) => {
  plugin.evaluated('file:///c.js', Component)

  t.ok(plugin.accepts('file:///c.js'))
})

test('a module of no components does not', (t) => {
  plugin.evaluated('file:///d.js', { inset: 12 })

  t.absent(plugin.accepts('file:///d.js'))
})

test('a module of nothing at all does not', (t) => {
  plugin.evaluated('file:///d2.js', {})

  t.absent(plugin.accepts('file:///d2.js'))
})

test('a module stops being one when it stops exporting only components', (t) => {
  plugin.evaluated('file:///e.js', { Component })

  t.ok(plugin.accepts('file:///e.js'))

  plugin.evaluated('file:///e.js', { Component, inset: 12 })

  t.absent(plugin.accepts('file:///e.js'), 'and says so the next time it runs')
})

test('the same name across runs is the same component', (t) => {
  const Before = () => null
  const After = () => null

  plugin.evaluated('file:///f.js', { Widget: Before })
  plugin.evaluated('file:///f.js', { Widget: After })

  t.is(
    runtime.getFamilyByType(Before),
    runtime.getFamilyByType(After),
    'which is what lets the one that replaced it be found behind the other'
  )
})

test('a different name is a different component', (t) => {
  const One = () => null
  const Two = () => null

  plugin.evaluated('file:///g.js', { One, Two })

  t.not(runtime.getFamilyByType(One), runtime.getFamilyByType(Two))
})

test('the same name in a different module is a different component', (t) => {
  const Here = () => null
  const There = () => null

  plugin.evaluated('file:///g1.js', { Widget: Here })
  plugin.evaluated('file:///g2.js', { Widget: There })

  t.not(runtime.getFamilyByType(Here), runtime.getFamilyByType(There))
})

test('a component with no hooks reads as nothing rather than as unknown', (t) => {
  const Plain = () => null

  plugin.evaluated('file:///h.js', { Plain })

  t.is(signatures.get(Plain), '')
})

test('the hooks read in the order they are called', (t) => {
  const Hooked = () => {
    useState(0)
    useEffect(() => {})
  }

  plugin.evaluated('file:///i.js', { Hooked })

  t.is(signatures.get(Hooked), 'useState\nuseEffect')
})

test('a hook added reads differently', (t) => {
  const Before = () => {
    useState(0)
  }

  const After = () => {
    useState(0)
    useEffect(() => {})
  }

  plugin.evaluated('file:///j.js', { Hooked: Before })
  plugin.evaluated('file:///j.js', { Hooked: After })

  t.not(signatures.get(Before), signatures.get(After), 'so the state it no longer fits is not kept')
})

test('a hook reordered reads differently', (t) => {
  const Before = () => {
    useState(0)
    useEffect(() => {})
  }

  const After = () => {
    useEffect(() => {})
    useState(0)
  }

  plugin.evaluated('file:///k.js', { Hooked: Before })
  plugin.evaluated('file:///k.js', { Hooked: After })

  t.not(signatures.get(Before), signatures.get(After))
})

test('a forwarded ref is read through what it renders', (t) => {
  const render = () => {
    useState(0)
  }

  const Forwarded = { $$typeof: FORWARD_REF, render }

  plugin.evaluated('file:///l.js', { Forwarded })

  t.ok(plugin.accepts('file:///l.js'))
  t.is(signatures.get(render), 'useState')
})

test('a memo is read through what it wraps', (t) => {
  const Inner = () => {
    useState(0)
  }

  const Memoized = { $$typeof: MEMO, type: Inner }

  plugin.evaluated('file:///m.js', { Memoized })

  t.ok(plugin.accepts('file:///m.js'))
  t.is(signatures.get(Inner), 'useState')
})

test('refreshing with nothing to refresh does nothing', (t) => {
  t.execution(() => plugin.settled())
})

function useState() {}
function useEffect() {}

test('what went wrong is kept until a refresh lands', (t) => {
  const failures = require('./lib/failures')

  const seen = []

  const release = failures.subscribe((failure) => seen.push(failure))

  t.teardown(release)

  plugin.failed(new Error('no'), { phase: 'evaluate', href: 'file:///a.js', intact: false })

  t.is(seen.length, 1)
  t.is(seen[0].message, undefined, 'the report is what is kept')
  t.is(seen[0].error.message, 'no', 'with the error it was made from')
  t.is(failures.latest().phase, 'evaluate')

  plugin.settled([])

  t.is(seen.length, 2)
  t.is(seen[1], null, 'and a refresh that landed is the end of it')
  t.is(failures.latest(), null)
})

test('a subscriber that let go is not told', (t) => {
  const failures = require('./lib/failures')

  const seen = []

  const release = failures.subscribe((failure) => seen.push(failure))

  release()

  plugin.failed(new Error('no'), { phase: 'evaluate', href: null, intact: false })

  t.alike(seen, [])

  failures.refreshed()
})

test('a tree that came down is rebuilt rather than refreshed', (t) => {
  const failures = require('./lib/failures')

  t.absent(failures.wasLost(), 'nothing has gone wrong yet')

  failures.lost()

  t.ok(failures.wasLost())

  plugin.settled([])

  t.absent(failures.wasLost(), 'and asking for the graph again is the end of it')
})

test('an error a boundary caught leaves the tree standing', (t) => {
  const failures = require('./lib/failures')

  plugin.failed(new Error('caught'), { phase: 'runtime', href: null, intact: true })

  t.absent(failures.wasLost(), 'so the next change is an ordinary refresh')

  failures.refreshed()
})
