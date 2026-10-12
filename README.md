# bare-native-react

React renderer for <https://github.com/holepunchto/bare-native>. Components render as native views, laid out by Yoga and positioned by `bare-native`, with no bridge and no serialization.

```
npm i bare-native-react
```

## Usage

```js
const React = require('react')
const { Window } = require('bare-native')
const render = require('bare-native-react')

const { View, Text } = render

const h = React.createElement

function App() {
  return h(
    View,
    { style: { flexDirection: 'row', padding: 16, gap: 8 } },
    h(View, { style: { width: 120, backgroundColor: '#eee' } }),
    h(Text, { style: { fontSize: 13 } }, 'Hello')
  )
}

const window = new Window(600, 400)

render(h(App), window)

window.show()
```

Rendering into the same window again updates the tree in place. `render.unmount(window)` unmounts the tree, running the cleanup of every effect, and removes it from the window.

In a <https://github.com/holepunchto/bare-refresh> development build, the trees of a graph are unmounted when the graph is replaced by a reload. A module that accepts its own changes is evaluated again instead, so pass it as `module` to unmount its tree whenever it is disposed. Otherwise the old tree stays mounted and its effects keep running:

```js
render(h(App), window, { module })
```

`callback` in the same options is called once the render has been committed.

### Portals and anchoring

`render.useWindow()` returns the window the calling component was rendered into. `render.createPortal(children, target)` renders `children` into another node or window, while they stay part of the tree they came from for context and error boundaries. Children of a window are laid out in its content after any tree rendered into it, so position them absolutely. The window need not have a tree of its own. Children of a text node must be text, as in a nested `<text>`.

Every element takes `anchor`, which places it beside another node or a rectangle, as for a tooltip or a popover. `to` can be a ref, a node, a rectangle or a function returning one of them. The element flips to the other side when it does not fit, stays inside the border of its parent, and is hidden while its target is scrolled or clipped out of view. `match: 'width'` makes it as wide as its target, as for a menu below a button. An anchored element inside another follows it, which is how an arrow is drawn:

```js
function Tooltip({ to, children }) {
  const window = render.useWindow()

  return render.createPortal(
    h(
      View,
      {
        anchor: { to, side: 'top', offset: 8 },
        style: { position: 'absolute', padding: 6, borderRadius: 4, backgroundColor: '#333' }
      },
      h(View, {
        anchor: { to, side: 'top', offset: 4 },
        style: {
          position: 'absolute',
          width: 8,
          height: 8,
          backgroundColor: '#333',
          transform: [{ rotate: '45deg' }]
        }
      }),
      h(Text, { style: { color: '#fff' } }, children)
    ),
    window
  )
}

const button = useRef(null)

h(Pressable, { ref: button, onPress }, h(Text, null, 'Save'))
h(Tooltip, { to: button }, 'Saves the document')
```

## Elements

#### `<view>`

A container for other elements. It is the only element that reports pointer events: `onPointerDown`, `onPointerMove`, `onPointerUp` and `onPointerCancel`, each with `{ x, y, button, pointerId, pointerType }` relative to the view.

#### `<text>`

Takes a single string or number child. Text is measured by the platform text engine, so a text element sizes to its content and rewraps when its available space changes.

#### `<image>`

Draws the image file at the path in `source`. Reports `onLoad` with the natural size of the image once decoded, and `onError` if decoding fails. The `resizeMode` style sets how the image fills its box, one of `cover`, `contain`, `stretch` or `center`. The `tintColor` style recolors the image on macOS, iOS and Android.

#### `<text-input>`

An editable text field. Takes `value`, `placeholder`, `editable` and `selection`, as well as the keyboard hints `keyboardType`, `returnKeyType`, `autoCapitalize` and `autoCorrect`, which are ignored on platforms that don't support them.

Reports `onChange` with the text, `onSelectionChange` with `{ start, end }`, `onKeyPress` with `{ text, start, end }`, `onSubmit` with the text when Return is pressed in a single line field, and `onFocus` and `onBlur`. Call `focus()` and `blur()` on a ref to move focus.

Events are only reported for user input, not for changes to `value`, so a controlled input that sets `value` on every `onChange` won't loop.

`multiline` and `secureTextEntry` can't be changed after the field is created, so change the element `key` instead. A field can't be both, and on Windows a secure field only reports `onChange`, `onFocus` and `onBlur`.

#### `<scroll-view>`

Lays out its children at their natural size along the scroll axis and shows a scrollable viewport over them. `horizontal` sets the axis and `contentStyle` styles the scrolled content rather than the viewport. The axis can't be changed after the view is created, as Android uses a separate class per axis, so change the element `key` instead.

Reports `onScroll` with the new offset. Read and write `contentOffset` on a ref to get and set it.

#### `<switch>`

An on/off toggle at the platform's native size. `value` sets whether it is on and `enabled` whether it can be toggled. Reports `onChange` with the new value when the user toggles it, but not when `value` changes.

#### `<activity-indicator>`

A spinner. `animating` defaults to `true` and `size` is `small` or `large`. The `color` style tints it on all platforms except macOS.

#### `<web-view>`

Shows a web page and can't have children. `url` loads a page from a URL and `html` loads one from markup. If both are set, the one changed most recently wins. `inspectable` enables the platform developer tools for the page. On Android, it applies to every web view in the application.

All elements take a `style` prop, described in <https://github.com/holepunchto/bare-native>, and `onLayout`, which reports the frame of the element whenever layout moves or resizes it. Unknown props throw an error rather than log a warning, so typos don't go unnoticed.

Each element is also exported as a component: `View`, `Text`, `Image`, `TextInput`, `ScrollView`, `Switch`, `ActivityIndicator` and `WebView`. These read like React Native and are used in the examples below:

```jsx
<View style={{ padding: 16 }}>
  <Text style={{ fontSize: 13 }}>Hello</Text>
</View>
```

The components pass all props, including `ref`, straight through to the element, so the two forms behave the same.

## Components

These are built in JavaScript on top of the elements above.

#### `Pressable`

Calls `onPress` when a pointer goes down and back up inside it. Takes `onPress`, `onPressIn`, `onPressOut`, `style`, `anchor`, `ref` and `children`.

#### `FlatList`

```js
const { FlatList } = require('bare-native-react')

h(FlatList, {
  data: rows,
  renderItem: ({ item }) => h('text', { style: { height: 44 } }, item.label),
  keyExtractor: (item) => item.id,
  style: { flex: 1 }
})
```

Only renders the items near the viewport and uses spacers for the rest, so the amount of work depends on the window size rather than the length of the data.

Takes `data`, `renderItem` and `keyExtractor`, which defaults to the item `key`, then `id`, then index. Also takes:

- `horizontal`, `numColumns` and `columnWrapperStyle`
- `initialNumToRender`
- `windowSize`, measured in viewports
- `onEndReached` and `onEndReachedThreshold`
- `ListHeaderComponent`, `ListFooterComponent`, `ListEmptyComponent` and `ItemSeparatorComponent`
- `onScroll` and `onLayout`
- `style` and `contentStyle`, passed to the underlying scroll view

`getItemLayout` lets the list compute item positions without rendering them. When set, the list no longer measures items, so nothing shifts as they render.

Use `ItemSeparatorComponent` for spacing between items, not `gap`. The list doesn't account for `gap` when computing offsets.

A ref provides `scrollToOffset()`, `scrollToIndex()`, `scrollToEnd()` and `view`, the underlying scroll view.

#### `SectionList`

Takes `sections`, each with `data` and an optional `key`, `renderItem` and `keyExtractor`. Also takes `renderSectionHeader`, `renderSectionFooter` and `SectionSeparatorComponent`, plus all `FlatList` props.

Sections are rendered as one flat list with a single window. Headers aren't sticky.

#### `VirtualizedList`

The base for the two lists above, for data that isn't an array. Takes `getItem` and `getItemCount` instead of `data`.

## React DevTools

A development build can connect to the standalone React DevTools app, which shows the component tree and lets you inspect and edit props, state and hooks. Hovering a component in DevTools highlights it in the application, and the element picker selects the component under the next press. Attach `bare-native-react/devtools` to the host of a <https://github.com/holepunchto/bare-refresh> development build:

```js
loop({
  // ...
  attach: ['bare-native-react/devtools']
})
```

Then start the app with `npx react-devtools`. The host connects to it on `127.0.0.1:8097`, and connects again whenever the app is closed and reopened, so it can be started before or after the application. It also connects again after every reload, so DevTools starts over with the new graph.

On Android, the port must be forwarded from the device with `adb reverse tcp:8097 tcp:8097`.

The DevTools backend expects a browser, so the module defines `self` and `window` as the global object, as React Native does.

## JSX

Bare doesn't transform JSX, so applications must compile it themselves. React recommends the automatic runtime, which is the default in `@babel/preset-react` and doesn't require `React` in scope:

```json
{
  "sourceType": "script",
  "presets": [["@babel/preset-react", { "runtime": "automatic" }]]
}
```

`sourceType` must be `script`. The automatic runtime imports `react/jsx-runtime`, and ES module imports are hoisted above the rest of the file, including the line that sets up `process` below. Compiling as a script emits a `require` instead, which runs in order.

For the same reason, keep the entry point separate from the components:

`app.js`

```js
globalThis.process = { env: {} }

require('./ui')
```

`ui.jsx`

```jsx
const { Window } = require('bare-native')
const render = require('bare-native-react')

const window = new Window(760, 560)

render(<App />, window)

window.show()
```

## Notes

React reads `process.env.NODE_ENV` when loaded to select its build, but Bare has no `process` global. Applications must define one before requiring React, as in the entry point above. Requiring this module without it throws an error.

If `NODE_ENV` is unset, React uses its development build with warnings enabled. Set it to `production` for release builds.

## License

Apache-2.0
