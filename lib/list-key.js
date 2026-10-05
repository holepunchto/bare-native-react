module.exports = exports = function identify(item, index) {
  if (item !== null && typeof item === 'object') {
    if (item.key !== undefined) return String(item.key)
    if (item.id !== undefined) return String(item.id)
  }

  return String(index)
}
