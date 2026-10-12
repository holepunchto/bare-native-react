const { afterAnimationFrame } = require('bare-animation-frame')
const { Dimensions, Window } = require('bare-native')
const render = require('..')

// A window cannot be closed, and iOS and Android only have one, so the tests
// share a window and render into it in turn.
let window = null

// GTK and XAML only place new content on their next frame.
exports.mount = async function mount(t, element) {
  const first = window === null

  if (first) window = new Window(400, 300)

  t.teardown(() => render.unmount(window))

  await exports.update(element)

  if (first) window.show()

  await afterAnimationFrame()

  return window
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
