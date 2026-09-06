const islands = [
  { number: "01", name: "照片岛", category: "影像 · 公开画廊", action: "进入照片岛", url: "https://photos-island.lzy793222567.chatgpt.site/", image: "/photos-island.png", position: "photos" },
  { number: "02", name: "妖精国余响", category: "游戏 · 横版动作 RPG", action: "开始巡礼", url: "https://faerie-britain-echoes.lzy793222567.chatgpt.site/", image: "/faerie-britain.png", position: "faerie" },
  { number: "03", name: "栅域余烬", category: "游戏 · 像素生存 FPS", action: "进入战场", url: "https://digital-island-gridwake.lzy793222567.chatgpt.site/", image: "/archipelago-night.webp", position: "gridwake" },
];

export default function Home() {
  return (
    <main id="top" className="portal">
      <a className="skip-link" href="#projects">跳至岛屿导航</a>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="返回门户首页">LoseYoung <span>· 数字岛屿</span></a>
        <nav aria-label="主导航">
          {islands.map((island) => <a key={island.number} href={island.url} target="_blank" rel="noopener noreferrer">{island.name}<span className="sr-only">（新窗口打开）</span></a>)}
        </nav>
        <span className="header-note">星海未眠，创造继续</span>
      </header>
      <section className="atlas" aria-labelledby="hero-title">
        <div className="atlas-art" aria-hidden="true" />
        <div className="hero-copy">
          <p className="eyebrow">PERSONAL DIGITAL ARCHIPELAGO</p>
          <h1 id="hero-title">把灵感，<br />安放在星海之间。</h1>
          <div className="heading-rule" aria-hidden="true"><span>✧</span></div>
          <p className="island-count"><strong>{String(islands.length).padStart(2, "0")}</strong><span>ISLANDS ONLINE<small>三座岛屿，三种探索。</small></span></p>
        </div>
        <div className="map-links" aria-label="群岛地图导航">
          {islands.map((island) => <a key={island.number} className={`map-link ${island.position}`} href={island.url} target="_blank" rel="noopener noreferrer" aria-label={`${island.action}（新窗口打开）`}>
            <span className="map-title"><span>{island.number}</span> / {island.name}<i aria-hidden="true">↗</i></span>
            <span className="map-category">{island.category}</span>
            <span className="map-anchor" aria-hidden="true" />
          </a>)}
        </div>
        <section id="projects" className="projects" aria-label="正在运行的三座数字岛屿">
          {islands.map((island) => <a className={`project-card ${island.position}`} key={island.number} href={island.url} target="_blank" rel="noopener noreferrer" aria-label={`${island.action}（新窗口打开）`}>
            <div className="card-image"><img src={island.image} alt="" /></div>
            <div className="card-content">
              <h2><span>{island.number}</span><b aria-hidden="true">/</b>{island.name}</h2>
              <p>{island.category}</p>
              <span className="card-action">{island.action}<span aria-hidden="true">↗</span></span>
            </div>
          </a>)}
        </section>
      </section>
      <footer><span>© 2026 LoseYoung</span><span>Built quietly between stars and tides.</span></footer>
    </main>
  );
}
