"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { mountStar } from "./play/star-engine";

const subscribe = () => () => {};

export default function StarSkipping() {
  const root = useRef<HTMLDivElement>(null);
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const [message, setMessage] = useState("拖住星光，向海面甩出。也可以轻点，或按 Enter 投掷。 ");
  useEffect(() => { if (!ready || !root.current) return; return mountStar(root.current, setMessage); }, [ready]);
  return (
    <div className="star-skipping" ref={root} hidden={!ready} data-play-surface>
      <canvas className="star-canvas" aria-hidden="true" />
      <button type="button" className="throw-star" aria-label="摘一颗星：拖拽后松开投掷，或按 Enter 打水漂" aria-describedby="star-instructions">
        <span className="star-glyph" aria-hidden="true">✦</span>
        <span className="star-label">摘一颗星</span>
      </button>
      <p id="star-instructions" className="star-feedback" aria-live="polite">{message}</p>
    </div>
  );
}
