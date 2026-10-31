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

Google Sans is self-hosted, with its license included. Product cards use actual
product or website screenshots. Retainly and the dental chart use public demos
with fictional data. Rider Hub uses an anonymised product demonstration.
The TV collection uses original application captures, including an idle renderer
capture for Visualiser. Existing screenshots are retained for earlier private builds.
No project cards use monogram placeholders or AI-generated product interfaces.
The limestone hero artwork is generated editorial scenery.

## Validation

Rebuild with `python3 .github/portfolio/build.py .`. Check local references,
image assets, a single H1 per generated page, and JavaScript syntax. Review
catalogue search and filters, the mobile menu, and project pages at desktop,
390px and 320px. The native screenshot dialog must close with Escape and return
focus to its trigger. Contact drafts remain browser-local and require the visitor
to review and send through their own email app.

Poco Kids is pending a verified website URL and an original website screenshot.
It was not found in the connected Hostinger or Spaceship accounts.

## Image-generation brief

Built-in image-generation tool: create a portrait editorial photograph of
contemporary pale limestone architecture inspired by Amman, with a courtyard,
floating stairs, a curving passage, an olive tree and soft morning shadows.
Use ivory and limestone tones, with open space for separately implemented UI.
No people, text, logos, devices or product claims. Round the asset in website CSS.
