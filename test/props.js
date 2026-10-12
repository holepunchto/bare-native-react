const { test } = require('bare-tap')

const props = require('../lib/props')

test('an anchor reads its ref when the node is placed', (t) => {
  const node = {}
  const ref = { current: null }

  props.apply(node, 'view', {}, { anchor: { to: ref, side: 'top' } })

  t.strictEqual(node.anchor.side, 'top')
  t.strictEqual(node.anchor.to(), null)

  ref.current = 'target'

  t.strictEqual(node.anchor.to(), 'target')
})

test('an anchor that has not changed is not set again', (t) => {
  const to = { x: 0, y: 0, width: 10, height: 10 }
  const node = {}

  props.apply(node, 'view', {}, { anchor: { to } })

  const first = node.anchor

  props.apply(node, 'view', { anchor: { to } }, { anchor: { to } })

  t.strictEqual(node.anchor, first)

  props.apply(node, 'view', { anchor: { to } }, {})

  t.strictEqual(node.anchor, null)
})

test('a nested text cannot be anchored', (t) => {
  t.throws(() => props.fragment({}, {}, { anchor: { to: {} } }), /Unknown property 'anchor'/)
})
