// Kept apart from the refresh plugin so that a boundary can watch it without
// pulling the refresh runtime into a production build.
const watching = new Set()

let latest = null

let wasLost = false

exports.latest = function () {
  return latest
}

exports.report = function report(failure) {
  latest = failure

  announce()
}

exports.lost = function lost() {
  wasLost = true
}

exports.wasLost = function () {
  return wasLost
}

exports.refreshed = function refreshed() {
  latest = null
  wasLost = false

  announce()
}

exports.subscribe = function subscribe(onchange) {
  watching.add(onchange)

  return () => watching.delete(onchange)
}

function announce() {
  for (const onchange of watching) onchange(latest)
}
