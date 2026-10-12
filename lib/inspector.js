const { Text, TextFragment, View } = require('bare-native')

const INTRINSICS = require('./intrinsics')
const windows = require('./windows')

// The colours of the Firefox element picker.
const MARGIN = 'rgba(237, 255, 100, 0.6)'
const BORDER = 'rgba(68, 68, 68, 0.6)'
const PADDING = 'rgba(106, 90, 205, 0.6)'
const CONTENT = 'rgba(137, 207, 235, 0.6)'
const GUIDE = 'rgb(0, 136, 204)'
const LABEL = 'rgb(52, 58, 68)'
const TYPE = 'rgb(223, 128, 255)'
const NAME = 'rgb(117, 191, 255)'
const SEPARATOR = 'rgb(90, 98, 110)'
const SIZE = 'rgb(255, 255, 255)'

const GAP = 6
const ARROW = 8

// Outside the DOM, React DevTools only says what to highlight and when a node
// should be picked, and leaves drawing and hit testing to the renderer. Both
// happen in a view laid over the content of each window, above the tree and
// any portals.
module.exports = function inspector() {
  const hook = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__

  // The hook that `react-refresh` installs has no events, and without the
  // DevTools backend there is nothing to answer.
  if (hook === undefined || typeof hook.on !== 'function') return noop

  const overlays = new WeakMap()

  let agent = null
  let inspecting = false
  let highlighted = []

  const listeners = {
    showNativeHighlight: (nodes) => highlight(nodes),
    hideNativeHighlight: () => highlight([]),
    startInspectingNative: () => inspect(true),
    stopInspectingNative: () => inspect(false),
    shutdown: () => connect(null)
  }

  if (hook.reactDevtoolsAgent) connect(hook.reactDevtoolsAgent)

  hook.on('react-devtools', connect)

  return () => {
    hook.off('react-devtools', connect)

    connect(null)
  }

  function connect(next) {
    if (agent !== null) {
      for (const name in listeners) agent.removeListener(name, listeners[name])
    }

    agent = next

    if (agent !== null) {
      for (const name in listeners) agent.addListener(name, listeners[name])
    }

    inspecting = false
    highlight([])
  }

  function highlight(nodes) {
    highlighted = nodes.filter(isBox)

    update()
  }

  function inspect(enabled) {
    inspecting = enabled

    if (!enabled) highlighted = []

    update()
  }

  function update() {
    for (const content of windows) {
      const nodes = highlighted.filter((node) => root(node) === content)

      let view = overlays.get(content)

      if (nodes.length === 0 && !inspecting) {
        if (view !== undefined) {
          view.destroy()
          overlays.delete(content)
        }

        continue
      }

      if (view === undefined) {
        view = overlay(content)
        overlays.set(content, view)
      }

      view.style = { ...view.style, pointerEvents: inspecting ? 'auto' : 'none' }

      for (const child of view.children) child.destroy()

      const measured = nodes.map((node) => regions(node, content))

      for (const box of measured) boxes(view, box)

      if (nodes.length > 0) {
        guides(view, measured[0].content)

        label(view, describe(nodes[0]), measured[0])
      }
    }
  }

  function describe(node) {
    return {
      type: Object.keys(INTRINSICS).find((name) => node instanceof INTRINSICS[name]),
      name: agent === null ? null : agent.getComponentNameForHostInstance(node)
    }
  }

  // A press picks the node under it, and moving while pressed shows which node
  // that is, as there is no hover on a touch screen. The depth keeps it above
  // portals that are added after it.
  function overlay(content) {
    const view = new View()
    view.style = { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, zIndex: 1 }

    view
      .on('pointerdown', (event) => hover(under(content, content, view, event)))
      .on('pointermove', (event) => hover(under(content, content, view, event)))
      .on('pointerup', (event) => pick(under(content, content, view, event)))

    content.appendChild(view)

    return view
  }

  function hover(node) {
    if (node === null ? highlighted.length === 0 : highlighted[0] === node) return

    highlight(node === null ? [] : [node])
  }

  function pick(node) {
    if (node !== null) agent.selectNode(node)

    agent.stopInspectingNative(true)

    inspect(false)
  }
}

// The deepest box under the point, preferring later siblings, which are drawn
// on top. A node is only looked into if the point is inside it, so a child
// clipped away by a scroll view is not picked, and nor is the overlay.
function under(node, origin, overlay, { x, y }) {
  const children = node.children

  for (let i = children.length - 1; i >= 0; i--) {
    const child = children[i]

    if (child === overlay || !isBox(child) || !contains(child.measureLayout(origin), x, y)) {
      continue
    }

    return under(child, origin, overlay, { x, y }) || child
  }

  return null
}

// The boxes of a node as CSS describes them, each inside the last.
function regions(node, content) {
  const { margin, border, padding } = node.measureEdges()

  const box = node.measureLayout(content)

  return {
    margin: inset(box, negate(margin)),
    border: box,
    padding: inset(box, border),
    content: inset(inset(box, border), padding)
  }
}

function boxes(parent, { margin, border, padding, content }) {
  ring(parent, margin, border, MARGIN)
  ring(parent, border, padding, BORDER)
  ring(parent, padding, content, PADDING)
  rect(parent, content, CONTENT)
}

// The space between two boxes, drawn as four strips so that no colour is laid
// over another.
function ring(parent, outer, inner, color) {
  const right = outer.x + outer.width
  const bottom = outer.y + outer.height
  const innerRight = inner.x + inner.width
  const innerBottom = inner.y + inner.height

  const strips = [
    { x: outer.x, y: outer.y, width: outer.width, height: inner.y - outer.y },
    { x: outer.x, y: innerBottom, width: outer.width, height: bottom - innerBottom },
    { x: outer.x, y: inner.y, width: inner.x - outer.x, height: inner.height },
    { x: innerRight, y: inner.y, width: right - innerRight, height: inner.height }
  ]

  for (const strip of strips) rect(parent, strip, color)
}

function rect(parent, { x, y, width, height }, color) {
  if (width <= 0 || height <= 0) return

  const view = new View()
  view.style = { position: 'absolute', left: x, top: y, width, height, backgroundColor: color }

  parent.appendChild(view)
}

// Dashed lines along the content box, across the whole window. Each pair is the
// border of a box that overhangs the window, so its other two sides are never
// seen.
function guides(parent, { x, y, width, height }) {
  const style = { position: 'absolute', borderWidth: 1, borderStyle: 'dashed', borderColor: GUIDE }

  const horizontal = new View()
  horizontal.style = { ...style, left: -1, right: -1, top: y - 1, height: height + 2 }

  const vertical = new View()
  vertical.style = { ...style, top: -1, bottom: -1, left: x - 1, width: width + 2 }

  parent.appendChild(horizontal)
  parent.appendChild(vertical)
}

// The type, component and size of the node, above its margin box with an
// arrow pointing at it, or below when there is no room above.
function label(parent, { type, name }, { margin, border }) {
  const target = new View()
  target.style = {
    position: 'absolute',
    left: margin.x,
    top: margin.y,
    width: margin.width,
    height: margin.height
  }

  // Centred on the edge of the bar, and flipped with it.
  const pointer = new View()
  pointer.style = {
    position: 'absolute',
    width: ARROW,
    height: ARROW,
    backgroundColor: LABEL,
    transform: [{ rotate: '45deg' }]
  }

  pointer.anchor = { to: target, side: 'top', offset: GAP - ARROW / 2 }

  const bar = new View()
  bar.style = {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 3,
    backgroundColor: LABEL
  }

  bar.anchor = { to: target, side: 'top', offset: GAP }

  const title = new Text()
  title.style = { fontSize: 12 }

  const typed = new TextFragment(type || 'node')
  typed.style = { color: TYPE }

  title.appendChild(typed)

  if (name !== null) {
    const named = new TextFragment(' ' + name)
    named.style = { color: NAME }

    title.appendChild(named)
  }

  const separator = new View()
  separator.style = {
    width: 1,
    alignSelf: 'stretch',
    marginHorizontal: 6,
    backgroundColor: SEPARATOR
  }

  const size = new Text(`${round(border.width)} × ${round(border.height)}`)
  size.style = { fontSize: 12, color: SIZE }

  bar.appendChild(pointer)
  bar.appendChild(title)
  bar.appendChild(separator)
  bar.appendChild(size)

  parent.appendChild(target)
  parent.appendChild(bar)
}

function inset({ x, y, width, height }, { top, right, bottom, left }) {
  return {
    x: x + left,
    y: y + top,
    width: Math.max(0, width - left - right),
    height: Math.max(0, height - top - bottom)
  }
}

function negate({ top, right, bottom, left }) {
  return { top: -top, right: -right, bottom: -bottom, left: -left }
}

function round(value) {
  return Math.round(value * 100) / 100
}

function contains({ x, y, width, height }, px, py) {
  return px >= x && py >= y && px < x + width && py < y + height
}

function isBox(node) {
  return node !== null && !node.destroyed && !TextFragment.isTextFragment(node)
}

function root(node) {
  while (node.parent !== null) node = node.parent

  return node
}

function noop() {}
