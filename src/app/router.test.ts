import { describe, expect, it } from 'vitest'
import { href, parseRoute, screenKey, type Route } from './router.ts'

describe('routes', () => {
  it.each<Route>([
    { screen: 'home' },
    { screen: 'home', tab: 'want' },
    { screen: 'home', tab: 'read' },
    { screen: 'settings' },
    { screen: 'add' },
    { screen: 'add-manual' },
    { screen: 'add-manual', title: 'Roma’nın Beş Günü? & başka' },
    { screen: 'add-manual', isbn: '9789750868702' },
    { screen: 'book', bookId: 'a1b2' },
    { screen: 'book', bookId: 'ç/ş ?' },
    { screen: 'book-edit', bookId: 'a1b2' },
  ])('survive a round trip through the URL: %o', (route) => {
    expect(parseRoute(href(route))).toEqual(route)
  })

  it('falls back to the library for unknown or broken addresses', () => {
    expect(parseRoute('')).toEqual({ screen: 'home' })
    expect(parseRoute('#/nowhere')).toEqual({ screen: 'home' })
    expect(parseRoute('#/?tab=nope')).toEqual({ screen: 'home' })
    expect(parseRoute('#/book')).toEqual({ screen: 'home' })
    expect(parseRoute('#/book/%E0%A4%A')).toEqual({ screen: 'home' })
    expect(parseRoute('#/book/x/unknown')).toEqual({ screen: 'book', bookId: 'x' })
  })

  it('tells the search from the form that adds by hand', () => {
    expect(parseRoute('#/add')).toEqual({ screen: 'add' })
    expect(parseRoute('#/add/manual?title=Bekle+Beni')).toEqual({ screen: 'add-manual', title: 'Bekle Beni' })
    expect(parseRoute('#/add/manual?title=')).toEqual({ screen: 'add-manual' })
  })

  it('counts the library as one screen whatever its tab', () => {
    expect(screenKey({ screen: 'home', tab: 'want' })).toBe(screenKey({ screen: 'home' }))
    expect(screenKey({ screen: 'book', bookId: 'a' })).not.toBe(screenKey({ screen: 'book', bookId: 'b' }))
  })
})
