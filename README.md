# BookKit

The books you have read, are reading and want to read, with the short notes and quotes you take along the way.
One of the [KitShelf](https://kitshelf.app) kits: free, no account, works offline, and the data stays on the device,
backed up as a file. It lives at [book.kitshelf.app](https://book.kitshelf.app).

Built from [kit-template](https://github.com/TolgaSenerHollyPalm/kit-template) on
[kitshelf-ui](https://github.com/TolgaSenerHollyPalm/kitshelf-ui), which brings the theme, the components and the
backups. The designs are in `docs/design/bookkit/`; the plan it is built from is `docs/plans/02-bookkit/PLAN.md` in
the quiz-trip repository.

## Development

Requires Node 26 (see `.github/workflows/deploy.yml`).

```bash
npm install
npm run dev        # http://localhost:5175/
npm test           # unit tests (Vitest), no network
npm run lint       # oxlint
npm run build      # type-check + production build into dist/
npm run preview    # serve dist/ with the service worker at http://localhost:4175/
```

The ports come from `.env` and are BookKit's own: on a port another kit has used, that kit's service worker would
open instead. The service worker only runs in the production build, so test offline behaviour with
`npm run build && npm run preview`.

Searching Google Books needs a key in `.env.local`, which git ignores:

```bash
VITE_GOOGLE_BOOKS_KEY=…
```

Without it the app works the same, only without the "Google Books’ta ara" button.

## Book search

`src/search/` asks [Open Library](https://openlibrary.org/developers/api) while the reader types (400 ms after the
last key, at least a second between requests, given up after 8 seconds) and tidies what comes back: records of the
same book are folded into one row, Turkish editions come first, and titles and authors are spelled the way the rest
of the library is. `docs/search-sources.md` has the measurements behind every rule; `scripts/compare-sources.mjs`
repeats them.

Open Library holds few books of the last two years, so under its results a button asks Google Books for the same
text. Google's [branding guidelines](https://developers.google.com/books/branding) shape that part: its results are a
list of their own, in its order and spelling, beside the "powered by Google" graphic and with a link to each book's
Google Books page, and a book added from Google links there too. What cannot be found is added by hand, starting
from what was typed.

The key is a browser key, restricted in Google Cloud to `https://book.kitshelf.app/*`, `http://localhost:5175/*` and
`http://localhost:4175/*` and to the Books API. It ends up in the published JavaScript, as any browser key does; the
restrictions are what protect it. The project has no billing account, so going over the daily quota only makes
Google refuse until the next day.

## Covers

A book's `coverUrl` says where its cover comes from. Covers from `covers.openlibrary.org` are downloaded once and
kept in IndexedDB (`covers`, keyed by the book's id, as bytes); a 404 takes the address off the book without marking
it as changed, and a failed download is tried again when the app opens or the connection returns. Google sends its
covers without a CORS header, so a book added from Google shows its cover only while online. A book without a cover
gets one drawn from its title (`src/books/cover.ts`).

## Backups

`Ayarlar › Yedeği kaydet` writes `bookkit-yedek-<date>.json` through kitshelf-ui's backup format: kit `bookkit`, data
version 1, `data: { books }` with each book's notes inside and its `coverUrl`, but no pictures, so the file stays
small. Restoring merges book by book (the newer `updatedAt` wins, deletions do not travel) or replaces everything;
a stored cover stays only while its book still names the address it came from, and the missing ones are downloaded
afterwards. `src/backup/` holds the kit's side: the texts, the checks a file has to pass, and the restore plan.

## Where things are

| Path | What |
| --- | --- |
| `.env` | The kit's id, name, description and ports; `kit.config.ts` checks them and stops the build on a bad value. |
| `src/kit.ts` | The same identity for the code, and `KEYS`: every localStorage key, all starting with `bookkit-`. |
| `src/kit.css` | BookKit's colour: four tokens in both schemes, over kitshelf-ui's defaults. |
| `public/favicon.svg`, `scripts/generate-icons.sh` | The icon and the PNGs made from it and from the maskable drawing in `docs/design/bookkit/icons/`. |
| `src/books/` | What a book is and the rules around it: states, dates in Turkish, matching, ISBNs, notes, the drawn cover. |
| `src/search/` | Open Library and Google Books: the requests, the tidying, the search screen's state, recorded answers for the tests. |
| `src/covers/` | Which covers to download, and how. |
| `src/backup/` | The backup adapter and the restore plan. |
| `src/storage/` | IndexedDB (`books`, `covers`) through `idb`, the migration steps, and what "Tüm verileri sil" removes. |
| `src/app/`, `src/screens/`, `src/ui/` | The app shell and the router; the library, the search, a book's page, the forms, the note sheet, the settings. |
| `scripts/compare-sources.mjs` | The source comparison behind `docs/search-sources.md`; run by hand, not part of the app. |
| `.github/workflows/deploy.yml` | Tests, builds and publishes to GitHub Pages on every push to `main`. |

## Publishing

A push to `main` runs `.github/workflows/deploy.yml`: `npm ci`, the tests, the build and the upload to GitHub Pages.
The build takes the Google Books key from the repository secret `VITE_GOOGLE_BOOKS_KEY`, so this public
repository's logs mask it. The custom domain `book.kitshelf.app` is a CNAME to `tolgasenerhollypalm.github.io` in
Cloudflare, DNS only, set in the repository's Pages settings; no CNAME file is needed with an Actions deployment.
Pages serves files with `cache-control: max-age=600`, so a deploy can take up to ten minutes to show.

## Icons

`public/favicon.svg` is the app icon and the mark on the home screen. After changing it, regenerate the PNGs (macOS
only, uses the built-in `sips`):

```bash
npm run icons -- docs/design/bookkit/icons/bookkit-maskable.svg
```
