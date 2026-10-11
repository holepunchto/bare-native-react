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

Calls `onPress` when a pointer goes down and back up inside it. Takes `onPress`, `onPressIn`, `onPressOut`, `style` and `children`.

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
