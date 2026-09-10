export type Island = {
  id: string;
  title: string;
  description: string;
  name: string;
  category: string;
  url: string;
  cover: string;
  coverAlt: string;
};

// Add the next open island here; the catalogue numbers and layout follow the data.
export const islands: Island[] = [
  {
    id: "photos",
    title: "A Softer Gaze",
    description: "那些被光线、时间与距离留下的片段。这里收集旅行、城市、自然与偶然相遇的瞬间，不急着解释它们，只让记忆以照片的方式慢慢沉淀。它更像一册持续生长的私人影像档案，也记录着我如何重新看见已经经过的地方。",
    name: "Photos Island",
    category: "Photography",
    url: "https://photos-island.lzy793222567.chatgpt.site/",
    cover: "/photos-island.png",
    coverAlt: "照片岛：星空下的海岸与森林",
  },
  {
    id: "faerie",
    title: "Another Reality",
    description: "有些世界并不存在，但在那里停留过的感受是真的。这里保存关于妖精国、角色与旅途的余响，把幻想作品里那些短暂却鲜明的情绪重新编排成一个可以再次进入的空间。它不是单纯复述故事，而是试着留下那些在故事结束之后仍然没有消失的氛围与记忆。",
    name: "Faerie Britain Echoes",
    category: "Fantasy / RPG",
    url: "https://faerie-britain-echoes.lzy793222567.chatgpt.site/",
    cover: "/faerie-britain.png",
    coverAlt: "妖精国余响：月光森林中的幻想旅程",
  },
  {
    id: "gridwake",
    title: "Further Out",
    description: "在更远的地方，速度、秩序与未知拥有另一套规则。Gridwake 从科幻与 FPS 的节奏出发，把战斗、空间、残存秩序与陌生环境收束成一片更冷、更锋利的数字区域。这里更关注移动、压迫感和世界边缘的张力，让这座岛屿和前两座保持完全不同的呼吸。",
    name: "Gridwake",
    category: "Sci-Fi / FPS",
    url: "https://digital-island-gridwake.lzy793222567.chatgpt.site/",
    cover: "/gridwake.png",
    coverAlt: "栅域余烬：像素生存世界",
  },
];

export const forthcoming = [
  { title: "Not Yet Open", note: "Still taking shape." },
  { title: "To Be Named", note: "Reserved for a future island." },
  { title: "Forthcoming", note: "Awaiting its first horizon." },
];

export function catalogueNumber(index: number) {
  return String(index + 1).padStart(2, "0");
}
