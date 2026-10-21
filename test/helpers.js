const AnimationFrameProvider = require('bare-animation-frame')
const Pointer = require('bare-pointer')
const { Dimensions, Window } = require('bare-native')
const render = require('..')

// A window cannot be closed, and iOS and Android only have one, so the tests
// share a window and render into it in turn.
let window = null

// GTK otherwise times frames by its active window, which a window that has not
// been shown yet can become.
const providers = new WeakMap()

// GTK and XAML only place new content on their next frame.
exports.mount = async function mount(t, element) {
  const first = window === null

  if (first) window = new Window(400, 300)

  t.teardown(() => render.unmount(window))

  await exports.update(element)

  if (first) window.show()

  await exports.afterAnimationFrame()

  return window
}

exports.afterAnimationFrame = function afterAnimationFrame(target = window) {
  let provider = providers.get(target)

  if (provider === undefined) {
    provider = new AnimationFrameProvider(target.native)
    providers.set(target, provider)
  }

  return provider.afterAnimationFrame()
}

// Resolves once the render has been committed.
exports.update = function update(element) {
  return new Promise((resolve) => render(element, window, { callback: resolve }))
}

// A box is rounded to the pixels of the display, which a point is not a whole
// number of on every display, so a length on screen is only exact to a pixel.
exports.near = function near(t, actual, expected, message) {
  const pixel = 1 / Dimensions.get('window').scale

  const close = Object.keys(expected).every((key) => Math.abs(actual[key] - expected[key]) <= pixel)

  if (close) t.pass(message)
  else t.deepStrictEqual(actual, expected, message)
}

// A pointer that presses nodes at points in the units the tree is laid out in.
// Android's views take pixels rather than dp.
exports.pointer = function pointer(t) {
  const pointer = new Pointer()
  const scale = Bare.platform === 'android' ? Dimensions.get('window').scale : 1

  t.teardown(() => pointer.destroy())

  const at = (value) => (value === undefined ? undefined : value * scale)

  return {
    down: (node, x, y) => pointer.down(node.native, at(x), at(y)),
    move: (node, x, y) => pointer.move(node.native, at(x), at(y)),
    up: () => pointer.up(),
    tap: (node, x, y) => pointer.tap(node.native, at(x), at(y))
  }
}
