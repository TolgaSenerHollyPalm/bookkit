import { go, useHash } from 'kitshelf-ui/app/hashRouter.ts'
import { TABS, type Tab } from '../books/library.ts'

// Routes live in the URL hash, so GitHub Pages only ever serves index.html.
export type Route =
  | { screen: 'home'; tab?: Tab } // without a tab the library opens on the first one that has a book
  | { screen: 'settings' }
  | { screen: 'add' }
  | { screen: 'add-manual'; title?: string; isbn?: string } // what the search was for, to start the form with
  | { screen: 'book'; bookId: string }
  | { screen: 'book-edit'; bookId: string }

export function href(route: Route): string {
  switch (route.screen) {
    case 'home':
      return route.tab ? `#/?tab=${route.tab}` : '#/'
    case 'settings':
      return '#/settings'
    case 'add':
      return '#/add'
    case 'add-manual': {
      const typed = new URLSearchParams()
      if (route.title) typed.set('title', route.title)
      if (route.isbn) typed.set('isbn', route.isbn)
      const query = typed.toString()
      return query ? `#/add/manual?${query}` : '#/add/manual'
    }
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
  const params = new URLSearchParams(search)
  if (section === 'settings') return { screen: 'settings' }
  if (section === 'add' && id === 'manual') {
    const route: Route = { screen: 'add-manual' }
    const [title, isbn] = [params.get('title'), params.get('isbn')]
    if (title) route.title = title
    if (isbn) route.isbn = isbn
    return route
  }
  if (section === 'add') return { screen: 'add' }
  if (section === 'book' && id) return page === 'edit' ? { screen: 'book-edit', bookId: id } : { screen: 'book', bookId: id }
  const tab = params.get('tab') as Tab
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
