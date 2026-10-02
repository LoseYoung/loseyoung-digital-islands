<p align="center">
  <strong><kbd>English</kbd></strong> ·
  <a href="https://github.com/LoseYoung/loseyoung-digital-islands/tree/doc-zh"><kbd>简体中文</kbd></a> ·
  <a href="https://github.com/LoseYoung/loseyoung-digital-islands/tree/doc-ja"><kbd>日本語</kbd></a>
</p>

# LoseYoung · Digital Islands

> Somewhere Between Real and Imagined

Digital Islands is LoseYoung's personal portal and a growing exhibition catalogue. Each island is an independent world for photography, games, imagined places, or AI-assisted travel. The homepage gathers them without flattening their identities into one product.

This repository maintains the portal, its visual system and optional playable cover experiments. The actual games, photo collection and travel services remain in their separate projects.

[GitHub Pages](https://loseyoung.github.io/loseyoung-digital-islands/) · [Sites](https://loseyoung-digital-islands.lzy793222567.chatgpt.site)

## Current Experience

The photographic moonlit-ocean Hero retains breathing light bands, scroll-responsive moonlight and subtle sea reflections. Below it, the page returns to deep blue-black with transparent silver-blue water ripples. Each island occupies a single row, with a complete, uncropped cover on the left and its introduction on the right; narrow screens stack the two. The catalogue shares the Hero's margins.

### A star you can throw

Drag the star toward the sea and release it. Gesture speed changes the flight and one to six skips; a gentle drop makes one splash. A first-impact guide appears only while dragging. Brief contact light and bounded droplets precede the transparent perspective rings. After a round, try landing the last skip in the moonlit target. Click or Enter provides an alternative throw; Esc cancels.

### Playable islands

| Island | Cover experiment | Full project |
| --- | --- | --- |
| Photos Island · A Softer Gaze | Reveal a photograph with light, undo a stroke, fix a partial composition and save a PNG. | [Photography archive](https://photos-island.lzy793222567.chatgpt.site/) |
| Faerie Britain Echoes · Another Reality | Draw moon, spark and breeze runes. Their order changes a persistent forest scene. | [Fantasy / RPG](https://faerie-britain-echoes.lzy793222567.chatgpt.site/) |
| Gridwake · Further Out | Six-target aim practice with center hits, round statistics, same-sequence replay and challenge links. | [Sci-Fi / FPS](https://digital-island-gridwake.lzy793222567.chatgpt.site/) |
| RoamIsle · A Journey, in Conversation | Reorder a route, or try a fictional before-moonset journey with choices and different endings. | [AI travel / Agent](https://roamisle.lzy793222567.chatgpt.site/) |

The experiments are not embedded versions of the external applications. The photo exercise currently offers three framings of **one existing Pramod Tiwari photograph**, not three new photos or access to a personal library. Route costs and ferry deadlines are fictional game rules, not geography, transportation data or AI-generated travel advice.

Moon → breeze → spark illuminates the forest gate; moon → spark → breeze sends a constellation into the branches. Clear the spell sequence to experiment without erasing the rune journal. The route's free mode remains unrestricted; challenge mode exposes its rules and can end with an early letter, a watchkeeper's light or an overnight stop elsewhere.

### Continuity, not forced restarts

Closing a cover, switching experiments, scrolling away or hiding the tab pauses work and retains the current page session. Only **Restart** or unloading the page resets it. **Expand** uses a native modal dialog without duplicating the engine; Esc returns to the embedded size. Motion off removes animation rather than deleting the user's work.

Aim rounds interrupted by a pause or a field-size change are labeled interrupted practice. Comparisons require the same sequence, field and target size, input method, and uninterrupted rounds. Keyboard-assisted and mixed-input rounds are not compared with pointer precision. `?aim=v1-<uint32>` shares a sequence, not scores or a trusted leaderboard.

Session data stays in page memory; it does not survive a reload and is not synchronized across devices or between Pages and Sites. PNG generation happens in the browser without uploading brush strokes.

## Performance and Accessibility

Core content and external links remain server-rendered and readable without JavaScript. Engines are loaded separately on demand, one active experiment at a time. Pausing stops drawing, timers and pending feedback; retained content does not require a continuously running loop.

The full-screen water simulation uses a fixed 60Hz time step, at most three catch-up steps, a simulation long-edge cap of 460 and display cap of 1920. High-refresh screens therefore do not speed up the simulation. The star uses a separate, local Canvas 2D perspective surface rather than another full-screen WebGL simulation.

The Motion preference follows `prefers-reduced-motion` by default. Pointer, touch and keyboard alternatives are provided; disabled JavaScript hides experiment launch controls while keeping project navigation. Expanding uses native dialog focus behavior and explicit close controls. No audio, account system, iframe or new game-engine runtime dependency is required.

## Technology

| Area | Stack |
| --- | --- |
| UI | React 19.2.6, TypeScript 5.9.3 |
| Rendering | Next.js 16.2.6 App Router; vinext 0.0.50 for Sites |
| Build | Vite 8.0.13, Cloudflare Vite plugin |
| Styling | Custom CSS, Tailwind CSS 4.2.1 / PostCSS |
| Interaction | Canvas 2D, SVG, WebGL2, Pointer Events, requestAnimationFrame |
| Hosting | GitHub Pages static export; separate Sites / Cloudflare Workers build |
| Optional foundation | Drizzle, D1 / R2, ChatGPT auth helper; not active homepage features |

## Development and Checks

Requires Node.js **>=22.13.0**, npm and Git. The current portal needs no mandatory business environment variables, database, object storage or login configuration.

```bash
git clone https://github.com/LoseYoung/loseyoung-digital-islands.git
cd loseyoung-digital-islands
npm ci
npm run dev
```

| Command | Purpose |
| --- | --- |
| `npm run dev` | vinext development server |
| `npm run build` | Sites production build |
| `npm start` | Production preview after build |
| `npm run build:pages` | Next.js static export to `out/` |
| `npm run test:pages` | Export and base-path resource checks |
| `npm run test:play` | Pure gameplay and fixed-step tests |
| `npm test` | Sites build, rendered content checks and gameplay tests |
| `npm run lint` | ESLint |
| `npm run db:generate` | Drizzle migrations only when adding database schema |

GitHub Actions runs builds and production-browser regressions on cloud runners. The browser dependency is installed in CI, not shipped to visitors. Checks cover the original interactions plus session retention, partial prints, spell combinations, route outcomes, comparable aim rounds, keyboard alternatives, mobile expansion and no-JavaScript navigation. CI software rendering is not a claim about real-device FPS.

## Maintenance Map

```text
app/page.tsx                     Homepage and catalogue structure
app/islands.ts                   Island data, covers and automatic numbering
app/catalogue-motion.tsx         Scroll progress, moonlight and Motion control
app/fluid-cursor.tsx             Fixed-step transparent WebGL2 ripples
app/star-skipping.tsx            Star interaction adapter
app/playable-cover.tsx           Retained sessions and expanded play
app/play/*-engine.ts             Independently loaded interaction engines
app/play/continuity-model.ts     Timing, rune combinations and journey rules
app/play/session.ts              Pause/resume contract and pointer sampling
app/play/*-model.ts              Existing pure gameplay rules
app/*motion.css                  Hero and exhibition motion
app/continuity.css               Local continuity / expanded-play styling
app/layout.tsx                   Metadata and stylesheet entry
app/build-stamp.tsx              Published source identifier
public/                         Photographic and cover assets
scripts/write-build-info.mjs     Build-time source SHA and target
scripts/build-pages.mjs          Pages subpath-aware export
.github/workflows/               Builds, deployment and browser regressions
tests/                          Render, resource, model and browser checks
```

Add projects in `app/islands.ts` and put their complete covers in `public/`. Each item includes `id`, `title`, `description`, `name`, `category`, `url`, `cover` and `coverAlt`. Numbering continues automatically, including More to Arrive. A new island does not need a mini-game to be listed.

[Interaction rules and technical boundaries](https://github.com/LoseYoung/loseyoung-digital-islands/blob/main/docs/interactive-continuity.md) · [Original playground notes](https://github.com/LoseYoung/loseyoung-digital-islands/blob/main/docs/playgrounds.md) · [Aim statistics](https://github.com/LoseYoung/loseyoung-digital-islands/blob/main/docs/aim-trainer.md)

Older design documents describe earlier iterations; current source and the continuity notes take precedence where behaviors changed.

## Deployment and Version Identity

Pushing to `main` triggers `.github/workflows/pages.yml`, including the Sites build check, Pages export, resource checks and Pages deployment. The default static base path is `/loseyoung-digital-islands`.

Sites is associated through `.openai/hosting.json`, but a GitHub commit is **not** a Sites deployment. Rebuild and publish the Sites project separately. Never infer synchronization from a successful Pages workflow.

Build scripts generate `public/build-info.json` with the real source SHA, target and build time. The footer displays that identifier. When a hosting environment supplies no Git metadata, it explicitly reports the source as unavailable; `BUILD_SOURCE_SHA` can provide it. Compare identifiers to check whether two deployments share a source revision.

Version **0.1.0**. Four islands are open. No CMS, global player leaderboard, cross-device save system, portal photo-upload service or business database is implied by the optional scaffolding.
