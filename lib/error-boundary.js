const { Component } = require('react')
const refresh = require('bare-refresh/hot')

const failures = require('./failures')

// Resets when a refresh lands, because the tree under a caught error is gone
// and a refreshed component would have nothing to swap into.
module.exports = class ErrorBoundary extends Component {
  constructor(props) {
    super(props)

    this.state = { error: null }

    this._release = null
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    refresh.report(error, { href: this.props.href })

    if (this.props.onError) this.props.onError(error, info)
  }

  componentDidMount() {
    this._release = failures.subscribe((failure) => {
      if (failure === null) this.setState({ error: null })
    })
  }

  componentWillUnmount() {
    if (this._release !== null) this._release()
  }

  render() {
    const { error } = this.state

    if (error === null) return this.props.children

    const { fallback = null } = this.props

    return typeof fallback === 'function' ? fallback(error) : fallback
  }
}
