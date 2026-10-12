import Refresh from 'bare-refresh'

interface DevToolsOptions {
  /** The host the React DevTools app listens on. Defaults to `127.0.0.1`. */
  host?: string
  /** The port the React DevTools app listens on. Defaults to `8097`. */
  port?: number
  /** How long to wait before connecting again, in milliseconds. Defaults to `2000`. */
  retry?: number
}

interface DevTools {
  /** Stop connecting to the React DevTools app, and drop the connection if there is one. */
  close(): void
}

/**
 * Connect the React DevTools app to every React tree the host builds, and connect again whenever
 * `refresh` reloads the graph. It installs the React development tools hook when it loads, so it
 * must be required before the renderer.
 */
declare function devtools(refresh: Refresh | null, opts?: DevToolsOptions): DevTools

export = devtools
