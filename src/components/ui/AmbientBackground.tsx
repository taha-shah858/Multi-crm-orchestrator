"use client";

import React, { useEffect, useRef } from "react";

export default function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    // Mouse tracking for organic repulsion/attraction
    const mouse = { x: -1000, y: -1000, radius: 180 };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Organism Nodes (representing CRM data streams)
    const particleCount = Math.floor((width * height) / 18000);
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      baseAlpha: number;
      pulseSpeed: number;
      angle: number;
    }> = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 1,
        baseAlpha: Math.random() * 0.5 + 0.2,
        pulseSpeed: Math.random() * 0.02 + 0.01,
        angle: Math.random() * Math.PI * 2,
      });
    }

    // Animation Loop (The "Living Organism" Pulse)
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw subtle organic gradient orbs
      const time = Date.now() * 0.001;
      const gradientX = width * 0.5 + Math.sin(time * 0.5) * 200;
      const gradientY = height * 0.5 + Math.cos(time * 0.3) * 150;

      const bgGradient = ctx.createRadialGradient(
        gradientX,
        gradientY,
        50,
        gradientX,
        gradientY,
        width * 0.7
      );
      bgGradient.addColorStop(0, "rgba(6, 182, 212, 0.07)"); // Cyan pulse
      bgGradient.addColorStop(0.5, "rgba(168, 85, 247, 0.04)"); // Purple pulse
      bgGradient.addColorStop(1, "transparent");

      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // Update and draw particles / network lines
      particles.forEach((p, index) => {
        p.angle += p.pulseSpeed;
        p.x += p.vx + Math.sin(p.angle) * 0.2;
        p.y += p.vy + Math.cos(p.angle) * 0.2;

        // Screen wrap-around
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Mouse interaction (organic reaction)
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouse.radius) {
          const force = (mouse.radius - dist) / mouse.radius;
          p.x -= (dx / dist) * force * 2;
          p.y -= (dy / dist) * force * 2;
        }

        // Draw particle node
        const currentAlpha = p.baseAlpha + Math.sin(p.angle) * 0.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(6, 182, 212, ${Math.max(0.1, currentAlpha)})`;
        ctx.fill();

        // Connect nearby nodes to form the "living fabric"
        for (let j = index + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const distance = Math.hypot(p.x - p2.x, p.y - p2.y);

          if (distance < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            const lineAlpha = (1 - distance / 120) * 0.15;
            ctx.strokeStyle = `rgba(147, 51, 234, ${lineAlpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      <canvas ref={canvasRef} className="block w-full h-full opacity-9opa" />
    </div>
  );
}
