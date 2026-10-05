const { createElement, Fragment } = require('react')

const identify = require('./list-key')
const VirtualizedList = require('./virtualized-list')

module.exports = exports = function FlatList(props) {
  const {
    data = [],
    renderItem,
    keyExtractor = identify,
    numColumns = 1,
    columnWrapperStyle = null,
    horizontal = false,
    ...rest
  } = props

  const columns = Math.max(Math.floor(numColumns), 1)

  if (columns === 1) {
    return createElement(VirtualizedList, {
      ...rest,
      data,
      horizontal,
      getItem: item,
      getItemCount: length,
      renderItem,
      keyExtractor
    })
  }

  if (horizontal) {
    throw new Error('A horizontal list has no columns to lay out')
  }

  return createElement(VirtualizedList, {
    ...rest,
    data,

    getItem: (items, index) => items.slice(index * columns, index * columns + columns),

    getItemCount: (items) => Math.ceil(items.length / columns),

    keyExtractor: (row, index) =>
      row.map((each, column) => keyExtractor(each, index * columns + column)).join(' '),

    renderItem: ({ item: row, index }) =>
      createElement(
        'view',
        { style: { flexDirection: 'row', ...columnWrapperStyle } },
        row.map((each, column) => {
          const at = index * columns + column

          // A fragment rather than a box, so that a column's flex reaches the row.
          return createElement(
            Fragment,
            { key: keyExtractor(each, at) },
            renderItem({ item: each, index: at })
          )
        })
      )
  })
}

function item(data, index) {
  return data[index]
}

function length(data) {
  return data.length
}
