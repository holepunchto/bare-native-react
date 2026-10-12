const { View } = require('bare-native')

// Every content view made here. A window's content holds the tree rendered
// into it and the portals into it, and the development tools inspector draws
// in it as well.
const contents = new Set()

exports.content = function content(window) {
  let content = window.contentView

  if (!contents.has(content)) {
    content = new View()
    content.style = { flexGrow: 1 }

    window.content(content)

    contents.add(content)
  }

  return content
}

exports.destroy = function destroy(window) {
  const content = window.contentView

  if (!contents.has(content)) return

  content.destroy()

  contents.delete(content)
}

exports[Symbol.iterator] = function () {
  return contents.values()
}
