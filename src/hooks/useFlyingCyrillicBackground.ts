import { useEffect, useRef } from "react";
import p5 from "p5";

type Options = {
  count?: number;
  color?: [number, number, number];
  linkDist?: number;
  opacity?: number;
  sizeScale?: number;
  maxSpeed?: number;
};

export default function useFlyingCyrillicBackground(
  parentRef: React.RefObject<HTMLDivElement>,
  {
    count = 80,
    color = [245, 158, 11],
    linkDist = 100,
    opacity = 0.65,
    sizeScale = 9,
    maxSpeed = 0.5,
  }: Options = {}        // <-- optional second arg
) {
  const p5Ref = useRef<p5 | null>(null);

  useEffect(() => {
    if (!parentRef.current || p5Ref.current) return;

    const sketch = (p: p5) => {
      const syms = [
        "Я", "Ж", "Ф", "Ю", "Ы", "Э", "Ъ", "Ь",
        "Ѣ", "҂", "Ш", "Щ", "Ч", "Ц", "Й", "Л", "Д", "П"
      ];

      type Part = {
        x: number; y: number; vx: number; vy: number;
        size: number; opacity: number; sym: string;
      };
      const parts: Part[] = [];
      const [r, g, b] = color;

      p.setup = () => {
        const c = p.createCanvas(p.windowWidth, p.windowHeight);
        c.parent(parentRef.current!);
        p.pixelDensity(p.displayDensity());
        p.clear();

        for (let i = 0; i < count; i++) {
          parts.push({
            x: p.random(p.width),
            y: p.random(p.height),
            vx: p.random(-maxSpeed, maxSpeed),
            vy: p.random(-maxSpeed, maxSpeed),
            size: p.random(2, 4),
            opacity: p.random(0.4, 0.8) * opacity,
            sym: syms[Math.floor(p.random(syms.length))],
          });
        }
      };

      p.draw = () => {
        p.clear();

        parts.forEach((pt) => {
          pt.x += pt.vx;
          pt.y += pt.vy;
          if (pt.x < 0) pt.x = p.width;
          if (pt.x > p.width) pt.x = 0;
          if (pt.y < 0) pt.y = p.height;
          if (pt.y > p.height) pt.y = 0;

          p.fill(r, g, b, pt.opacity * 255);
          p.noStroke();
          p.textAlign(p.CENTER, p.CENTER);
          p.textSize(pt.size * sizeScale);
          p.text(pt.sym, pt.x, pt.y);
        });

        p.stroke(r, g, b, 90);
        p.strokeWeight(1);
        for (let i = 0; i < parts.length; i++) {
          for (let j = i + 1; j < parts.length; j++) {
            const d = p.dist(parts[i].x, parts[i].y, parts[j].x, parts[j].y);
            if (d < linkDist) p.line(parts[i].x, parts[i].y, parts[j].x, parts[j].y);
          }
        }
      };

      p.windowResized = () => p.resizeCanvas(p.windowWidth, p.windowHeight);
    };

    p5Ref.current = new p5(sketch);
    return () => {
      p5Ref.current?.remove();
      p5Ref.current = null;
    };
  }, [parentRef, count, color, linkDist, opacity, sizeScale, maxSpeed]);
}
