"use client";

import { useEffect } from "react";

const photosIslandUrl = "https://photos-island.lzy793222567.chatgpt.site/";

export default function Home() {
  useEffect(() => {
    let frame = 0;
    const onPointerMove = (event: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        const x = (event.clientX / window.innerWidth - 0.5) * 2;
        const y = (event.clientY / window.innerHeight - 0.5) * 2;
        document.documentElement.style.setProperty("--pointer-x", x.toFixed(3));
        document.documentElement.style.setProperty("--pointer-y", y.toFixed(3));
        frame = 0;
      });
    };
    const supportsMotion = window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)").matches;
    if (supportsMotion) window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <main>
      <div className="ambient" aria-hidden="true">
        <div className="stars stars-far" />
        <div className="stars stars-near" />
        <div className="moon" />
        <div className="aurora aurora-one" />
        <div className="aurora aurora-two" />
        <div className="forest" />
        <div className="sea"><i /><i /></div>
      </div>

      <header className="site-header">
        <a className="brand" href="#top" aria-label="返回门户首页">
          <span className="brand-mark"><i /></span>
          <span><strong>LoseYoung · 数字岛屿</strong><small>DIGITAL ARCHIPELAGO</small></span>
        </a>
        <nav aria-label="主导航">
          <a href="#projects">正在运行</a>
          <a href="#future">未来坐标</a>
        </nav>
        <span className="building-status"><i />持续构建中</span>
      </header>

      <section id="top" className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><i />PERSONAL DIGITAL HARBOR · 个人数字港湾</p>
          <h1>把灵感，安放在<br /><em>星海之间。</em></h1>
          <p className="hero-description">这里汇集我正在创造与维护的网页。每一座数字岛屿，都承载着一段影像、一次探索，或一个尚在生长的想法。</p>
          <div className="hero-actions">
            <a className="primary-action" href={photosIslandUrl} target="_blank" rel="noopener noreferrer">探索照片岛 <span>↗</span></a>
            <a className="secondary-action" href="#projects">查看正在运行的项目 <span>↓</span></a>
          </div>
        </div>
        <div className="archipelago" aria-hidden="true">
          <div className="orbit orbit-one"><i /></div>
          <div className="orbit orbit-two"><i /></div>
          <div className="portal-core"><span>01</span><strong>PHOTO<br />ISLAND</strong></div>
          <span className="coordinate north">31° N</span>
          <span className="coordinate east">121° E</span>
          <span className="map-note">ONE ISLAND ONLINE</span>
        </div>
        <a className="scroll-cue" href="#projects"><i />向下探索</a>
      </section>

      <section id="projects" className="projects section-shell">
        <header className="section-heading">
          <div><p className="section-index">01 / LIVE PROJECTS</p><h2>正在运行</h2></div>
          <p>已经开放，可以进入探索的数字空间。</p>
        </header>

        <a className="project-card" href={photosIslandUrl} target="_blank" rel="noopener noreferrer" aria-label="进入照片岛公开画廊">
          <div className="project-image">
            <img src="/photos-island.png" alt="照片岛屿的星空、海岸与森林主题预览" loading="lazy" />
            <div className="image-overlay" />
            <span className="project-number">ISLAND / 01</span>
            <span className="live-status"><i />公开访问</span>
          </div>
          <div className="project-content">
            <p>影像 · 公开画廊</p>
            <h3>照片岛 <em>Photos Island</em></h3>
            <span className="project-divider" />
            <p className="project-description">一座收藏光影与记忆的线上岛屿。浏览公开照片，在拍摄时间与景色之间，发现每一帧背后的故事。</p>
            <span className="project-link">进入照片岛 <i>↗</i></span>
          </div>
        </a>
      </section>

      <section id="future" className="future section-shell">
        <header className="section-heading">
          <div><p className="section-index">02 / FUTURE COORDINATES</p><h2>未来坐标</h2></div>
          <p>更多作品正在构思与建造。它们会在准备好之后，于此点亮。</p>
        </header>
        <div className="future-panel" aria-disabled="true">
          <div className="future-orbit"><i /></div>
          <div><p>NEXT ISLAND</p><h3>下一座岛屿</h3><span>尚未命名，正在生长。</span></div>
          <small>当新的站点开放，这里将成为它的入口。</small>
        </div>
      </section>

      <footer>
        <div><span className="brand-mark small"><i /></span><strong>LoseYoung · 数字岛屿</strong></div>
        <p>© 2026 LoseYoung · Built quietly between stars and tides.</p>
        <span>星海未眠，创造继续。</span>
      </footer>
    </main>
  );
}