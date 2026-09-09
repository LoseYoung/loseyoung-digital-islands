import type { CSSProperties } from "react";
import CatalogueMotion from "./catalogue-motion";
import { catalogueNumber, forthcoming, islands } from "./islands";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <span className="arrow" aria-hidden="true">{diagonal ? "↗" : "→"}</span>;
}

export default function Home() {
  return (
    <main id="top">
      <a className="skip-link" href="#islands">跳至岛屿目录</a>
      <header className="site-header shell">
        <a className="brand" href="#top" lang="en" aria-label="Digital Islands 首页">Digital Islands<span className="brand-period">.</span></a>
        <nav aria-label="主导航" lang="en">
          <a href="#top" aria-label="Index · 首页">Index</a>
          <a href="#islands" aria-label="Islands · 岛屿目录">Islands</a>
          <a href="#about" aria-label="About · 策展说明">About</a>
          <span className="nav-reserved" aria-disabled="true" title="Archive · 尚未开放">Archive</span>
        </nav>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-atmosphere" aria-hidden="true">
          <img className="hero-landscape" src={`${basePath}/moonlit-ocean-4k.svg`} alt="" width="3840" height="2160" fetchPriority="high" />
          <div className="light-rays" />
          <div className="water-silk" />
          <div className="moon-haze" />
          <div className="sea-glimmer"><i /><i /><i /></div>
          <div className="distant-lights">{Array.from({ length: 12 }, (_, index) => <i key={index} style={{ "--star-x": `${9 + (index * 47) % 86}%`, "--star-y": `${8 + (index * 23) % 44}%`, "--star-delay": `${-index * 1.6}s`, "--star-duration": `${7 + index % 5}s` } as CSSProperties} />)}</div>
          <div className="horizon-glow" />
        </div>
        <div className="hero-content shell">
          <p className="eyebrow hero-eyebrow" lang="en">A personal collection <span>—</span> always in progress</p>
          <h1 id="hero-title" lang="en"><span className="hero-title-line">Somewhere Between</span><span className="hero-title-line">Real and <em>Imagined</em></span></h1>
          <p className="hero-description">那些被看见的、被保存的、被想象过的，<br />都在这里，保持各自的距离。</p>
          <a className="text-link hero-action" href="#islands" lang="en">Browse the Collection <Arrow /></a>
        </div>
        <div className="hero-bottom shell">
          <p lang="en">A growing collection of personal worlds.</p>
          <CatalogueMotion />
          <a href="#about" aria-label="向下阅读策展说明"><span lang="en">Scroll to discover</span><span aria-hidden="true">↓</span></a>
        </div>
        <div className="horizon" aria-hidden="true" />
      </section>

      <section id="about" className="curatorial shell section-space" aria-labelledby="note-title" data-chapter>
        <div className="section-label" data-reveal><span className="index-mark" aria-hidden="true">I</span><h2 id="note-title" lang="en">Curatorial Note</h2></div>
        <div className="note-copy" data-reveal>
          <p className="note-english" lang="en">Some places begin with a memory.<br />Some with an image, a story,<br />or a distant idea.</p>
          <p className="note-chinese">有些地方始于记忆，<br />有些始于一张照片、一个故事，或一个尚未抵达的念头。<br />它们聚在这里，不是为了变得相同，<br />而是为了在需要时，仍能被重新靠近。</p>
          <span className="note-signature" lang="en">Collected by LoseYoung</span>
        </div>
      </section>

      <section id="islands" className="collection shell section-space" aria-labelledby="islands-title" data-chapter>
        <header className="section-heading" data-reveal>
          <div><p className="eyebrow" lang="en">The collection</p><h2 id="islands-title" lang="en">Selected <em>Islands</em></h2></div>
          <p>正在形成中的目录里，<br />目前可进入的部分。</p>
        </header>
        <div className="island-grid">
          {islands.map((island, index) => (
            <article key={island.id} className="island-entry" data-reveal="card" style={{ "--reveal-delay": `${(index % 3) * 130}ms` } as CSSProperties}>
              <a className="island-card" href={island.url} target="_blank" rel="noopener noreferrer" aria-label={`${island.name} · 在新标签页打开`}>
                <div className="island-topline"><span>{catalogueNumber(index)}</span><span lang="en">{island.category}</span><Arrow diagonal /></div>
                <div className="island-image"><img src={`${basePath}${island.cover}`} alt={island.coverAlt} width="1536" height="1024" loading="lazy" decoding="async" /></div>
                <div className="island-copy"><h3 lang="en">{island.title}</h3><p>{island.description}</p><div className="island-caption"><span lang="en">{island.name}</span><Arrow diagonal /></div></div>
              </a>
            </article>
          ))}
        </div>
      </section>

      <section id="future" className="forthcoming shell section-space" aria-labelledby="future-title" data-chapter>
        <header className="section-heading" data-reveal><div><p className="eyebrow" lang="en">An unfinished index</p><h2 id="future-title" lang="en">More to <em>Arrive</em></h2></div><p lang="en">The collection remains open.</p></header>
        <div className="forthcoming-grid">
          {forthcoming.map((island, index) => (
            <article className="forthcoming-entry" key={island.title} data-reveal aria-label={`${island.title} · 尚未开放`}>
              <span className="future-number">{catalogueNumber(islands.length + index)}</span><h3 lang="en">{island.title}</h3><p lang="en">{island.note}</p><span className="future-rule" aria-hidden="true" />
            </article>
          ))}
        </div>
      </section>

      <footer className="site-footer shell">
        <div><a className="brand" href="#top" lang="en">Digital Islands<span className="brand-period">.</span></a><p lang="en">A growing index of personal worlds.</p></div>
        <p className="footer-note" lang="en">Made slowly.<br /><em>Kept for longer.</em></p>
        <div className="footer-bottom"><span>© 2026 LoseYoung</span><span>慢慢生成，也慢慢留下。</span><a href="#top" lang="en">Back to the beginning <span aria-hidden="true">↑</span></a></div>
      </footer>
    </main>
  );
}
