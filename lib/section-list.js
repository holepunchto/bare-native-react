const { createElement, Fragment, useMemo } = require('react')

const identify = require('./list-key')
const VirtualizedList = require('./virtualized-list')

// Sections are flattened so that a single window covers the whole list.
module.exports = exports = function SectionList(props) {
  const {
    sections = [],
    renderItem = null,
    renderSectionHeader = null,
    renderSectionFooter = null,
    keyExtractor = identify,
    ItemSeparatorComponent = null,
    SectionSeparatorComponent = null,
    ...rest
  } = props

  const entries = useMemo(() => flatten(sections), [sections])

  return createElement(VirtualizedList, {
    ...rest,
    data: entries,

    getItem: (data, index) => data[index],

    getItemCount: (data) => data.length,

    keyExtractor: (entry) =>
      entry.kind === 'item'
        ? `${entry.key}:${(entry.section.keyExtractor || keyExtractor)(entry.item, entry.index)}`
        : entry.key,

    renderItem({ item: entry }) {
      const { section } = entry

      switch (entry.kind) {
        case 'header':
          return renderSectionHeader === null ? null : renderSectionHeader({ section })

        case 'footer':
          return join(
            renderSectionFooter === null ? null : renderSectionFooter({ section }),
            entry.last ? null : separator(SectionSeparatorComponent)
          )

        default: {
          const draw = section.renderItem || renderItem

          return join(
            draw === null ? null : draw({ item: entry.item, index: entry.index, section }),
            entry.last ? null : separator(ItemSeparatorComponent)
          )
        }
      }
    }
  })
}

function flatten(sections) {
  const entries = []

  for (let s = 0; s < sections.length; s++) {
    const section = sections[s]
    const key = section.key === undefined ? String(s) : String(section.key)
    const items = section.data || []

    entries.push({ kind: 'header', key: `${key}:header`, section })

    for (let i = 0; i < items.length; i++) {
      entries.push({
        kind: 'item',
        key,
        section,
        item: items[i],
        index: i,
        last: i === items.length - 1
      })
    }

    entries.push({
      kind: 'footer',
      key: `${key}:footer`,
      section,
      last: s === sections.length - 1
    })
  }

  return entries
}

function separator(Component) {
  return Component === null ? null : createElement(Component)
}

function join(content, trailing) {
  return trailing === null ? content : createElement(Fragment, null, content, trailing)
}
