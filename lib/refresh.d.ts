import { type Plugin } from 'bare-refresh/hot'

/**
 * The `bare-refresh` plugin that refreshes React components in place. It installs the React
 * development tools hook when it loads, so it must be required before the renderer.
 */
declare const plugin: Required<Plugin>

export = plugin
