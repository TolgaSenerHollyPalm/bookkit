// Injected by `define` in vite.config.ts.
declare const __BUILD_TIME__: string

// The kit's identity from .env; vite.config.ts refuses to build without it.
interface ImportMetaEnv {
  readonly VITE_KIT_ID: string
  readonly VITE_KIT_NAME: string
  readonly VITE_KIT_DESCRIPTION: string
  /** Google Books API key, restricted to the app's own addresses; without it Google Books is not offered. */
  readonly VITE_GOOGLE_BOOKS_KEY?: string
}
