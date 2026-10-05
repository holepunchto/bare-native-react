const {
  ActivityIndicator,
  Image,
  ScrollView,
  Switch,
  Text,
  TextFragment,
  TextInput,
  View,
  WebView
} = require('bare-native')

const refresh = require('bare-refresh/hot')

const { Reconciler, constants } = require('./react')

const props = require('./props')

const INTRINSICS = {
  view: View,
  text: Text,
  image: Image,
  'text-input': TextInput,
  'scroll-view': ScrollView,
  'web-view': WebView,
  switch: Switch,
  'activity-indicator': ActivityIndicator
}

let priority = constants.DefaultEventPriority

// A nested `<text>` is a run of the outer one rather than a box of its own.
const HOST_CONTEXT = { text: false }
const TEXT_CONTEXT = { text: true }

const SURVIVABLE = [
  'createInstance',
  'createTextInstance',
  'appendInitialChild',
  'appendChild',
  'appendChildToContainer',
  'insertBefore',
  'insertInContainerBefore',
  'removeChild',
  'removeChildFromContainer',
  'clearContainer',
  'commitUpdate',
  'commitTextUpdate',
  'resetTextContent',
  'hideInstance',
  'unhideInstance',
  'hideTextInstance',
  'unhideTextInstance'
]

// What the host answers with when a method throws. A view holds anything and a
// fragment holds any text, so the shape of the tree survives.
const FALLBACKS = {
  createInstance: () => new View(),
  createTextInstance: () => new TextFragment('')
}

const reconciler = Reconciler(
  survivable({
    supportsMutation: true,
    supportsPersistence: false,
    supportsHydration: false,
    supportsMicrotasks: true,
    isPrimaryRenderer: true,
    warnsIfNotActing: false,
    noTimeout: -1,

    rendererPackageName: 'bare-native-react',
    rendererVersion: require('../package.json').version,

    scheduleMicrotask: queueMicrotask,
    scheduleTimeout: setTimeout,
    cancelTimeout: clearTimeout,

    createInstance(type, properties, root, context) {
      if (context.text) {
        if (type !== 'text') throw new Error(`<${type}> cannot appear inside <text>`)

        const fragment = new TextFragment()

        props.fragment(fragment, {}, properties)

        return fragment
      }

      const Intrinsic = INTRINSICS[type]

      if (Intrinsic === undefined) throw new Error(`Unknown element <${type}>`)

      const constructed = props.CONSTRUCTED[type]

      const instance =
        constructed === undefined
          ? new Intrinsic()
          : new Intrinsic(options(constructed, properties))

      props.apply(instance, type, {}, properties)

      return instance
    },

    createTextInstance(text, root, context) {
      if (context.text === false) throw new Error('Text must be wrapped in a <text> element')

      return new TextFragment(text)
    },

    shouldSetTextContent(type, properties) {
      return (
        type === 'text' &&
        (typeof properties.children === 'string' || typeof properties.children === 'number')
      )
    },

    appendInitialChild(parent, child) {
      parent.appendChild(child)
    },

    appendChild(parent, child) {
      parent.appendChild(child)
    },

    appendChildToContainer(container, child) {
      container.view.appendChild(child)
    },

    insertBefore(parent, child, before) {
      parent.insertBefore(child, before)
    },

    insertInContainerBefore(container, child, before) {
      container.view.insertBefore(child, before)
    },

    removeChild(parent, child) {
      child.destroy()
    },

    removeChildFromContainer(container, child) {
      child.destroy()
    },

    clearContainer(container) {
      for (const child of container.view.children) child.destroy()
    },

    commitUpdate(instance, type, prev, next) {
      if (TextFragment.isTextFragment(instance)) props.fragment(instance, prev, next)
      else props.apply(instance, type, prev, next)
    },

    commitTextUpdate(instance, prev, next) {
      instance.text = next
    },

    commitMount() {},

    finalizeInitialChildren() {
      return false
    },

    resetTextContent(instance) {
      instance.text = ''
    },

    getRootHostContext() {
      return HOST_CONTEXT
    },

    getChildHostContext(parent, type) {
      return type === 'text' ? TEXT_CONTEXT : parent
    },

    getPublicInstance(instance) {
      return instance
    },

    prepareForCommit() {
      return null
    },

    resetAfterCommit(container) {
      container.window.layout()
    },

    preparePortalMount() {},

    detachDeletedInstance() {},

    hideInstance(instance) {
      if (TextFragment.isTextFragment(instance)) instance.hidden = true
      else instance.style = { ...instance.style, display: 'none' }
    },

    unhideInstance(instance, properties) {
      if (TextFragment.isTextFragment(instance)) instance.hidden = false
      else instance.style = { ...properties.style, display: undefined }
    },

    hideTextInstance(instance) {
      instance.hidden = true
    },

    unhideTextInstance(instance) {
      instance.hidden = false
    },

    resolveUpdatePriority() {
      return priority
    },

    setCurrentUpdatePriority(value) {
      priority = value
    },

    getCurrentUpdatePriority() {
      return priority
    },

    resolveEventType() {
      return null
    },

    resolveEventTimeStamp() {
      return -1.1
    },

    shouldAttemptEagerTransition() {
      return false
    },

    requestPostPaintCallback() {},

    trackSchedulerEvent() {},

    maySuspendCommit() {
      return false
    },

    startSuspendingCommit() {},

    suspendInstance() {},

    waitForCommitToBeReady() {
      return null
    },

    NotPendingTransition: null,
    HostTransitionContext: {
      $$typeof: Symbol.for('react.context'),
      Provider: null,
      Consumer: null,
      _currentValue: null,
      _currentValue2: null,
      _threadCount: 0
    },

    getInstanceFromNode() {
      return null
    },

    getInstanceFromScope() {
      return null
    },

    prepareScopeUpdate() {},

    beforeActiveInstanceBlur() {},

    afterActiveInstanceBlur() {},

    setFocusIfFocusable() {
      return false
    }
  })
)

// Lets the refresh runtime and the development tools find the renderer.
reconciler.injectIntoDevTools()

function options(names, properties) {
  const options = {}

  for (const name of names) options[name] = properties[name] === true

  return options
}

// A throw out of the host fails the commit, and the refresh runtime answers a
// failed commit by mounting the tree again, which fails again and spins. So
// the error is reported and React is given something it can carry on with.
function survivable(host) {
  for (const name of SURVIVABLE) {
    const method = host[name]
    const fallback = FALLBACKS[name]

    host[name] = function (...args) {
      try {
        return method.apply(this, args)
      } catch (err) {
        refresh.report(err)

        console.error(err.message)

        return fallback === undefined ? undefined : fallback()
      }
    }
  }

  return host
}

module.exports = reconciler
