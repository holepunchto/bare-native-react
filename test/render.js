const { test } = require('bare-tap')
const { createElement: h, createRef, useEffect, useRef } = require('react')
const native = require('bare-native')
const render = require('..')
const { afterAnimationFrame, mount, near, pointer, update } = require('./helpers')

const { Pressable, View, createPortal, useWindow } = render

test('a tree is rendered into the window and taken down when it is unmounted', async (t) => {
  const ref = createRef()

  const window = await mount(t, h(View, { ref, style: { flex: 1 } }))

  const node = ref.current

  near(t, node.measureInWindow(), { x: 0, y: 0, ...window.size }, 'filling it')

  render.unmount(window)

  t.ok(node.destroyed)
})

test('effects are cleaned up as the tree is unmounted', async (t) => {
  let cleaned = false

  function Effect() {
    useEffect(
      () => () => {
        cleaned = true
      },
      []
    )

    return null
  }

  const window = await mount(t, h(Effect))

  render.unmount(window)

  t.ok(cleaned, 'before unmounting returns')
})

test('a component finds the window it was rendered into', async (t) => {
  let found = null

  function Finder() {
    found = useWindow()

    return null
  }

  const window = await mount(t, h(Finder))

  t.strictEqual(found, window)
})

test('a portal into the window is laid out over the tree', async (t) => {
  const ref = createRef()

  let found = null

  function Portaled() {
    found = useWindow()

    return h(View, {
      ref,
      style: { position: 'absolute', left: 10, top: 20, width: 30, height: 40 }
    })
  }

  function App() {
    return h(View, { style: { flex: 1, padding: 50 } }, createPortal(h(Portaled), useWindow()))
  }

  const window = await mount(t, h(App))

  near(t, ref.current.measureInWindow(), { x: 10, y: 20, width: 30, height: 40 }, 'by the window')
  t.strictEqual(found, window, 'keeping the context of the tree it came from')
})

test('a portal into a node is rendered into it', async (t) => {
  const target = createRef()
  const ref = createRef()

  function App({ into }) {
    return h(
      View,
      { style: { flex: 1 } },
      h(View, { ref: target, style: { flex: 1 } }),
      into === null ? null : createPortal(h(View, { ref }), into)
    )
  }

  await mount(t, h(App, { into: null }))

  await update(h(App, { into: target.current }))

  t.strictEqual(ref.current.parent, target.current)
})

// iOS and Android only have one window.
test(
  'a portal into another window is laid out there, above any tree it gets',
  { skip: Bare.platform === 'ios' || Bare.platform === 'android' },
  async (t) => {
    const other = new native.Window(200, 150)

    t.teardown(() => {
      render.unmount(other)
      other.hide()
    })

    const ref = createRef()

    function App({ left }) {
      return createPortal(
        h(View, { ref, style: { position: 'absolute', left, top: 20, width: 30, height: 40 } }),
        other
      )
    }

    await mount(t, h(App, { left: 10 }))

    other.show()

    await afterAnimationFrame(other)

    near(t, ref.current.measureInWindow(), { x: 10, y: 20, width: 30, height: 40 }, 'with no tree')

    await update(h(App, { left: 50 }))
    await afterAnimationFrame(other)

    near(t, ref.current.measureInWindow(), { x: 50, y: 20, width: 30, height: 40 }, 'as it changes')

    const tree = createRef()

    await new Promise((resolve) => {
      render(h(View, { ref: tree, style: { flex: 1 } }), other, { callback: resolve })
    })

    t.strictEqual(
      other.contentView.children[0],
      tree.current.parent,
      'and below it once there is one'
    )
  }
)

test('a portal into a text node holds runs of text', async (t) => {
  const target = createRef()

  function App({ into }) {
    return h(
      View,
      null,
      h('text', { ref: target }, 'Hello'),
      into === null ? null : createPortal(h('text', null, ', world'), into)
    )
  }

  await mount(t, h(App, { into: null }))

  await update(h(App, { into: target.current }))

  t.deepStrictEqual(
    target.current.children.map((child) => child.text),
    [', world']
  )
})

test('an anchored element is placed beside the element its ref points at', async (t) => {
  const tip = createRef()

  function App({ padding }) {
    const button = useRef(null)

    return h(
      View,
      { style: { flex: 1, padding } },
      h(View, { ref: button, style: { width: 80, height: 30 } }),
      createPortal(
        h(View, {
          ref: tip,
          anchor: { to: button, side: 'bottom', offset: 4 },
          style: { position: 'absolute', width: 40, height: 20 }
        }),
        useWindow()
      )
    )
  }

  await mount(t, h(App, { padding: 100 }))

  near(t, tip.current.measure(), { x: 120, y: 134, width: 40, height: 20 }, 'mounted together')

  await update(h(App, { padding: 50 }))
  await afterAnimationFrame()

  near(t, tip.current.measure(), { x: 70, y: 84, width: 40, height: 20 }, 'and as it moves')
})

test('a pressable passes its ref to its view', async (t) => {
  const ref = createRef()

  await mount(t, h(Pressable, { ref }))

  t.ok(ref.current instanceof native.View)
})

test('pressing a pressable presses in, out and then presses it', async (t) => {
  const ref = createRef()
  const calls = []

  await mount(
    t,
    h(Pressable, {
      ref,
      style: { width: 100, height: 100 },
      onPressIn: () => calls.push('pressIn'),
      onPressOut: () => calls.push('pressOut'),
      onPress: () => calls.push('press')
    })
  )

  await pointer(t).tap(ref.current)

  t.deepStrictEqual(calls, ['pressIn', 'pressOut', 'press'])
})

test('a pressable released outside itself is not pressed', async (t) => {
  const ref = createRef()
  const calls = []

  await mount(
    t,
    h(Pressable, {
      ref,
      style: { width: 100, height: 100 },
      onPressIn: () => calls.push('pressIn'),
      onPressOut: () => calls.push('pressOut'),
      onPress: () => calls.push('press')
    })
  )

  const press = pointer(t)

  await press.down(ref.current, 50, 50)
  await press.move(ref.current, 150, 50)
  await press.up()

  t.deepStrictEqual(calls, ['pressIn', 'pressOut'])
})

test('a pressable inside another takes the press', async (t) => {
  const ref = createRef()
  const calls = []

  await mount(
    t,
    h(
      Pressable,
      { style: { width: 200, height: 200 }, onPress: () => calls.push('outer') },
      h(Pressable, {
        ref,
        style: { width: 100, height: 100 },
        onPress: () => calls.push('inner')
      })
    )
  )

  await pointer(t).tap(ref.current)

  t.deepStrictEqual(calls, ['inner'])
})
