"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Props = {
  images: string[];
  className?: string;
};

/** How long each still holds at full opacity before the next one begins fading in. */
const HOLD_MS = 4500;
/** Length of the cross-fade. Applied inline so it cannot drift from the timer. */
const FADE_MS = 1600;

/**
 * Cross-fades a set of stills in place behind the dashboard hero.
 *
 * The alternative to a background video for a tenant that has its own
 * photography. Every image is mounted at once and only opacity animates, so the
 * fade happens in place with no layout movement and no flash of empty hero
 * between frames — the outgoing image is still painted underneath the incoming one.
 *
 * Decorative, so it is hidden from assistive technology entirely rather than
 * given alt text a screen reader would have to sit through on every rotation.
 */
export default function SummitHeroSlideshow({ images, className = "" }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    // Nobody reading the hero should have motion forced on them.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % images.length);
    }, HOLD_MS + FADE_MS);
    return () => window.clearInterval(timer);
  }, [images.length]);

  return (
    <div className={className} aria-hidden>
      {images.map((src, position) => (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          sizes="100vw"
          // Only the first frame is worth blocking the hero on; the rest have
          // seconds of runway before they are needed.
          priority={position === 0}
          className={`object-cover object-center transition-opacity ease-in-out ${
            position === index ? "opacity-100" : "opacity-0"
          }`}
          style={{ transitionDuration: `${FADE_MS}ms` }}
        />
      ))}
    </div>
  );
}
