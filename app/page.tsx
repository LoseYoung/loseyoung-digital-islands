"use client";

import { useEffect } from "react";

const photosIslandUrl = "https://photos-island.lzy793222567.chatgpt.site/";
const gridwakeIslandUrl = "https://digital-island-gridwake.lzy793222567.chatgpt.site/";
const faerieIslandUrl = "https://faerie-britain-echoes.lzy793222567.chatgpt.site/";

// GitHub 项目站点使用仓库子路径，Sites 默认仍从根路径加载封面。
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

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
          <div className="portal-core"><span>03</span><strong>ACTIVE<br />ISLANDS</strong></div>
          <span className="coordinate north">31° N</span>
          <span className="coordinate east">121° E</span>
          <span className="map-note">THREE ISLANDS ONLINE</span>
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
            <img src={`${basePath}/photos-island.png`} alt="照片岛屿的星空、海岸与森林主题预览" loading="lazy" />
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

        <a className="project-card game-card" href={faerieIslandUrl} target="_blank" rel="noopener noreferrer" aria-label="进入妖精国余响横版 RPG">
          <div className="project-image">
            <img src={`${basePath}/faerie-britain.png`} alt="妖精国余响的月光森林与阿尔托莉雅·Caster主题预览" loading="lazy" />
            <div className="image-overlay" />
            <span className="project-number">ISLAND / 02</span>
            <span className="live-status"><i />公开试玩</span>
          </div>
          <div className="project-content">
            <p>游戏 · 横版动作 RPG</p>
            <h3>妖精国余响<em>Faerie Britain: Echoes</em></h3>
            <span className="project-divider" />
            <p className="project-description">操作阿尔托莉雅·Caster穿过无名之森，以魔术与法杖战斗，在巡礼残响中重温她的选择。御主只会在关键时刻以令咒提供一次支援。</p>
            <span className="project-link">开始巡礼<i>→</i></span>
          </div>
        </a>

        <a className="project-card game-card" href={gridwakeIslandUrl} target="_blank" rel="noopener noreferrer" aria-label="进入栅域余烬像素生存 FPS">
          <div className="project-image">
            <img src={`${basePath}/gridwake.png`} alt="栅域余烬游戏主题封面" loading="lazy" />
            <div className="image-overlay" />
            <span className="project-number">ISLAND / 03</span>
            <span className="live-status"><i />公开试玩</span>
          </div>
          <div className="project-content">
            <p>游戏 · 像素生存 FPS</p>
            <h3>栅域余烬<em>Gridwake</em></h3>
            <span className="project-divider" />
            <p className="project-description">第三座数字岛屿已经开放。进入原创像素风的第一人称生存战场，体验可玩的单机大逃杀 Demo。</p>
            <span className="project-link">进入战场<i>→</i></span>
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
          <div><p>NEXT COORDINATE</p><h3>下一座岛屿</h3><span>尚未命名，正在生长。</span></div>
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