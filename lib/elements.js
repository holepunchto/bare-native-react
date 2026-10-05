const { createElement } = require('react')

exports.View = function View(props) {
  return createElement('view', props)
}

exports.Text = function Text(props) {
  return createElement('text', props)
}

exports.Image = function Image(props) {
  return createElement('image', props)
}

exports.TextInput = function TextInput(props) {
  return createElement('text-input', props)
}

exports.ScrollView = function ScrollView(props) {
  return createElement('scroll-view', props)
}

exports.WebView = function WebView(props) {
  return createElement('web-view', props)
}

exports.Switch = function Switch(props) {
  return createElement('switch', props)
}

exports.ActivityIndicator = function ActivityIndicator(props) {
  return createElement('activity-indicator', props)
}
