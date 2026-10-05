const {
  createElement,
  isValidElement,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} = require('react')

const ListMetrics = require('./list-metrics')

module.exports = exports = function VirtualizedList(props) {
  const {
    data,
    getItem,
    getItemCount,
    getItemLayout = null,
    renderItem,
    keyExtractor,
    horizontal = false,
    initialNumToRender = 10,
    windowSize = 3,
    onEndReached = null,
    onEndReachedThreshold = 0.5,
    ListHeaderComponent = null,
    ListFooterComponent = null,
    ListEmptyComponent = null,
    ItemSeparatorComponent = null,
    style = null,
    contentStyle = null,
    onScroll = null,
    onLayout = null,
    ref = null
  } = props

  const count = getItemCount(data)

  const view = useRef(null)
  const metrics = useRef(null)
  const position = useRef(0)
  const viewport = useRef(0)
  const origin = useRef(0)
  const reached = useRef(false)

  if (metrics.current === null) metrics.current = new ListMetrics()

  const [range, setRange] = useState({ first: 0, last: Math.min(initialNumToRender, count) })

  if (metrics.current.resize(count) && getItemLayout !== null) {
    for (let i = 0; i < count; i++) metrics.current.measure(i, getItemLayout(data, i).length)
  }

  // Returning the previous range skips the render while scrolling within it.
  function update(changed = false) {
    const next = visible()

    setRange((prev) =>
      changed === false && prev.first === next.first && prev.last === next.last ? prev : next
    )

    if (onEndReached !== null) end()
  }

  function visible() {
    const list = metrics.current

    if (list.measured === 0) return { first: 0, last: Math.min(initialNumToRender, count) }

    const overscan = ((Math.max(windowSize, 1) - 1) / 2) * viewport.current
    const start = position.current - origin.current

    return {
      first: list.find(start - overscan),
      last: Math.min(list.find(start + viewport.current + overscan) + 1, count)
    }
  }

  function end() {
    if (viewport.current === 0 || (count > 0 && metrics.current.measured === 0)) return

    const distanceFromEnd =
      metrics.current.total - (position.current - origin.current) - viewport.current

    if (distanceFromEnd > onEndReachedThreshold * viewport.current) {
      reached.current = false
      return
    }

    if (reached.current) return

    reached.current = true

    onEndReached({ distanceFromEnd })
  }

  function measure(index, frame) {
    if (metrics.current.measure(index, horizontal ? frame.width : frame.height)) update(true)
  }

  // Appending moves the end without causing a scroll or layout event.
  useEffect(() => {
    update(true)
  }, [count])

  useImperativeHandle(ref, () => {
    function scrollToOffset(offset) {
      view.current.contentOffset = horizontal ? { x: offset } : { y: offset }
    }

    return {
      scrollToOffset,

      scrollToIndex(index) {
        scrollToOffset(origin.current + metrics.current.offset(index))
      },

      scrollToEnd() {
        const list = metrics.current

        scrollToOffset(origin.current + Math.max(list.total - viewport.current, 0))
      },

      get view() {
        return view.current
      }
    }
  }, [horizontal])

  const first = Math.min(range.first, count)
  const last = Math.min(range.last, count)

  const items = []

  for (let i = first; i < last; i++) {
    const item = getItem(data, i)

    items.push(
      createElement(
        Cell,
        {
          key: keyExtractor(item, i),
          index: i,
          onMeasure: getItemLayout === null ? measure : null
        },
        renderItem({ item, index: i }),
        ItemSeparatorComponent !== null && i < count - 1
          ? createElement(ItemSeparatorComponent, {
              leadingItem: item,
              trailingItem: getItem(data, i + 1)
            })
          : null
      )
    )
  }

  const list = metrics.current
  const axis = horizontal ? 'width' : 'height'

  // A box of their own keeps the measured offsets independent of the header
  // and of the caller's content style.
  const region = createElement(
    'view',
    {
      style: { flexDirection: horizontal ? 'row' : 'column' },
      onLayout(frame) {
        origin.current = horizontal ? frame.x : frame.y

        update()
      }
    },
    count === 0
      ? element(ListEmptyComponent)
      : [
          createElement('view', { key: 'leading', style: { [axis]: list.offset(first) } }),
          ...items,
          createElement('view', {
            key: 'trailing',
            style: { [axis]: Math.max(list.total - list.offset(last), 0) }
          })
        ]
  )

  return createElement(
    'scroll-view',
    {
      ref: view,
      style,
      contentStyle,
      horizontal,

      onLayout(frame) {
        viewport.current = horizontal ? frame.width : frame.height

        update()

        if (onLayout !== null) onLayout(frame)
      },

      onScroll(point) {
        position.current = horizontal ? point.x : point.y

        update()

        if (onScroll !== null) onScroll(point)
      }
    },
    element(ListHeaderComponent),
    region,
    element(ListFooterComponent)
  )
}

function Cell({ index, onMeasure, children }) {
  return createElement(
    'view',
    onMeasure === null
      ? null
      : {
          onLayout(frame) {
            onMeasure(index, frame)
          }
        },
    children
  )
}

function element(Component) {
  if (Component === null || Component === undefined) return null

  return isValidElement(Component) ? Component : createElement(Component)
}
