# Frank Bach portfolio, self-hosted

A one-to-one static copy of the Webflow site (`frank-bach-staging.webflow.io`,
last published Jul 20 2026). No CMS, no build step, no external requests: every
page, stylesheet, script, font, image and video is in this folder. Open
`index.html` or point any static host (Netlify, Vercel, GitHub Pages, S3, nginx)
at this directory.

## What is here

| Path | What |
|---|---|
| `index.html`, `about.html`, `projects.html`, `courses.html`, `contact.html` | The five main pages |
| `projects/*.html` | The five case studies (anthropic, doordash, headspace, instagram, redbull) |
| `projects/template.html` | Annotated copy of a case study to start new project pages from |
| `404.html`, `401.html` | Utility pages (background video) |
| `style-guide.html` | Private design-system reference: every token, type style, component, utility and behavior, rendered with the site's own CSS. `noindex`, not linked from the nav. |
| `assets/css/*.css` | The Webflow stylesheet, URLs rewritten to local files |
| `assets/js/*.js` | Webflow runtime (`webflow.schunk…` shared, plus one bundle per page) |
| `assets/gsap/3.15.0/` | GSAP, ScrollTrigger, SplitText, DrawSVGPlugin |
| `assets/vendor/lenis_1.3.11/` | Lenis smooth scroll |
| `assets/d3e54v103j8qbb.cloudfront.net/js/jquery-3.5.1.min.js` | jQuery (Webflow dependency) |
| `assets/*.woff2` | PP Neue Montreal Medium, Mondwest, PP Neue Bit Bold |
| `assets/*` | All images (with the responsive `-p-500/-800/-1080` variants), SVG masks, favicon, videos |
| `.mirror-manifest.json` | Original CDN URL for every asset, in case you need to trace one back |

## Changes from the Webflow export

- All `cdn.prod.website-files.com`, `cloudfront.net` and `unpkg.com` references
  point at `assets/`. Subresource-integrity attributes were removed so you can
  edit the CSS.
- Internal links are relative (`/about` → `about.html`, `/projects/x` →
  `projects/x.html`). If your host serves clean URLs you can drop the
  `.html`, otherwise leave as is.
- The "Made in Webflow" badge is disabled in `assets/js/webflow.schunk….js`
  (the runtime injects it whenever the page is served from a non-webflow.io
  host). Nothing else in the runtime was touched.
- `style-guide.html`, `projects/template.html` and this README are new.

## Things to decide

- **Contact form.** The form on `contact.html` still carries Webflow's
  `data-wf-page-id` / `data-wf-element-id` and has no `action`; Webflow rejects
  submissions from other domains. Point it at Formspree, Netlify Forms, Basin,
  or your own endpoint: add `action="…"` and `method="post"`, and the
  `.w-form-done` / `.w-form-fail` blocks keep working.
- **Clean URLs.** If you want `/about` instead of `/about.html`, enable
  "pretty URLs" on your host (Netlify and Vercel do this by default) or add
  rewrite rules; no HTML changes needed.
- **404.** Tell your host that `404.html` is the not-found page.
- **Videos.** The 404 background video is 22 MB (mp4) + 30 MB (webm) as
  exported. Compress it if bandwidth matters.

## Adding a project page

1. Copy `projects/template.html` to `projects/<slug>.html`.
2. Edit `<title>` and the `name="description"` meta tag (the export has no `og:` tags; add them if you want link previews).
3. Inside `<main>`, each section has a comment saying what it is. Keep the ones
   you want, delete the rest, duplicate freely. The "Page recipe" section at the
   bottom of `style-guide.html` lists the building blocks.
4. Put images in `assets/` and reference them as `../assets/<file>`.
5. Add a card for it on `projects.html`: copy any `<div class="col col-lg-6
   col-xs-12 w-dyn-item">…</div>` block, change the link, image, eyebrow and
   title. Do the same inside the `.swiper` on `index.html` if it should appear
   on the home page.

## Adding any other page

Copy `about.html` (it loads the generic page bundle), replace the contents of
`<main class="page-main">`, keep everything else. The nav and footer are plain
HTML repeated on every page, so a change to them means editing each file (or
moving to a templating step later).

## Password gate

Every page in `projects/` is password-protected. The `projects.html` overview stays open.

- While locked, clicking any project card (on Home, Projects, Courses or a case study) opens a white "Private work" modal over the current page. The X, Escape or clicking outside closes it.
- Opening a project URL directly lands on `projects.html` with the modal open. The old `gate.html` address forwards there too.
- The right password continues to the project that was clicked. Access lasts 72 hours in that browser (`localStorage` key `fb-unlock`), then the modal asks again.
- The password is stored only as a SHA-256 hash: `PASS_HASH` in `assets/js/site.js` (section 0). It is checked in lowercase with spaces trimmed. To change it, replace the hash with the output of:
  `printf '%s' 'newpassword' | shasum -a 256`
- To lock a browser again before the 72 hours are up, open any page with `#lock` on the end of the address (or `?lock`).
- This is soft protection: the check runs in the browser and the project files are still on the server, so someone technical can reach them. For real protection, also turn on your host's password protection (Netlify, Vercel or Cloudflare Access).

## Other site-wide details

- All lines are solid: the Webflow stylesheet's dashed and dotted borders were switched to solid in `assets/css/frank-bach-staging.webflow.shared.ebbb69877.css`.
- Project thumbnails show a single glitched frame on hover and the clean photo otherwise. Change the effect with `<body data-thumb-hover="pixelate">` or `"dither"` (default `mosh`).
