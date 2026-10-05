# bare-native-react

React renderer for <https://github.com/holepunchto/bare-native>. A component tree renders as real native views, laid out by Yoga and positioned by `bare-native`, with no bridge and no serialization.

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

Holds other elements, and is the one element that reports the pointer: `onPointerDown`, `onPointerMove`, `onPointerUp` and `onPointerCancel`, each with `{ x, y, button, pointerId, pointerType }` relative to the view.

#### `<text>`

Takes its content as a single string or number child. Text is measured by the platform's own text engine and that measurement is what drives the layout, so a text node sizes to its content and rewraps when the space it is given changes.

#### `<image>`

Draws the image file at the path in `source`. It reports `onLoad` with the natural size of the image once it has been decoded, and `onError` if it cannot be. `resizeMode` in its style picks how the image fills its box, one of `cover`, `contain`, `stretch` or `center`, and `tintColor` recolors it on macOS, iOS and Android.

#### `<text-input>`

An editable field. Takes `value`, `placeholder`, `editable` and `selection`, and the keyboard hints `keyboardType`, `returnKeyType`, `autoCapitalize` and `autoCorrect`, which a platform ignores where it has no use for them. It reports `onChange` with the text, `onSelectionChange` with `{ start, end }`, `onKeyPress` with `{ text, start, end }`, `onSubmit` with the text when Return is pressed in a single line field, and `onFocus` and `onBlur`. `focus()` and `blur()` on a ref move the focus.

A field reports what the person typing does and never what is written to it, so a controlled input that writes `value` back on every `onChange` does not loop. `multiline` and `secureTextEntry` are settled when the field is made, so changing either is an error; key the element instead. A field cannot be both, and a secure field on Windows reports only `onChange`, `onFocus` and `onBlur`.

#### `<scroll-view>`

Lays its children out at their natural size along its axis and keeps a viewport over them. What scrolls is a box of its own, so `contentStyle` styles that box rather than the viewport, and `horizontal` picks the axis. The axis is settled when the view is made, because Android has a class per axis, so changing it is an error; key the element instead.

It reports `onScroll` with the offset it scrolled to, and `contentOffset` on a ref reads and writes it.

#### `<switch>`

An on and off toggle at the size of the platform's own. `value` is whether it is on and `enabled` whether it can be toggled. It reports `onChange` with the new value when the person toggles it, and never when `value` is written.

#### `<activity-indicator>`

A spinner. `animating` defaults to `true` and `size` is `small` or `large`. `color` in its style tints it everywhere but macOS.

#### `<web-view>`

Shows a web page and cannot contain children. `url` loads the page at a URL and `html` loads one from markup; whichever of the two last changed is what it shows. `inspectable` opens the page to the development tools of the platform, and on Android it applies to every web view in the application.

Each takes a `style` prop, described in <https://github.com/holepunchto/bare-native>, and `onLayout`, which reports the frame of the element whenever a layout pass moves or resizes it. Any other prop is an error rather than a warning, because a misspelled prop is otherwise invisible.

Each is also exported as a component of the same name, `View`, `Text`, `Image`, `TextInput`, `ScrollView`, `Switch`, `ActivityIndicator` and `WebView`, which is the form the components below are written in and the one React Native reads like:

```jsx
<View style={{ padding: 16 }}>
  <Text style={{ fontSize: 13 }}>Hello</Text>
</View>
```

A component is its element and nothing more. Its props go through untouched, the ref among them, so everything said about an element holds for both forms.

## Components

These are JavaScript over the elements above and are exported from this module.

#### `Pressable`

A press is a pointer going down and coming back up inside the same box, which is the same wherever the pointer came from. Takes `onPress`, `onPressIn`, `onPressOut`, `style` and `children`.

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

Renders the items around the viewport and holds the space the rest would take with a box at either end, so what a list builds follows the size of the window rather than the length of the data.

Beyond `data`, `renderItem` and `keyExtractor`, which defaults to an item's `key`, then its `id`, then its index: `horizontal`, `numColumns` and `columnWrapperStyle`, `initialNumToRender`, `windowSize` in viewports of items held ready, `onEndReached` and `onEndReachedThreshold`, `ListHeaderComponent`, `ListFooterComponent`, `ListEmptyComponent`, `ItemSeparatorComponent`, `onScroll` and `onLayout`, and `style` and `contentStyle` for the scroll view underneath.

`getItemLayout` answers where an item is without rendering it. Given one, the list stops listening for its items' frames altogether, and nothing shifts as they arrive.

Spacing between items is `ItemSeparatorComponent` and not a `gap`. A gap would put space between items that the list's offsets know nothing about.

A ref gives `scrollToOffset`, `scrollToIndex` and `scrollToEnd`, and `view`, which is the scroll view itself.

#### `SectionList`

Takes `sections`, each with `data`, an optional `key`, and an optional `renderItem` and `keyExtractor` of its own, plus `renderSectionHeader`, `renderSectionFooter` and `SectionSeparatorComponent`. The rest is `FlatList`'s.

Sections are flattened into one run, so a single window covers the whole list rather than one per section. Headers do not stick.

#### `VirtualizedList`

What the two above are built on, for data that is not an array. Takes `getItem` and `getItemCount` in place of reading one.

## JSX

Bare does not transform JSX, so an application compiles it itself. React's recommendation is the automatic runtime, which is the default in `@babel/preset-react` and does not need `React` in scope:

```json
{
  "sourceType": "script",
  "presets": [["@babel/preset-react", { "runtime": "automatic" }]]
}
```

`sourceType` matters. The transform emits a reference to `react/jsx-runtime`, and as an ES module import that is hoisted above everything else in the file, including the line that installs `process` below. Compiling as a script emits a `require` instead, which runs in order.

For the same reason an application keeps its entry separate from its components:

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

React selects its build by reading `process.env.NODE_ENV` when it loads, and Bare has no process global. An application therefore needs one in place before it requires React, which is what the entry above is for. Requiring this module without one is an error.

Leaving `NODE_ENV` unset selects React's development build and its warnings. Set it to `production` for release.

## License

Apache-2.0
