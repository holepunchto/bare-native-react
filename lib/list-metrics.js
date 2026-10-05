// An unmeasured item is assumed to be the average size of the measured ones.
module.exports = class ListMetrics {
  constructor() {
    this._sizes = []
    this._offsets = [0]
    this._measured = 0
    this._sum = 0
    this._count = 0
    this._stale = true
  }

  get measured() {
    return this._measured
  }

  get total() {
    this._resolve()

    return this._offsets[this._count]
  }

  resize(count) {
    if (count === this._count) return false

    for (let i = count; i < this._sizes.length; i++) this._forget(i)

    this._sizes.length = Math.min(this._sizes.length, count)
    this._count = count
    this._stale = true

    return true
  }

  measure(index, size) {
    if (this._sizes[index] === size) return false

    this._forget(index)

    this._sizes[index] = size
    this._sum += size
    this._measured++
    this._stale = true

    return true
  }

  offset(index) {
    this._resolve()

    return this._offsets[Math.min(Math.max(index, 0), this._count)]
  }

  // The last item starting at or before `offset`.
  find(offset) {
    this._resolve()

    let low = 0
    let high = this._count - 1

    while (low < high) {
      const middle = (low + high + 1) >> 1

      if (this._offsets[middle] <= offset) low = middle
      else high = middle - 1
    }

    return Math.max(low, 0)
  }

  _forget(index) {
    const size = this._sizes[index]

    if (size === undefined) return

    this._sizes[index] = undefined
    this._sum -= size
    this._measured--
  }

  // Any measurement moves the average, so every offset is rebuilt.
  _resolve() {
    if (this._stale === false) return

    const average = this._measured === 0 ? 0 : this._sum / this._measured

    for (let i = 0; i < this._count; i++) {
      const size = this._sizes[i]

      this._offsets[i + 1] = this._offsets[i] + (size === undefined ? average : size)
    }

    this._offsets.length = this._count + 1
    this._stale = false
  }
}
