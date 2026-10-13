// A prop that is neither an event, a value, nor a style is rejected, because a
// misspelling is otherwise invisible.
const EVENTS = { onLayout: 'layout' }

const ELEMENT_EVENTS = {
  view: {
    onPointerDown: 'pointerdown',
    onPointerMove: 'pointermove',
    onPointerUp: 'pointerup',
    onPointerCancel: 'pointercancel'
  },
  'scroll-view': { onScroll: 'scroll' },
  image: { onLoad: 'load', onError: 'error' },
  switch: { onChange: 'change' },
  'text-input': {
    onChange: 'change',
    onFocus: 'focus',
    onBlur: 'blur',
    onSubmit: 'submit',
    onSelectionChange: 'selectionchange',
    onKeyPress: 'keypress'
  }
}

const VALUES = {
  image: ['source'],
  text: ['numberOfLines', 'ellipsizeMode'],
  switch: ['value', 'enabled'],
  'activity-indicator': ['animating', 'size'],
  'web-view': ['url', 'html', 'inspectable'],
  'text-input': [
    'value',
    'placeholder',
    'editable',
    'selection',
    'keyboardType',
    'returnKeyType',
    'autoCapitalize',
    'autoCorrect'
  ]
}

// Read when the instance is made, because Android has a class per variant.
const CONSTRUCTED = {
  'scroll-view': ['horizontal'],
  'text-input': ['multiline', 'secureTextEntry']
}

// The box a scroll view lays its children out in.
const NESTED = { 'scroll-view': 'contentStyle' }

// React 19 carries the ref in the props and attaches it itself.
const RESERVED = ['children', 'style', 'ref']

const EMPTY = []

function eventOf(type, name) {
  const own = ELEMENT_EVENTS[type]

  if (own !== undefined && name in own) return own[name]

  return EVENTS[name]
}

// Style objects are usually rebuilt on every render, so identity alone would
// skip almost nothing.
function same(prev = {}, next = {}) {
  if (prev === next) return true

  for (const name in prev) {
    if (name in next === false) return false
  }

  for (const name in next) {
    if (next[name] !== prev[name]) return false
  }

  return true
}

function textOf(children) {
  return typeof children === 'string' || typeof children === 'number' ? String(children) : ''
}

function apply(instance, type, prev, next) {
  const values = VALUES[type] || EMPTY
  const constructed = CONSTRUCTED[type] || EMPTY
  const nested = NESTED[type]

  for (const name in next) {
    if (RESERVED.includes(name) || name === 'anchor' || name === nested || values.includes(name)) {
      continue
    }

    if (constructed.includes(name)) {
      if (name in prev && Boolean(prev[name]) !== Boolean(next[name])) {
        throw new Error(`'${name}' cannot change on <${type}> once it is made`)
      }

      continue
    }

    const event = eventOf(type, name)

    if (event === undefined) {
      throw new TypeError(`Unknown property '${name}' on <${type}>`)
    }

    if (next[name] === prev[name]) continue

    if (prev[name]) instance.off(event, prev[name])
    if (next[name]) instance.on(event, next[name])
  }

  for (const name in prev) {
    const event = eventOf(type, name)

    if (name in next || event === undefined) continue

    if (prev[name]) instance.off(event, prev[name])
  }

  if (!same(prev.style, next.style)) instance.style = next.style

  if (!same(prev.anchor, next.anchor)) instance.anchor = anchor(next.anchor)

  for (const name of values) {
    if (next[name] !== prev[name]) instance[name] = next[name] === undefined ? null : next[name]
  }

  if (nested !== undefined && !same(prev[nested], next[nested])) {
    instance[nested] = next[nested] || {}
  }

  if (type === 'text') instance.text = textOf(next.children)
}

// A ref is read each time the node is placed rather than when the prop is set,
// as React attaches it only once the commit is done, which is before the tree
// is laid out.
function anchor(value) {
  if (value === undefined || value === null) return null

  const { to } = value

  if (to === null || typeof to !== 'object' || !('current' in to)) return value

  return { ...value, to: () => to.current }
}

function fragment(instance, prev, next) {
  for (const name in next) {
    if (RESERVED.includes(name)) continue

    throw new TypeError(`Unknown property '${name}' on a nested <text>`)
  }

  if (!same(prev.style, next.style)) instance.style = next.style

  instance.text = textOf(next.children)
}

module.exports = { apply, fragment, CONSTRUCTED }
