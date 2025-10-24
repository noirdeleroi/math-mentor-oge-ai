import { useEffect, useRef } from "react";
import p5 from "p5";

export default function useFlyingStarsBackground(parentRef: React.RefObject<HTMLDivElement>) {
  const p5Ref = useRef<p5 | null>(null);

  useEffect(() => {
    if (!parentRef.current || p5Ref.current) return;

    const sketch = (p: p5) => {
      type Particle = { 
        x: number; 
        y: number; 
        vx: number; 
        vy: number; 
        size: number; 
        opacity: number;
        twinkleSpeed: number;
        twinklePhase: number;
      };
      const particles: Particle[] = [];

      p.setup = () => {
        const c = p.createCanvas(p.windowWidth, p.windowHeight);
        c.parent(parentRef.current!);
        p.pixelDensity(p.displayDensity());
        p.clear();

        // Create gentle floating particles (space dust)
        for (let i = 0; i < 60; i++) {
          particles.push({
            x: p.random(p.width),
            y: p.random(p.height),
            vx: p.random(-0.3, 0.3),
            vy: p.random(-0.3, 0.3),
            size: p.random(1.5, 3.5),
            opacity: p.random(0.2, 0.6),
            twinkleSpeed: p.random(0.01, 0.03),
            twinklePhase: p.random(p.TWO_PI),
          });
        }
      };

      p.draw = () => {
        p.clear();

        // Update and draw particles
        particles.forEach((pt) => {
          // Gentle movement
          pt.x += pt.vx;
          pt.y += pt.vy;
          
          // Wrap around screen edges
          if (pt.x < 0) pt.x = p.width;
          if (pt.x > p.width) pt.x = 0;
          if (pt.y < 0) pt.y = p.height;
          if (pt.y > p.height) pt.y = 0;

          // Twinkling effect
          pt.twinklePhase += pt.twinkleSpeed;
          const twinkle = (p.sin(pt.twinklePhase) + 1) / 2; // 0 to 1
          const currentOpacity = pt.opacity * (0.3 + twinkle * 0.7);

          // Draw particle as a soft glow
          p.noStroke();
          
          // Outer glow
          const glowSize = pt.size * 3;
          p.fill(245, 158, 11, currentOpacity * 30);
          p.circle(pt.x, pt.y, glowSize);
          
          // Inner glow
          const innerSize = pt.size * 1.5;
          p.fill(245, 158, 11, currentOpacity * 80);
          p.circle(pt.x, pt.y, innerSize);
          
          // Core
          p.fill(245, 158, 11, currentOpacity * 255);
          p.circle(pt.x, pt.y, pt.size);
        });

        // Draw very subtle connection lines between nearby particles
        p.stroke(245, 158, 11, 20);
        p.strokeWeight(0.5);
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const d = p.dist(particles[i].x, particles[i].y, particles[j].x, particles[j].y);
            if (d < 150) {
              const alpha = p.map(d, 0, 150, 20, 0);
              p.stroke(245, 158, 11, alpha);
              p.line(particles[i].x, particles[i].y, particles[j].x, particles[j].y);
            }
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
  }, [parentRef]);
}
