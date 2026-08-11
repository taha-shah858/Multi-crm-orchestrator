"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { usePathname } from "next/navigation";
import { ROUTE_SPATIAL_MAP } from "@/config/spatialMap";

export default function ParticleBrainBackground() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020617, 0.022);

    const camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 3.5, 22);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // --- Generate Soft Bokeh Particle Texture ---
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
      gradient.addColorStop(0.25, "rgba(6, 182, 212, 0.9)");
      gradient.addColorStop(0.6, "rgba(59, 130, 246, 0.4)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
    }
    const particleTexture = new THREE.CanvasTexture(canvas);

    // References to active meshes so we can rebuild them on density change
    let currentTerrain: THREE.Points | null = null;
    let currentWireframe: THREE.LineSegments | null = null;
    let currentBokeh: THREE.Points | null = null;

    let geometry: THREE.BufferGeometry;
    let originalPositions: Float32Array;
    let cols = 64;
    let rows = 48;

    const buildMeshSystem = (density: string) => {
      // Adjust grid resolution based on density selection
      if (density === "Low") {
        cols = 32;
        rows = 24;
      } else if (density === "Ultra") {
        cols = 96;
        rows = 72;
      } else {
        cols = 64;
        rows = 48; // Balanced
      }

      // Remove old meshes from scene
      if (currentTerrain) scene.remove(currentTerrain);
      if (currentWireframe) scene.remove(currentWireframe);
      if (currentBokeh) scene.remove(currentBokeh);

      const count = cols * rows;
      geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      originalPositions = new Float32Array(count * 3);
      const scales = new Float32Array(count);

      let index = 0;
      const spacingX =
        density === "Low" ? 1.0 : density === "Ultra" ? 0.55 : 0.75;
      const spacingZ =
        density === "Low" ? 1.0 : density === "Ultra" ? 0.55 : 0.75;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = (i - cols / 2) * spacingX;
          const z = (j - rows / 2) * spacingZ - 4;

          const nx = i / cols - 0.5;
          const nz = j / rows - 0.5;
          const y =
            -1.8 +
            Math.sin(nx * Math.PI * 3) * 2.2 -
            Math.cos(nz * Math.PI * 2) * 1.6;

          positions[index * 3] = x;
          positions[index * 3 + 1] = y;
          positions[index * 3 + 2] = z;

          originalPositions[index * 3] = x;
          originalPositions[index * 3 + 1] = y;
          originalPositions[index * 3 + 2] = z;

          scales[index] = 0.25 + Math.random() * 0.35;
          index++;
        }
      }

      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
      );
      geometry.setAttribute("scale", new THREE.BufferAttribute(scales, 1));

      const nodeMaterial = new THREE.PointsMaterial({
        size: density === "Low" ? 0.4 : density === "Ultra" ? 0.28 : 0.35,
        map: particleTexture,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      currentTerrain = new THREE.Points(geometry, nodeMaterial);
      scene.add(currentTerrain);

      // --- Wireframe Lattices ---
      const linePositions: number[] = [];
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const curr = i * rows + j;

          if (i < cols - 1) {
            const nextX = (i + 1) * rows + j;
            linePositions.push(
              originalPositions[curr * 3],
              originalPositions[curr * 3 + 1],
              originalPositions[curr * 3 + 2],
              originalPositions[nextX * 3],
              originalPositions[nextX * 3 + 1],
              originalPositions[nextX * 3 + 2]
            );
          }
          if (j < rows - 1) {
            const nextZ = i * rows + (j + 1);
            linePositions.push(
              originalPositions[curr * 3],
              originalPositions[curr * 3 + 1],
              originalPositions[curr * 3 + 2],
              originalPositions[nextZ * 3],
              originalPositions[nextZ * 3 + 1],
              originalPositions[nextZ * 3 + 2]
            );
          }
          if (i < cols - 1 && j < rows - 1) {
            const diag = (i + 1) * rows + (j + 1);
            linePositions.push(
              originalPositions[curr * 3],
              originalPositions[curr * 3 + 1],
              originalPositions[curr * 3 + 2],
              originalPositions[diag * 3],
              originalPositions[diag * 3 + 1],
              originalPositions[diag * 3 + 2]
            );
          }
        }
      }

      const lineGeometry = new THREE.BufferGeometry();
      lineGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(linePositions, 3)
      );

      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: density === "Low" ? 0.08 : density === "Ultra" ? 0.22 : 0.16,
        blending: THREE.AdditiveBlending,
      });

      currentWireframe = new THREE.LineSegments(lineGeometry, lineMaterial);
      scene.add(currentWireframe);

      // --- Foreground Bokeh Particles ---
      const bokehCount =
        density === "Low" ? 60 : density === "Ultra" ? 300 : 180;
      const bokehGeometry = new THREE.BufferGeometry();
      const bokehPositions = new Float32Array(bokehCount * 3);

      for (let i = 0; i < bokehCount; i++) {
        bokehPositions[i * 3] = (Math.random() - 0.5) * 32;
        bokehPositions[i * 3 + 1] = (Math.random() - 0.5) * 16 + 2;
        bokehPositions[i * 3 + 2] = Math.random() * 15 - 2;
      }

      bokehGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(bokehPositions, 3)
      );

      const bokehMaterial = new THREE.PointsMaterial({
        size: 0.65,
        map: particleTexture,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      currentBokeh = new THREE.Points(bokehGeometry, bokehMaterial);
      scene.add(currentBokeh);
    };

    // Initialize with Balanced default
    buildMeshSystem("Balanced");

    // --- Listen to Widget Density Changes ---
    const handleDensityChange = (e: CustomEvent<string>) => {
      buildMeshSystem(e.detail);
    };

    window.addEventListener(
      "particle-density-change",
      handleDensityChange as EventListener
    );

    // --- Interaction States ---
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = (e.clientX / window.innerWidth - 0.5) * 1.5;
      targetMouseY = (e.clientY / window.innerHeight - 0.5) * 1.5;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // --- Animation Loop ---
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime() * 0.35;

      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      const target = ROUTE_SPATIAL_MAP[pathnameRef.current] || {
        x: 0,
        y: 0,
        z: 0,
        rotX: 0,
        rotY: 0,
      };

      const targetPosX = target.x + mouseX * 1.8;
      const targetPosY = 3.5 + target.y - mouseY * 1.8;
      const targetPosZ = 22 + target.z;

      camera.position.x += (targetPosX - camera.position.x) * 0.04;
      camera.position.y += (targetPosY - camera.position.y) * 0.04;
      camera.position.z += (targetPosZ - camera.position.z) * 0.04;

      if (currentTerrain && currentWireframe) {
        const posAttr = currentTerrain.geometry.attributes.position;
        const linePosAttr = currentWireframe.geometry.attributes.position;
        let lineIdx = 0;

        for (let i = 0; i < cols; i++) {
          for (let j = 0; j < rows; j++) {
            const idx = i * rows + j;
            const ox = originalPositions[idx * 3];
            const oz = originalPositions[idx * 3 + 2];
            const oy = originalPositions[idx * 3 + 1];

            const waveY =
              oy +
              Math.sin(t + ox * 0.22) * Math.cos(t * 0.55 + oz * 0.22) * 0.85 +
              Math.sin(t * 1.1 + (ox + oz) * 0.12) * 0.35;

            posAttr.setY(idx, waveY);
          }
        }
        posAttr.needsUpdate = true;

        for (let i = 0; i < cols; i++) {
          for (let j = 0; j < rows; j++) {
            const curr = i * rows + j;
            const cx = posAttr.getX(curr);
            const cy = posAttr.getY(curr);
            const cz = posAttr.getZ(curr);

            if (i < cols - 1) {
              const nextX = (i + 1) * rows + j;
              linePosAttr.setXYZ(lineIdx++, cx, cy, cz);
              linePosAttr.setXYZ(
                lineIdx++,
                posAttr.getX(nextX),
                posAttr.getY(nextX),
                posAttr.getZ(nextX)
              );
            }
            if (j < rows - 1) {
              const nextZ = i * rows + (j + 1);
              linePosAttr.setXYZ(lineIdx++, cx, cy, cz);
              linePosAttr.setXYZ(
                lineIdx++,
                posAttr.getX(nextZ),
                posAttr.getY(nextZ),
                posAttr.getZ(nextZ)
              );
            }
            if (i < cols - 1 && j < rows - 1) {
              const diag = (i + 1) * rows + (j + 1);
              linePosAttr.setXYZ(lineIdx++, cx, cy, cz);
              linePosAttr.setXYZ(
                lineIdx++,
                posAttr.getX(diag),
                posAttr.getY(diag),
                posAttr.getZ(diag)
              );
            }
          }
        }
        linePosAttr.needsUpdate = true;

        currentTerrain.rotation.y = mouseX * 0.06 + target.rotY;
        currentWireframe.rotation.y = mouseX * 0.06 + target.rotY;
      }

      if (currentBokeh) {
        currentBokeh.rotation.y = -t * 0.03 + mouseX * 0.04;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener(
        "particle-density-change",
        handleDensityChange as EventListener
      );
      cancelAnimationFrame(animationFrameId);
      particleTexture.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-slate-950"
    />
  );
}
