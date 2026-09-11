<p align="center">
  <strong><kbd>English</kbd></strong>
  ·
  <a href="https://github.com/LoseYoung/loseyoung-digital-islands/tree/doc-zh"><kbd>简体中文</kbd></a>
  ·
  <a href="https://github.com/LoseYoung/loseyoung-digital-islands/tree/doc-ja"><kbd>日本語</kbd></a>
</p>

# LoseYoung · Digital Islands

> Somewhere Between Real and Imagined

Digital Islands is LoseYoung's personal web portal and a continuously growing index of creative work. Each “island” is an independent site for photography, games, imagined worlds, or future experiments. The portal is not designed to flatten them into one product. Instead, it behaves more like an exhibition catalogue: different worlds, gathered under one entrance while keeping their own identities.

This repository contains the portal homepage, island index, visual motion system, responsive layout, sharing metadata, and deployment configuration. The business logic and actual content of each island remain in their own projects.

**Live**

- [OpenAI Sites · Digital Islands](https://loseyoung-digital-islands.lzy793222567.chatgpt.site)
- [GitHub Pages · Digital Islands](https://loseyoung.github.io/loseyoung-digital-islands/)

## Current Experience

### Moonlit Hero

The first screen uses a real moonlit-ocean photograph as the visual anchor, with restrained exhibition-style motion layered on top.

- The moonlight entering from the upper-right is built from several light bands and continues to breathe and drift while the page is idle.
- As the Hero scrolls away, the light direction, position, and spread change more noticeably, while the sea reflection, moon haze, and horizon glow respond with it.
- The title and introduction enter slowly with a subtle parallax treatment, then recede as the page scrolls.
- The active background image is `public/moonlit-ocean-pramod-tiwari.jpg`. Earlier generated backgrounds are still kept in `public/` as historical assets, but they are no longer used as the main Hero artwork.

### Transparent Ripple Interaction

Below the Hero, the interface returns to a clean deep blue-black background with a full-screen WebGL2 ripple layer.

- Ripples are simulated with a double-buffer height field rather than DOM circles or a mouse trail.
- Pointer movement only injects local disturbances; the wave field itself handles propagation, interference, and decay.
- The current visual target is transparent glass / moonlit water: the body of the effect is nearly invisible, leaving mostly silver-blue, cold cyan, and a very subtle violet refraction.
- Ripple intensity grows gradually as the page moves from the Hero into the body instead of switching between two abrupt opacity levels.
- Simulation resolution, pointer sampling, and idle shutdown are intentionally limited for performance. Touch devices and reduced-motion environments receive a simplified fallback.

### Single-Row Island Index

Selected Islands has moved away from a three-column card wall to a more scalable **Media Object / Editorial Project Index**.

- Each island occupies one complete row. On desktop, the cover sits on the left and the number, category, title, description, and link sit on the right.
- Islands 4, 5, 6, and beyond can simply be appended vertically, without any dependency on multiples of three.
- Covers are always shown in full with `object-fit: contain`; the layout does not crop or artificially zoom artwork into a shared aspect ratio.
- Cover width is capped at roughly 720px on desktop, scales down proportionally at intermediate widths, and stacks above the copy on narrow screens.
- The island section uses the same page margins as the Hero, keeping the visual baseline continuous while scrolling.
- Island descriptions are intentionally richer than one-line taglines so each entry carries more narrative and context.

### Motion and Accessibility

- Core content is rendered first; motion is progressive enhancement. Main content and navigation remain readable without JavaScript.
- A `Motion on / off` control lets visitors pause or enable motion and remembers the choice.
- The default behavior follows the system `prefers-reduced-motion` setting.
- Some continuous animation pauses when the page is in the background to avoid unnecessary GPU work.
- Images include alternative text, and in-page navigation, focus, and anchor jumps retain basic accessibility handling.

## Open Islands

| Island | Type | Summary | Link |
| --- | --- | --- | --- |
| Photos Island · A Softer Gaze | Photography | A growing personal image archive collecting travel, cities, nature, and accidental encounters, allowing memory to settle slowly through photographs. | [Enter Photos Island](https://photos-island.lzy793222567.chatgpt.site/) |
| Faerie Britain Echoes · Another Reality | Fantasy / RPG | A space for preserving the echoes of Faerie Britain, its characters, and its journeys, reassembling the atmosphere that remains after the story ends. | [Enter Faerie Britain Echoes](https://faerie-britain-echoes.lzy793222567.chatgpt.site/) |
| Gridwake · Further Out | Sci-Fi / FPS | A colder, sharper digital territory shaped by the rhythm of sci-fi and FPS design, bringing together combat, space, residual order, and unfamiliar environments. | [Enter Gridwake](https://digital-island-gridwake.lzy793222567.chatgpt.site/) |

Island names, descriptions, covers, and destinations are maintained centrally in `app/islands.ts`. The portal is responsible for presentation and navigation only; it does not perform live availability monitoring of the external island sites.

## Tech Stack

| Category | Current stack |
| --- | --- |
| UI | React 19.2.6, TypeScript 5.9.3 |
| Routing / Rendering | Next.js 16.2.6 App Router; vinext 0.0.50 on the Sites build path |
| Build | Vite 8.0.13, Cloudflare Vite plugin |
| Styling | Custom CSS, Tailwind CSS 4.2.1 / PostCSS |
| Motion | CSS Transform / Opacity, IntersectionObserver, requestAnimationFrame, WebGL2 height-field ripples |
| Hosting | OpenAI Sites / Cloudflare Workers, GitHub Pages |
| Checks | ESLint 9, Node.js built-in test runner |
| Optional foundation | Drizzle ORM / Kit, Cloudflare D1 / R2, ChatGPT auth helper |

The default development and Sites build commands use `vinext`. `build:pages` uses a Next.js static export to produce the GitHub Pages version. D1, R2, and the login helper are not currently connected to the homepage experience.

## Project Structure

```text
.
├── app/
│   ├── page.tsx                  # Hero, curatorial note, island index, future index, footer
│   ├── islands.ts                # Island data, descriptions, covers, URLs, automatic numbering
│   ├── catalogue-motion.tsx      # Scroll progress, reveals, Motion toggle, moonlight variables
│   ├── fluid-cursor.tsx          # WebGL2 double-buffer ripple simulation
│   ├── globals.css               # Base visual system and shared responsive styles
│   ├── exhibition-motion.css     # Hero, section, sea, and exhibition-style motion
│   ├── ambient-background.css    # Dark body background and ripple canvas layering
│   ├── hero-light-motion.css     # Moonlight breathing, scroll deflection, sea response
│   ├── island-index.css          # Single-row cover + description layout
│   ├── layout.tsx                # Metadata and style entry point
│   ├── fonts/                    # Local fonts and licenses
│   └── chatgpt-auth.ts           # Reserved ChatGPT auth helper
├── public/
│   ├── moonlit-ocean-pramod-tiwari.jpg # Current Hero photograph
│   ├── photos-island.png         # Photos Island cover
│   ├── faerie-britain.png        # Faerie Britain Echoes cover
│   ├── gridwake.png              # Gridwake cover
│   ├── og.png                    # Open Graph image
│   ├── quiet-horizon.webp        # Legacy Hero asset, currently unused
│   └── moonlit-ocean-4k.svg      # Legacy generated background, currently unused
├── worker/
│   └── index.ts                  # Worker request handling and image optimization entry
├── build/
│   └── sites-vite-plugin.ts      # Sites build helper
├── .openai/
│   └── hosting.json              # OpenAI Sites project binding and optional resources
├── db/
│   ├── index.ts                  # Optional D1 / Drizzle access helpers
│   └── schema.ts                 # No business tables at present
├── drizzle/                      # Database migration metadata
├── .github/workflows/pages.yml  # GitHub Pages build and deployment
├── scripts/build-pages.mjs       # Pages static export and publish URL handling
├── tests/
│   ├── rendered-html.test.mjs    # Sites / server-rendered output checks
│   └── pages-export.test.mjs     # Pages export checks
├── README.md                     # English README on main
├── vite.config.ts
├── next.config.ts
├── eslint.config.mjs
├── postcss.config.mjs
├── tsconfig.json
├── tsconfig.pages.json
├── package.json
└── package-lock.json
```

## Local Development

### Requirements

- Node.js **>= 22.13.0**
- npm
- Git

### Start the development server

```bash
git clone https://github.com/LoseYoung/loseyoung-digital-islands.git
cd loseyoung-digital-islands
npm ci
npm run dev
```

The current homepage does not require a database, object storage, login configuration, or any mandatory business environment variables.

### Common commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the vinext development server |
| `npm run build` | Build the OpenAI Sites production output |
| `npm run build:pages` | Generate the GitHub Pages static export in `out/` |
| `npm run test:pages` | Validate the Pages export and asset paths |
| `npm start` | Start the production preview after building |
| `npm run lint` | Run ESLint |
| `npm test` | Build first, then run portal HTML and resource checks |
| `npm run db:generate` | Generate Drizzle migrations only after introducing DB schema changes |

Recommended before committing:

```bash
npm run lint
npm test
npm run build:pages
npm run test:pages
```

## Content Maintenance

To add or update an island, edit `app/islands.ts`:

```ts
{
  id: "new-island",
  title: "Project Title",
  description: "Write a fuller island summary here instead of a one-line tagline.",
  name: "New Island",
  category: "Category",
  url: "https://example.com/",
  cover: "/new-island.png",
  coverAlt: "Alternative text for the cover image",
}
```

Then add the cover to `public/`. Catalogue numbering continues automatically, and the single-row index simply grows downward without requiring a complete grid row.

Other common entry points:

- Page structure and static copy: `app/page.tsx`
- Island index layout: `app/island-index.css`
- Hero and section motion: `app/exhibition-motion.css`
- Moonlight motion: `app/hero-light-motion.css`
- WebGL ripples: `app/fluid-cursor.tsx`
- Ripple layering and body background: `app/ambient-background.css`
- Metadata and sharing information: `app/layout.tsx`

## Deployment

### OpenAI Sites

`.openai/hosting.json` is linked to the existing “LoseYoung · Digital Islands” project. The current portal does not require D1 or R2; actual deployment resources and project bindings are managed by Sites.

A GitHub commit and a Sites deployment are separate steps. Updating the repository does not automatically replace the existing Sites version; the corresponding Sites workflow must rebuild and redeploy it.

### GitHub Pages

The repository includes `.github/workflows/pages.yml`. A push to `main` automatically installs dependencies, builds the project, performs the static export, checks assets, and deploys GitHub Pages.

To generate the same static version locally:

```bash
npm ci
npm run build:pages
npm run test:pages
```

The default Pages base path is `/loseyoung-digital-islands`. The export scripts and tests handle covers, fonts, scripts, styles, and sharing assets under that subpath.

## Current Status

- Version: **0.1.0**
- Three islands are currently open, with a More to Arrive section reserved for future work.
- The homepage now includes a moonlit photographic Hero, dynamic moonlight, transparent WebGL ripples, scroll-progressive ripple intensity, and a single-row island index.
- Portal content is still maintained directly in source code; there is no CMS, user account system, photo upload flow, or business database.
- `db/`, Drizzle, D1 / R2, and `app/chatgpt-auth.ts` are foundations for future extension, not currently active product features.
- New islands can be added primarily through `app/islands.ts` and `public/` without redesigning the catalogue layout.

## Design Notes

The current visual direction is a personal exhibition catalogue built around **night ocean × starlight**. Real photography carries the emotion of the Hero, the body returns to a restrained deep blue-black, and motion is limited to a few layers such as moonlight, sea response, and transparent ripples. Compared with the earlier three-column card wall and colorful ambient background, the current design emphasizes negative space, continuous reading, and long-term extensibility.

`docs/curated-homepage.md` records the earlier evolution of the curated homepage and motion system. Some layout and asset notes there have been superseded by later iterations; the current `app/` implementation and this README are the source of truth.