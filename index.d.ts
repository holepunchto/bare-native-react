import { Component, ComponentType, ErrorInfo, ReactElement, ReactNode, Ref } from 'react'
import * as native from 'bare-native'

type Style = native.StyleSheet.Style
type StyleProp<S = Style> = native.StyleSheet.StyleProp<S>
type Frame = native.Node.Frame
type Point = native.Node.Point
type Size = native.Node.Size
type PointerEvent = native.View.PointerEvent
type Selection = native.TextInput.Selection
type KeyPressEvent = native.TextInput.KeyPressEvent

interface ElementProps<T, S = Style> {
  style?: StyleProp<S>
  /** Called with the frame of the node whenever a layout pass moves or resizes it. */
  onLayout?: (frame: Frame) => void
  ref?: Ref<T>
}

interface ViewProps extends ElementProps<native.View, native.StyleSheet.ViewStyle> {
  onPointerDown?: (event: PointerEvent) => void
  onPointerMove?: (event: PointerEvent) => void
  onPointerUp?: (event: PointerEvent) => void
  onPointerCancel?: (event: PointerEvent) => void
  children?: ReactNode
}

interface TextProps extends ElementProps<native.Text, native.StyleSheet.TextStyle> {
  /** Limit the text to this many lines. `0` means no limit. */
  numberOfLines?: number | null
  /** How text past `numberOfLines` is cut. Defaults to `tail`. */
  ellipsizeMode?: 'tail' | 'clip' | null
  /**
   * A string or number, or nested `Text` elements. A nested `Text` is a run of the outer one and
   * takes only `style` and `children`.
   */
  children?: ReactNode
}

interface ImageProps extends ElementProps<native.Image, native.StyleSheet.ImageStyle> {
  /** The path of the image file. */
  source?: string | null
  /** Called with the intrinsic size of the image once it has been decoded. */
  onLoad?: (size: Size) => void
  /** Called if the image cannot be decoded. */
  onError?: (error: Error) => void
}

interface TextInputProps extends ElementProps<native.TextInput, native.StyleSheet.TextInputStyle> {
  value?: string | null
  placeholder?: string | null
  editable?: boolean
  selection?: { start: number; end?: number } | null
  keyboardType?: native.TextInput.KeyboardType | null
  returnKeyType?: native.TextInput.ReturnKeyType | null
  autoCapitalize?: native.TextInput.AutoCapitalize | null
  autoCorrect?: boolean
  /** Read when the input is made. Changing it afterwards is an error; key the element instead. */
  multiline?: boolean
  /** Read when the input is made. Changing it afterwards is an error; key the element instead. */
  secureTextEntry?: boolean
  onChange?: (text: string) => void
  onFocus?: () => void
  onBlur?: () => void
  onSubmit?: (text: string) => void
  onSelectionChange?: (selection: Selection) => void
  onKeyPress?: (event: KeyPressEvent) => void
}

interface ScrollViewProps extends ElementProps<native.ScrollView, native.StyleSheet.ViewStyle> {
  /** Read when the view is made. Changing it afterwards is an error; key the element instead. */
  horizontal?: boolean
  /** The style of the box the children are laid out in, rather than of the viewport. */
  contentStyle?: StyleProp<native.StyleSheet.ViewStyle>
  /** Called with the offset the view scrolled to. */
  onScroll?: (offset: Point) => void
  children?: ReactNode
}

interface WebViewProps extends ElementProps<native.WebView, native.StyleSheet.ViewStyle> {
  /** The URL of the page to load. */
  url?: string | null
  /** The HTML of the page to load. Of `url` and `html`, the one that last changed is shown. */
  html?: string | null
  /** Open the page to the development tools of the platform. Defaults to `false`. */
  inspectable?: boolean
}

interface SwitchProps extends ElementProps<native.Switch, native.StyleSheet.ControlStyle> {
  value?: boolean
  enabled?: boolean
  onChange?: (value: boolean) => void
}

interface ActivityIndicatorProps extends ElementProps<
  native.ActivityIndicator,
  native.StyleSheet.ActivityIndicatorStyle
> {
  /** Defaults to `true`. */
  animating?: boolean
  /** Defaults to `small`. */
  size?: 'small' | 'large' | null
}

interface PressableProps {
  /** Called when a pointer goes down and comes back up inside the box. */
  onPress?: (event: PointerEvent) => void
  onPressIn?: (event: PointerEvent) => void
  /** Called when the press ends, whether or not it was a press. */
  onPressOut?: (event: PointerEvent) => void
  onLayout?: (frame: Frame) => void
  style?: StyleProp<native.StyleSheet.ViewStyle>
  children?: ReactNode
}

interface ErrorBoundaryProps {
  /** What to render in place of the children once one of them has thrown. */
  fallback?: ReactNode | ((error: unknown) => ReactNode)
  onError?: (error: unknown, info: ErrorInfo) => void
  /** The module that a caught error is reported against. */
  href?: string | null
  children?: ReactNode
}

/** A component, or an element to render as is. */
type ComponentOrElement<P = {}> = ComponentType<P> | ReactElement | null

interface ListRenderItemInfo<ItemT> {
  item: ItemT
  index: number
}

interface ListHandle {
  scrollToOffset(offset: number): void
  scrollToIndex(index: number): void
  scrollToEnd(): void
  /** The scroll view underneath the list. */
  readonly view: native.ScrollView
}

interface ListProps {
  horizontal?: boolean
  /** How many items to render before anything has been laid out. Defaults to `10`. */
  initialNumToRender?: number
  /** How many viewports of items to keep rendered, centred on the visible one. Defaults to `3`. */
  windowSize?: number
  onEndReached?: ((info: { distanceFromEnd: number }) => void) | null
  /** How close to the end, in viewports, `onEndReached` is called. Defaults to `0.5`. */
  onEndReachedThreshold?: number
  ListHeaderComponent?: ComponentOrElement
  ListFooterComponent?: ComponentOrElement
  /** Rendered in place of the items when there are none. */
  ListEmptyComponent?: ComponentOrElement
  style?: StyleProp<native.StyleSheet.ViewStyle>
  contentStyle?: StyleProp<native.StyleSheet.ViewStyle>
  onScroll?: ((offset: Point) => void) | null
  onLayout?: ((frame: Frame) => void) | null
  ref?: Ref<ListHandle>
}

interface VirtualizedListProps<ItemT, DataT> extends ListProps {
  data: DataT
  getItem: (data: DataT, index: number) => ItemT
  getItemCount: (data: DataT) => number
  /**
   * The length of an item along the axis of the list. Given this, the list does not measure its
   * items.
   */
  getItemLayout?: ((data: DataT, index: number) => { length: number }) | null
  renderItem: (info: ListRenderItemInfo<ItemT>) => ReactNode
  keyExtractor: (item: ItemT, index: number) => string
  /** Rendered between items. Spacing between items belongs here rather than in a `gap`. */
  ItemSeparatorComponent?: ComponentType<{ leadingItem: ItemT; trailingItem: ItemT }> | null
}

interface FlatListProps<ItemT> extends ListProps {
  data?: readonly ItemT[]
  renderItem: (info: ListRenderItemInfo<ItemT>) => ReactNode
  /** Defaults to the `key` of an item, then its `id`, then its index. */
  keyExtractor?: (item: ItemT, index: number) => string
  /** With more than one column, `getItemLayout` and separators apply to rows. */
  numColumns?: number
  columnWrapperStyle?: native.StyleSheet.ViewStyle | null
  getItemLayout?: ((data: readonly ItemT[], index: number) => { length: number }) | null
  ItemSeparatorComponent?: ComponentType<{ leadingItem: ItemT; trailingItem: ItemT }> | null
}

type SectionBase<ItemT, SectionT = {}> = SectionT & {
  data?: readonly ItemT[]
  key?: string | number
  renderItem?: (info: SectionListRenderItemInfo<ItemT, SectionT>) => ReactNode
  keyExtractor?: (item: ItemT, index: number) => string
}

interface SectionListRenderItemInfo<ItemT, SectionT = {}> extends ListRenderItemInfo<ItemT> {
  section: SectionBase<ItemT, SectionT>
}

interface SectionListProps<ItemT, SectionT = {}> extends ListProps {
  sections?: readonly SectionBase<ItemT, SectionT>[]
  renderItem?: ((info: SectionListRenderItemInfo<ItemT, SectionT>) => ReactNode) | null
  renderSectionHeader?: ((info: { section: SectionBase<ItemT, SectionT> }) => ReactNode) | null
  renderSectionFooter?: ((info: { section: SectionBase<ItemT, SectionT> }) => ReactNode) | null
  /** Defaults to the `key` of an item, then its `id`, then its index. */
  keyExtractor?: (item: ItemT, index: number) => string
  /** Rendered between the items of a section. */
  ItemSeparatorComponent?: ComponentType | null
  /** Rendered between sections. */
  SectionSeparatorComponent?: ComponentType | null
}

/**
 * Render `element` into `window`, filling its content. Rendering into the same window again
 * updates the tree in place. `callback` is called once the render has been committed.
 */
declare function render(
  element: ReactNode,
  window: native.Window,
  callback?: (() => void) | null
): unknown

declare namespace render {
  export {
    type ActivityIndicatorProps,
    type ComponentOrElement,
    type ElementProps,
    type ErrorBoundaryProps,
    type FlatListProps,
    type Frame,
    type ImageProps,
    type KeyPressEvent,
    type ListHandle,
    type ListProps,
    type ListRenderItemInfo,
    type Point,
    type PointerEvent,
    type PressableProps,
    type ScrollViewProps,
    type SectionBase,
    type SectionListProps,
    type SectionListRenderItemInfo,
    type Selection,
    type Size,
    type Style,
    type StyleProp,
    type SwitchProps,
    type TextInputProps,
    type TextProps,
    type ViewProps,
    type VirtualizedListProps,
    type WebViewProps
  }

  /** Unmount the tree rendered into `window` and remove it from the window. */
  export function unmount(window: native.Window): void

  export function View(props: ViewProps): ReactElement
  export function Text(props: TextProps): ReactElement
  export function Image(props: ImageProps): ReactElement
  export function TextInput(props: TextInputProps): ReactElement
  export function ScrollView(props: ScrollViewProps): ReactElement
  export function WebView(props: WebViewProps): ReactElement
  export function Switch(props: SwitchProps): ReactElement
  export function ActivityIndicator(props: ActivityIndicatorProps): ReactElement

  /** A box that reports a press: a pointer going down and coming back up inside it. */
  export function Pressable(props: PressableProps): ReactElement

  /**
   * Renders `fallback` once a child has thrown while rendering, and its children again once a
   * refresh lands.
   */
  export class ErrorBoundary extends Component<ErrorBoundaryProps, { error: unknown }> {}

  /** A virtualized list of the items of an array. */
  export function FlatList<ItemT>(props: FlatListProps<ItemT>): ReactElement

  /** A virtualized list of sections, each with a header and a footer around its items. */
  export function SectionList<ItemT, SectionT = {}>(
    props: SectionListProps<ItemT, SectionT>
  ): ReactElement

  /**
   * A list that renders only the items around the viewport, for data that is not an array. What
   * `FlatList` and `SectionList` are built on.
   */
  export function VirtualizedList<ItemT, DataT>(
    props: VirtualizedListProps<ItemT, DataT>
  ): ReactElement

  export const StyleSheet: typeof native.StyleSheet
  export const Alert: typeof native.Alert
  export const Appearance: typeof native.Appearance
  export const Clipboard: typeof native.Clipboard
  export const Dimensions: typeof native.Dimensions
  export const Keyboard: typeof native.Keyboard
}

export = render
