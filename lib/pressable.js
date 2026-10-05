const { createElement, useRef } = require('react')

// The platform keeps delivering to the node a press started in, so the box is
// needed to tell whether the pointer came up inside it.
module.exports = function Pressable(props) {
  const { onPress, onPressIn, onPressOut, onLayout, style, children } = props

  const box = useRef(null)
  const pressed = useRef(false)

  function release(event) {
    if (pressed.current === false) return false

    pressed.current = false

    if (onPressOut) onPressOut(event)

    return true
  }

  return createElement(
    'view',
    {
      style,

      onLayout(frame) {
        box.current = frame

        if (onLayout) onLayout(frame)
      },

      onPointerDown(event) {
        pressed.current = true

        if (onPressIn) onPressIn(event)
      },

      onPointerUp(event) {
        if (release(event) && onPress && inside(box.current, event)) onPress(event)
      },

      onPointerCancel: release
    },
    children
  )
}

function inside(box, { x, y }) {
  return box !== null && x >= 0 && y >= 0 && x < box.width && y < box.height
}
