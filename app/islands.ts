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
    description: "那些被光线、时间与距离留下的片段。",
    name: "Photos Island",
    category: "Photography",
    url: "https://photos-island.lzy793222567.chatgpt.site/",
    cover: "/photos-island.png",
    coverAlt: "照片岛：星空下的海岸与森林",
  },
  {
    id: "faerie",
    title: "Another Reality",
    description: "有些世界并不存在，但在那里停留过的感受是真的。",
    name: "Faerie Britain Echoes",
    category: "Fantasy / RPG",
    url: "https://faerie-britain-echoes.lzy793222567.chatgpt.site/",
    cover: "/faerie-britain.png",
    coverAlt: "妖精国余响：月光森林中的幻想旅程",
  },
  {
    id: "gridwake",
    title: "Further Out",
    description: "在更远的地方，速度、秩序与未知拥有另一套规则。",
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
