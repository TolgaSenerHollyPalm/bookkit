import { go, useHash } from 'kitshelf-ui/app/hashRouter.ts'
import { TABS, type Tab } from '../books/library.ts'

// Routes live in the URL hash, so GitHub Pages only ever serves index.html.
export type Route =
  | { screen: 'home'; tab?: Tab } // without a tab the library opens on the first one that has a book
  | { screen: 'settings' }
  | { screen: 'add-manual' }
  | { screen: 'book'; bookId: string }
  | { screen: 'book-edit'; bookId: string }

export function href(route: Route): string {
  switch (route.screen) {
    case 'home':
      return route.tab ? `#/?tab=${route.tab}` : '#/'
    case 'settings':
      return '#/settings'
    case 'add-manual':
      return '#/add/manual'
    case 'book':
      return `#/book/${encodeURIComponent(route.bookId)}`
    case 'book-edit':
      return `#/book/${encodeURIComponent(route.bookId)}/edit`
  }
}

export function parseRoute(hash: string): Route {
  const [path, search = ''] = hash.replace(/^#/, '').split('?')
  let parts: string[]
  try {
    parts = path.split('/').filter(Boolean).map(decodeURIComponent)
  } catch {
    return { screen: 'home' }
  }
  const [section, id, page] = parts
  if (section === 'settings') return { screen: 'settings' }
  if (section === 'add' && id === 'manual') return { screen: 'add-manual' }
  if (section === 'book' && id) return page === 'edit' ? { screen: 'book-edit', bookId: id } : { screen: 'book', bookId: id }
  const tab = new URLSearchParams(search).get('tab') as Tab
  return TABS.includes(tab) ? { screen: 'home', tab } : { screen: 'home' }
}

/** What tells two screens apart: the library stays the same screen whichever tab its address names. */
export const screenKey = (route: Route): string => (route.screen === 'home' ? '#/' : href(route))

/** Goes to a route. `replace` swaps the current history entry, so the back button skips it. */
export function navigate(route: Route, options: { replace?: boolean } = {}): void {
  go(href(route), options)
}

export function useRoute(): Route {
  return parseRoute(useHash())
}
