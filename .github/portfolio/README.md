# Portfolio studio redesign

The site is a static website served by GitHub Pages at `majdhijazin.com`.
Spaceship manages the domain; this change preserves the existing `CNAME`.

## Editing

- Shared visual styles: `studio-assets/site.css`.
- Search, menu and browser-local email preparation: `studio-assets/site.js`.
- Product and TV entries: `.github/portfolio/catalogue.py`.
- Page templates, games and additional catalogue entries: `.github/portfolio/build.py`.

From the repository root, rebuild the static pages with:

```sh
python3 .github/portfolio/build.py .
```

The original `night-shift.html`, `prompt-runner.html`, `hangman.html` and
`dawwar.html` pages are retained. They are linked from the new collection.
Public product links are used where supported by the existing product catalogue.
Private builds and TV prototypes lead to enquiries rather than a purchase flow.
The contact form prepares a mailto draft; it does not send or store submissions.

## Assets

Google Sans is self-hosted as subset WOFF2 files. Its license is included in
`studio-assets/GoogleSans-OFL.txt`. Existing product screenshots are retained;
`retainly-current.png` captures the public product demonstration on retainly.dev.
Game images come from the owner's public SHT Games website. TV icons come from
the owner's existing local TV assets. The limestone image is AI-generated
editorial artwork; it is not a photograph of a claimed location or project.
The composite TV preview is illustrative, using the real collection's icons.

## Validation completed

- JavaScript syntax check.
- Local references and image descriptions across all 49 generated pages.
- Desktop review and mobile review at 390px and 320px.
- Mobile menu, category filtering, search, no-results state and reset.
- TV project enquiry preselection and mailto draft generation, without sending.
- No horizontal overflow on the checked mobile layouts after the header fix.
- No unrounded or broken images on the checked main pages and TV detail page.

## Image-generation brief

Built-in image-generation tool: create a portrait editorial photograph of
contemporary pale limestone architecture inspired by Amman, with a courtyard,
floating stairs, a curving passage, an olive tree and soft morning shadows.
Use ivory and limestone tones, with open space for separately implemented UI.
No people, text, logos, devices or product claims. Round the asset in website CSS.
