# BookKit

The books you have read, are reading and want to read, with the short notes and quotes you take along the way.
One of the [KitShelf](https://kitshelf.app) kits: free, no account, works offline, and the data stays on the device,
backed up as a file. It will live at `https://book.kitshelf.app`; it is not published yet.

Built from [kit-template](https://github.com/TolgaSenerHollyPalm/kit-template) on
[kitshelf-ui](https://github.com/TolgaSenerHollyPalm/kitshelf-ui), which brings the theme, the components and the
backups. The designs are in `docs/design/bookkit/`; the plan it is built from is `docs/plans/02-bookkit/PLAN.md` in
the quiz-trip repository.

## Development

Requires Node 26 (see `.github/workflows/deploy.yml`).

```bash
npm install
npm run dev        # http://localhost:5175/
npm test           # unit tests (Vitest)
npm run lint       # oxlint
npm run build      # type-check + production build into dist/
npm run preview    # serve dist/ with the service worker at http://localhost:4175/
```

The ports come from `.env` and are BookKit's own: on a port another kit has used, that kit's service worker would
open instead. The service worker only runs in the production build, so test offline behaviour with
`npm run build && npm run preview`.

## Where things are

| Path | What |
| --- | --- |
| `.env` | The kit's id, name, description and ports; `kit.config.ts` checks them and stops the build on a bad value. |
| `src/kit.ts` | The same identity for the code, and `KEYS`: every localStorage key, all starting with `bookkit-`. |
| `src/kit.css` | BookKit's colour: four tokens in both schemes, over kitshelf-ui's defaults. |
| `public/favicon.svg`, `scripts/generate-icons.sh` | The icon and the PNGs made from it and from the maskable drawing in `docs/design/bookkit/icons/`. |
| `src/books/` | What a book is and the rules around it: states, dates in Turkish, matching, ISBNs, notes, the drawn cover. Tested, no UI. |
| `src/storage/` | IndexedDB (`books`, `covers`) through `idb`, the migration steps, and what "Tüm verileri sil" removes. |
| `src/app/`, `src/screens/`, `src/ui/` | The app shell and the router; the library, a book's page, the add and edit forms, the note sheet; BookKit's own parts. |
| `.github/workflows/deploy.yml` | Tests, builds and publishes to GitHub Pages; started by hand until the release. |

## Icons

`public/favicon.svg` is the app icon and the mark on the home screen. After changing it, regenerate the PNGs (macOS
only, uses the built-in `sips`):

```bash
npm run icons -- docs/design/bookkit/icons/bookkit-maskable.svg
```
