"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { CardBack } from "./card-back";

interface Props {
  /** Unique per reading and slot, used to flip each card only the first time it is seen. */
  seenKey: string;
  image: string;
  name: string;
  reversed: boolean;
  size?: "md" | "sm";
}

const seenStore = {
  has(key: string) {
    try {
      return sessionStorage.getItem(key) === "1";
    } catch {
      return false;
    }
  },
  add(key: string) {
    try {
      sessionStorage.setItem(key, "1");
    } catch {
      // storage unavailable: the card just flips again next time
    }
  },
};

/** A tarot card that turns over the first time it appears. Reversed cards show upside down. */
export function FlipCard({ seenKey, image, name, reversed, size = "md" }: Props) {
  const [faceUp, setFaceUp] = useState(false);
  const [instant, setInstant] = useState(false);

  useEffect(() => {
    if (seenStore.has(seenKey) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setInstant(true);
      setFaceUp(true);
      return;
    }
    const t = setTimeout(() => {
      setFaceUp(true);
      seenStore.add(seenKey);
    }, 150);
    return () => clearTimeout(t);
  }, [seenKey]);

  const width = size === "md" ? "w-36 sm:w-44" : "w-20";
  return (
    <div className={`${width} aspect-[100/172] [perspective:1200px]`}>
      <div
        className={`relative size-full [transform-style:preserve-3d] ${instant ? "" : "transition-transform duration-700 ease-out"} ${faceUp ? "[transform:rotateY(180deg)]" : ""}`}
      >
        <div className="absolute inset-0 [backface-visibility:hidden]">
          <CardBack className="size-full drop-shadow-md" />
        </div>
        <div className="absolute inset-0 overflow-hidden rounded-[7%] shadow-md [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <Image
            src={image}
            alt={`${name}${reversed ? " (reversed)" : ""}`}
            fill
            sizes={size === "md" ? "(min-width: 640px) 176px, 144px" : "80px"}
            className={`object-cover ${reversed ? "rotate-180" : ""}`}
          />
        </div>
      </div>
    </div>
  );
}
