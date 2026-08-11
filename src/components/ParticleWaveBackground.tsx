"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { usePathname } from "next/navigation";
import { ROUTE_SPATIAL_MAP, DEFAULT_COORDINATES } from "@/config/spatialMap";

// --- Custom Aurora Ribbon Shader ---
const AuroraShader = {
  uniforms: {
    uTime: { value: 0 },
    uOpacity: { value: 0.35 },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uOpacity;
    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
      vec2 uv = vUv;
      float wave1 = sin(uv.x * 4.0 + uTime * 0.6) * 0.5 + 0.5;
      float wave2 = cos(uv.y * 3.0 - uTime * 0.4 + uv.x * 2.0) * 0.5 + 0.5;
      float combined = wave1 * wave2;

      vec3 c1 = vec3(0.02, 0.38, 0.65); // Deep Teal/Blue
      vec3 c2 = vec3(0.45, 0.12, 0.68); // Purple/Violet
      vec3 finalColor = mix(c1, c2, combined);

      float alpha = sin(uv.x * 3.14159) * pow(combined, 1.5) * uOpacity;
      gl_FragColor = vec4(finalColor, alpha);
    }
  `,
};

export default function ParticleWaveBackground() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const warpIntensityRef = useRef(0);
  const prevPathnameRef = useRef(pathname);
  const textMorphProgressRef = useRef(0);

  // Material Refs
  const nebulaMaterialRef = useRef<THREE.PointsMaterial | null>(null);
  const zTunnelMaterialRef = useRef<THREE.PointsMaterial | null>(null);
  const bokehMaterialRef = useRef<THREE.PointsMaterial | null>(null);
  const fireflyMaterialRef = useRef<THREE.PointsMaterial | null>(null);
  const foregroundDustMaterialRef = useRef<THREE.PointsMaterial | null>(null);
  const crmMaterialRef = useRef<THREE.PointsMaterial | null>(null);
  const auroraMaterialRef = useRef<THREE.ShaderMaterial | null>(null);

  const checkIsCrmPage = (path: string) => {
    const cleanPath = path.toLowerCase();
    return (
      cleanPath.includes("multicrm") ||
      cleanPath.includes("multi-crm") ||
      cleanPath.includes("/crm")
    );
  };

  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      const targetConfig = ROUTE_SPATIAL_MAP[pathname] || DEFAULT_COORDINATES;
      warpIntensityRef.current = targetConfig.warpIntensity || 1.8;
    }
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (container.hasChildNodes()) {
      container.innerHTML = "";
    }

    // --- Scene & Camera Setup ---
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020617, 0.0006);

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      3000
    );
    camera.position.set(0, 0, 45);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Dynamic World Coordinate Projection Target
    const mouseWorldPos = new THREE.Vector3(9999, 9999, 0);

    // Shockwave State Array
    const shockwaves: { ring: THREE.Mesh; opacity: number; scale: number }[] =
      [];

    const triggerShockwave = (x: number, y: number, z: number) => {
      const geometry = new THREE.RingGeometry(0.2, 0.8, 64);
      const material = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
      });
      const ring = new THREE.Mesh(geometry, material);
      ring.position.set(x, y, z);
      scene.add(ring);
      shockwaves.push({ ring, opacity: 0.8, scale: 1 });
    };

    const handleGlobalClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (target) {
        const href = target.getAttribute("href");
        if (href && href.startsWith("/")) {
          const targetConfig = ROUTE_SPATIAL_MAP[href] || DEFAULT_COORDINATES;
          warpIntensityRef.current = targetConfig.warpIntensity || 1.8;
          pathnameRef.current = href;
        }
      }

      // Convert Click to 3D Space and trigger Shockwave
      const clickX = (e.clientX / window.innerWidth - 0.5) * 2.0;
      const clickY = (e.clientY / window.innerHeight - 0.5) * 2.0;
      const vector = new THREE.Vector3(clickX, -clickY, 0.5);
      vector.unproject(camera);
      const dir = vector.sub(camera.position).normalize();
      const distance = -camera.position.z / dir.z;
      const pos = camera.position.clone().add(dir.multiplyScalar(distance));
      triggerShockwave(pos.x, pos.y, pos.z);
    };
    document.addEventListener("click", handleGlobalClick);

    // --- Texture Generator Helpers ---
    const createStarTexture = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, "rgba(255, 255, 255, 1.0)");
        gradient.addColorStop(0.25, "rgba(224, 242, 254, 0.9)");
        gradient.addColorStop(0.55, "rgba(14, 165, 233, 0.35)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
      }
      return new THREE.CanvasTexture(canvas);
    };

    const createBokehTexture = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        gradient.addColorStop(0, "rgba(255, 255, 255, 0.85)");
        gradient.addColorStop(0.35, "rgba(255, 255, 255, 0.35)");
        gradient.addColorStop(0.7, "rgba(255, 255, 255, 0.08)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);
      }
      return new THREE.CanvasTexture(canvas);
    };

    const createBeamTexture = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 128, 512);
        gradient.addColorStop(0, "rgba(56, 189, 248, 0.0)");
        gradient.addColorStop(0.3, "rgba(56, 189, 248, 0.25)");
        gradient.addColorStop(0.7, "rgba(168, 85, 247, 0.2)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0.0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 512);
      }
      return new THREE.CanvasTexture(canvas);
    };

    const starTexture = createStarTexture();
    const bokehTexture = createBokehTexture();
    const beamTexture = createBeamTexture();

    const getSpatialColor = (xNorm: number) => {
      const isWarm = xNorm > 0.52 || Math.random() < 0.25;
      let hue: number, saturation: number, lightness: number;
      if (isWarm) {
        hue = 0.07 + Math.random() * 0.05;
        saturation = 0.92;
        lightness = 0.5 + Math.random() * 0.3;
      } else {
        hue = 0.54 + Math.random() * 0.08;
        saturation = 0.88;
        lightness = 0.45 + Math.random() * 0.35;
      }
      return new THREE.Color().setHSL(hue, saturation, lightness);
    };

    // --- Text Sampling ---
    const generateTextCoordinates = () => {
      const tCanvas = document.createElement("canvas");
      tCanvas.width = 2400;
      tCanvas.height = 800;
      const tCtx = tCanvas.getContext("2d");
      if (!tCtx) return [];

      tCtx.fillStyle = "#000000";
      tCtx.fillRect(0, 0, tCanvas.width, tCanvas.height);

      tCtx.fillStyle = "#ffffff";
      tCtx.font = "900 135px 'Inter', system-ui, sans-serif";
      tCtx.textAlign = "center";
      tCtx.textBaseline = "middle";
      tCtx.fillText("MULTI-CRM", tCanvas.width / 2, tCanvas.height / 2 - 50);

      tCtx.font = "800 42px 'Inter', system-ui, sans-serif";
      tCtx.letterSpacing = "10px";
      tCtx.fillText("ORCHESTRATOR", tCanvas.width / 2, tCanvas.height / 2 + 65);

      const imgData = tCtx.getImageData(0, 0, tCanvas.width, tCanvas.height);
      const pixels = imgData.data;
      const coords: THREE.Vector3[] = [];

      const step = 3;
      for (let y = 0; y < tCanvas.height; y += step) {
        for (let x = 0; x < tCanvas.width; x += step) {
          const index = (y * tCanvas.width + x) * 4;
          if (pixels[index] > 100) {
            const posX = (x - tCanvas.width / 2) * 0.0125;
            const posY = -(y - tCanvas.height / 2) * 0.0125;
            const posZ = (Math.random() - 0.5) * 0.2;
            coords.push(new THREE.Vector3(posX, posY, posZ));
          }
        }
      }
      return coords;
    };

    const textData = generateTextCoordinates();

    // =========================================================================
    // LAYER 1: COSMIC FILAMENT & AURORA SHADER WAVE
    // =========================================================================
    const auroraGeo = new THREE.PlaneGeometry(240, 120);
    auroraMaterialRef.current = new THREE.ShaderMaterial({
      vertexShader: AuroraShader.vertexShader,
      fragmentShader: AuroraShader.fragmentShader,
      uniforms: THREE.UniformsUtils.clone(AuroraShader.uniforms),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const auroraMesh = new THREE.Mesh(auroraGeo, auroraMaterialRef.current);
    auroraMesh.position.set(0, 10, -90);
    scene.add(auroraMesh);

    // =========================================================================
    // LAYER 2: VOLUMETRIC LIGHT SHAFTS (GOD RAYS)
    // =========================================================================
    const lightShaftGroup = new THREE.Group();
    const shaftGeo = new THREE.PlaneGeometry(25, 220);
    const shaftMat = new THREE.MeshBasicMaterial({
      map: beamTexture,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    for (let i = 0; i < 5; i++) {
      const shaft = new THREE.Mesh(shaftGeo, shaftMat);
      shaft.position.set((i - 2) * 45, 10, -50 + i * 5);
      shaft.rotation.z = -0.45 + (Math.random() - 0.5) * 0.1;
      lightShaftGroup.add(shaft);
    }
    scene.add(lightShaftGroup);

    // =========================================================================
    // LAYER 3: AMBIENT DEEP NEBULA DUST
    // =========================================================================
    const nebulaCount = 28000;
    const nebulaGeometry = new THREE.BufferGeometry();
    const nebulaPositions = new Float32Array(nebulaCount * 3);
    const nebulaColors = new Float32Array(nebulaCount * 3);

    for (let i = 0; i < nebulaCount; i++) {
      const x = (Math.random() - 0.5) * 240;
      const y = (Math.random() - 0.5) * 160;
      const z = (Math.random() - 0.5) * 200 - 40;

      nebulaPositions[i * 3] = x;
      nebulaPositions[i * 3 + 1] = y;
      nebulaPositions[i * 3 + 2] = z;

      const col = getSpatialColor((x + 120) / 240);
      nebulaColors[i * 3] = col.r;
      nebulaColors[i * 3 + 1] = col.g;
      nebulaColors[i * 3 + 2] = col.b;
    }

    nebulaGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(nebulaPositions, 3)
    );
    nebulaGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(nebulaColors, 3)
    );

    nebulaMaterialRef.current = new THREE.PointsMaterial({
      size: 0.42,
      map: starTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const nebulaCloud = new THREE.Points(
      nebulaGeometry,
      nebulaMaterialRef.current
    );
    scene.add(nebulaCloud);

    // =========================================================================
    // LAYER 4: CONTINUOUS Z-TUNNEL DRIFT PARTICLES
    // =========================================================================
    const zTunnelCount = 3500;
    const zTunnelGeometry = new THREE.BufferGeometry();
    const zTunnelPositions = new Float32Array(zTunnelCount * 3);
    const zTunnelSpeeds = new Float32Array(zTunnelCount);
    const zTunnelColors = new Float32Array(zTunnelCount * 3);

    for (let i = 0; i < zTunnelCount; i++) {
      const x = (Math.random() - 0.5) * 200;
      const y = (Math.random() - 0.5) * 130;
      const z = (Math.random() - 0.5) * 250;

      zTunnelPositions[i * 3] = x;
      zTunnelPositions[i * 3 + 1] = y;
      zTunnelPositions[i * 3 + 2] = z;

      zTunnelSpeeds[i] = 0.15 + Math.random() * 0.35;

      const col = getSpatialColor((x + 100) / 200);
      zTunnelColors[i * 3] = col.r;
      zTunnelColors[i * 3 + 1] = col.g;
      zTunnelColors[i * 3 + 2] = col.b;
    }

    zTunnelGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(zTunnelPositions, 3)
    );
    zTunnelGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(zTunnelColors, 3)
    );

    zTunnelMaterialRef.current = new THREE.PointsMaterial({
      size: 0.65,
      map: starTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const zTunnelParticles = new THREE.Points(
      zTunnelGeometry,
      zTunnelMaterialRef.current
    );
    scene.add(zTunnelParticles);

    // =========================================================================
    // LAYER 5: HYPER-VELOCITY SHOOTING STARS / METEORS
    // =========================================================================
    const meteorCount = 6;
    const meteors: {
      line: THREE.Line;
      positions: Float32Array;
      speed: number;
      active: boolean;
      length: number;
    }[] = [];

    for (let i = 0; i < meteorCount; i++) {
      const meteorGeo = new THREE.BufferGeometry();
      const posArray = new Float32Array(6);
      meteorGeo.setAttribute(
        "position",
        new THREE.BufferAttribute(posArray, 3)
      );

      const meteorMat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
      });

      const line = new THREE.Line(meteorGeo, meteorMat);
      scene.add(line);

      meteors.push({
        line,
        positions: posArray,
        speed: 1.8 + Math.random() * 1.5,
        active: false,
        length: 12 + Math.random() * 8,
      });
    }

    const resetMeteor = (index: number) => {
      const m = meteors[index];
      const startX = (Math.random() - 0.5) * 180;
      const startY = 60 + Math.random() * 20;
      const startZ = (Math.random() - 0.5) * 80;

      m.positions[0] = startX;
      m.positions[1] = startY;
      m.positions[2] = startZ;
      m.positions[3] = startX + m.length * 0.6;
      m.positions[4] = startY + m.length;
      m.positions[5] = startZ - m.length * 0.4;

      m.line.geometry.attributes.position.needsUpdate = true;
      m.active = true;
    };

    // =========================================================================
    // LAYER 6: CINEMATIC BOKEH GLOW DISCS
    // =========================================================================
    const bokehCount = 650;
    const bokehGeometry = new THREE.BufferGeometry();
    const bokehPositions = new Float32Array(bokehCount * 3);
    const bokehColors = new Float32Array(bokehCount * 3);

    for (let i = 0; i < bokehCount; i++) {
      const x = (Math.random() - 0.5) * 190;
      const y = (Math.random() - 0.5) * 125;
      const z = (Math.random() - 0.5) * 120 + 10;

      bokehPositions[i * 3] = x;
      bokehPositions[i * 3 + 1] = y;
      bokehPositions[i * 3 + 2] = z;

      const col = getSpatialColor((x + 95) / 190);
      bokehColors[i * 3] = col.r;
      bokehColors[i * 3 + 1] = col.g;
      bokehColors[i * 3 + 2] = col.b;
    }

    bokehGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(bokehPositions, 3)
    );
    bokehGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(bokehColors, 3)
    );

    bokehMaterialRef.current = new THREE.PointsMaterial({
      size: 3.9,
      map: bokehTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const bokehField = new THREE.Points(
      bokehGeometry,
      bokehMaterialRef.current
    );
    scene.add(bokehField);

    // =========================================================================
    // LAYER 7: ACTIVE FLOATING FIREFLIES & GRAVITY-AFFECTED PARTICLES
    // =========================================================================
    const fireflyCount = 1800;
    const fireflyGeometry = new THREE.BufferGeometry();
    const fireflyPositions = new Float32Array(fireflyCount * 3);
    const fireflyBasePositions = new Float32Array(fireflyCount * 3);
    const fireflyVelocities = new Float32Array(fireflyCount * 3);
    const fireflyColors = new Float32Array(fireflyCount * 3);

    for (let i = 0; i < fireflyCount; i++) {
      const x = (Math.random() - 0.5) * 160;
      const y = (Math.random() - 0.5) * 90;
      const z = (Math.random() - 0.5) * 120;

      fireflyPositions[i * 3] = x;
      fireflyPositions[i * 3 + 1] = y;
      fireflyPositions[i * 3 + 2] = z;

      fireflyBasePositions[i * 3] = x;
      fireflyBasePositions[i * 3 + 1] = y;
      fireflyBasePositions[i * 3 + 2] = z;

      fireflyVelocities[i * 3] = (Math.random() - 0.5) * 0.035;
      fireflyVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.035;
      fireflyVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.035;

      const col = getSpatialColor((x + 80) / 160);
      fireflyColors[i * 3] = col.r;
      fireflyColors[i * 3 + 1] = col.g;
      fireflyColors[i * 3 + 2] = col.b;
    }

    fireflyGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(fireflyPositions, 3)
    );
    fireflyGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(fireflyColors, 3)
    );

    fireflyMaterialRef.current = new THREE.PointsMaterial({
      size: 0.88,
      map: starTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const fireflies = new THREE.Points(
      fireflyGeometry,
      fireflyMaterialRef.current
    );
    scene.add(fireflies);

    // =========================================================================
    // LAYER 8: CONSTELLATION / NEURAL NETWORK DYNAMIC LINES
    // =========================================================================
    const nodeCount = 75;
    const maxLineConnections = nodeCount * 4;
    const constellationPositions = new Float32Array(maxLineConnections * 6);
    const constellationGeo = new THREE.BufferGeometry();
    const constellationMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
    });

    const constellationLines = new THREE.LineSegments(
      constellationGeo,
      constellationMat
    );
    scene.add(constellationLines);

    // =========================================================================
    // LAYER 9: FOREGROUND SLOW DUST (NEAR CAMERA DEPTH)
    // =========================================================================
    const fgDustCount = 350;
    const fgDustGeometry = new THREE.BufferGeometry();
    const fgDustPositions = new Float32Array(fgDustCount * 3);
    const fgDustColors = new Float32Array(fgDustCount * 3);

    for (let i = 0; i < fgDustCount; i++) {
      const x = (Math.random() - 0.5) * 90;
      const y = (Math.random() - 0.5) * 50;
      const z = Math.random() * 25 + 20;

      fgDustPositions[i * 3] = x;
      fgDustPositions[i * 3 + 1] = y;
      fgDustPositions[i * 3 + 2] = z;

      const col = getSpatialColor((x + 45) / 90);
      fgDustColors[i * 3] = col.r;
      fgDustColors[i * 3 + 1] = col.g;
      fgDustColors[i * 3 + 2] = col.b;
    }

    fgDustGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(fgDustPositions, 3)
    );
    fgDustGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(fgDustColors, 3)
    );

    foregroundDustMaterialRef.current = new THREE.PointsMaterial({
      size: 1.8,
      map: starTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const fgDustField = new THREE.Points(
      fgDustGeometry,
      foregroundDustMaterialRef.current
    );
    scene.add(fgDustField);

    // =========================================================================
    // LAYER 10: CRM VOID & TEXT MORPH SYSTEM
    // =========================================================================
    const crmParticles = 28000;
    const crmGeometry = new THREE.BufferGeometry();
    const crmPositions = new Float32Array(crmParticles * 3);
    const crmVoidOriginals = new Float32Array(crmParticles * 3);
    const crmColors = new Float32Array(crmParticles * 3);
    const crmTextTargetIndices = new Int32Array(crmParticles);

    const innerRadius = 4.8;

    for (let i = 0; i < crmParticles; i++) {
      let vx: number, vy: number, vz: number;

      if (i < crmParticles * 0.2) {
        const ringAngle = Math.random() * Math.PI * 2;
        const ringDist = innerRadius + Math.pow(Math.random(), 1.8) * 3.5;
        vx = Math.cos(ringAngle) * ringDist;
        vy = Math.sin(ringAngle) * ringDist;
        vz = (Math.random() - 0.5) * 1.2;
      } else {
        const radius = innerRadius + Math.pow(Math.random(), 0.8) * 60;
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);

        vx = radius * Math.sin(phi) * Math.cos(theta);
        vy = radius * Math.sin(phi) * Math.sin(theta);
        vz = (Math.random() - 0.5) * 45;

        const centerDist2D = Math.sqrt(vx * vx + vy * vy);
        if (centerDist2D < innerRadius) {
          const pushAngle = Math.atan2(vy, vx);
          vx = Math.cos(pushAngle) * (innerRadius + Math.random() * 0.5);
          vy = Math.sin(pushAngle) * (innerRadius + Math.random() * 0.5);
        }
      }

      crmVoidOriginals[i * 3] = vx;
      crmVoidOriginals[i * 3 + 1] = vy;
      crmVoidOriginals[i * 3 + 2] = vz;

      crmPositions[i * 3] = vx;
      crmPositions[i * 3 + 1] = vy;
      crmPositions[i * 3 + 2] = vz;

      const distFromCenter = Math.sqrt(vx * vx + vy * vy);
      const col = getSpatialColor(0.2);

      crmColors[i * 3] = col.r;
      crmColors[i * 3 + 1] = col.g;
      crmColors[i * 3 + 2] = col.b;

      if (distFromCenter < innerRadius + 5.0 && Math.random() < 0.4) {
        crmTextTargetIndices[i] = Math.floor(
          Math.random() * (textData.length || 1)
        );
      } else {
        crmTextTargetIndices[i] = -1;
      }
    }

    crmGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(crmPositions, 3)
    );
    crmGeometry.setAttribute("color", new THREE.BufferAttribute(crmColors, 3));

    crmMaterialRef.current = new THREE.PointsMaterial({
      size: 0.38,
      map: starTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const crmPointCloud = new THREE.Points(crmGeometry, crmMaterialRef.current);
    scene.add(crmPointCloud);

    // --- Mouse Event Handler ---
    let mouseX = 0,
      mouseY = 0;
    let targetMouseX = 0,
      targetMouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2.0;
      targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2.0;

      const vector = new THREE.Vector3(targetMouseX, -targetMouseY, 0.5);
      vector.unproject(camera);
      const dir = vector.sub(camera.position).normalize();
      const distance = -camera.position.z / dir.z;
      mouseWorldPos.copy(
        camera.position.clone().add(dir.multiplyScalar(distance))
      );
    };
    window.addEventListener("mousemove", handleMouseMove);

    let animationFrameId: number;
    const clock = new THREE.Clock();

    // =========================================================================
    // MAIN MULTI-LAYER ANIMATION LOOP
    // =========================================================================
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      warpIntensityRef.current *= 0.91;
      const warp = warpIntensityRef.current;

      const currentPath = pathnameRef.current;
      const isCrmPage = checkIsCrmPage(currentPath);

      const targetMorph = isCrmPage ? 1 : 0;
      textMorphProgressRef.current +=
        (targetMorph - textMorphProgressRef.current) * 0.05;
      const morphProgress = textMorphProgressRef.current;
      const standardOpacity = Math.max(0, 1 - morphProgress);

      // --- UPDATE AURORA UNIFORMS ---
      if (auroraMaterialRef.current) {
        auroraMaterialRef.current.uniforms.uTime.value = elapsed;
        auroraMaterialRef.current.uniforms.uOpacity.value =
          0.35 * standardOpacity;
      }

      // --- BREATHING PULSE SINES ---
      const nebulaBreath = Math.sin(elapsed * 1.1) * 0.15 + 0.85;
      const zTunnelBreath = Math.sin(elapsed * 1.8 + 0.5) * 0.2 + 0.8;
      const bokehBreath = Math.sin(elapsed * 0.75 + 1.2) * 0.22 + 0.78;
      const fireflyBreath = Math.sin(elapsed * 2.2 + 2.0) * 0.15 + 0.85;

      if (nebulaMaterialRef.current)
        nebulaMaterialRef.current.opacity =
          0.7 * standardOpacity * nebulaBreath;
      if (zTunnelMaterialRef.current)
        zTunnelMaterialRef.current.opacity =
          0.8 * standardOpacity * zTunnelBreath;
      if (bokehMaterialRef.current)
        bokehMaterialRef.current.opacity = 0.45 * standardOpacity * bokehBreath;
      if (fireflyMaterialRef.current)
        fireflyMaterialRef.current.opacity =
          0.85 * standardOpacity * fireflyBreath;
      if (foregroundDustMaterialRef.current)
        foregroundDustMaterialRef.current.opacity = 0.6 * standardOpacity;

      if (crmMaterialRef.current) {
        crmMaterialRef.current.opacity = 0.95 * morphProgress;
      }

      // --- SPATIAL CAMERA POSITIONING ---
      const targetConfig =
        ROUTE_SPATIAL_MAP[currentPath] || DEFAULT_COORDINATES;
      camera.position.x +=
        (targetConfig.x + mouseX * 3.0 - camera.position.x) * 0.04;
      camera.position.y +=
        (-targetConfig.y - mouseY * 2.5 - camera.position.y) * 0.04;
      camera.position.z +=
        (45 + targetConfig.z - warp * 16 - camera.position.z) * 0.04;

      camera.rotation.x = mouseY * 0.025;
      camera.rotation.y = mouseX * 0.035;

      // --- VOLUMETRIC GOD RAYS MOTION ---
      lightShaftGroup.children.forEach((shaft, idx) => {
        shaft.rotation.z = -0.45 + Math.sin(elapsed * 0.4 + idx) * 0.04;
        const mat = (shaft as THREE.Mesh).material as THREE.MeshBasicMaterial;
        if (mat) {
          mat.opacity =
            (0.25 + Math.sin(elapsed * 0.8 + idx) * 0.1) * standardOpacity;
        }
      });

      // --- METEOR / SHOOTING STARS UPDATE ---
      if (standardOpacity > 0.001) {
        meteors.forEach((m, idx) => {
          if (!m.active && Math.random() < 0.008) {
            resetMeteor(idx);
          }
          if (m.active) {
            m.positions[0] -= m.speed;
            m.positions[1] -= m.speed * 1.4;
            m.positions[3] -= m.speed;
            m.positions[4] -= m.speed * 1.4;

            m.line.geometry.attributes.position.needsUpdate = true;

            if (m.positions[1] < -80) {
              m.active = false;
            }
          }
        });

        // --- Z-TUNNEL MOTION ---
        const zTunnelPosAttr = zTunnelParticles.geometry.attributes.position;
        for (let i = 0; i < zTunnelCount; i++) {
          let cz = zTunnelPosAttr.getZ(i) - zTunnelSpeeds[i] * (1 + warp * 2.0);
          if (cz < -180) {
            cz = 80 + Math.random() * 20;
            zTunnelPosAttr.setX(i, (Math.random() - 0.5) * 200);
            zTunnelPosAttr.setY(i, (Math.random() - 0.5) * 130);
          }
          zTunnelPosAttr.setZ(i, cz);
        }
        zTunnelPosAttr.needsUpdate = true;

        // --- FIREFLIES + MOUSE GRAVITATIONAL ATTRACTOR LENS ---
        const ffPosAttr = fireflies.geometry.attributes.position;
        for (let i = 0; i < fireflyCount; i++) {
          let fx = ffPosAttr.getX(i) + fireflyVelocities[i * 3];
          let fy = ffPosAttr.getY(i) + Math.sin(elapsed * 1.2 + i) * 0.012;
          let fz = ffPosAttr.getZ(i) + fireflyVelocities[i * 3 + 2];

          // Gravitational Lens Offset
          const dx = mouseWorldPos.x - fx;
          const dy = mouseWorldPos.y - fy;
          const distToMouse = Math.sqrt(dx * dx + dy * dy);

          if (distToMouse < 22) {
            const pull = (1 - distToMouse / 22) * 0.08;
            fx += dx * pull;
            fy += dy * pull;
          }

          if (Math.abs(fx) > 85) fx = (Math.random() - 0.5) * 165;
          if (Math.abs(fy) > 48) fy = (Math.random() - 0.5) * 95;
          if (Math.abs(fz) > 65) fz = (Math.random() - 0.5) * 125;

          ffPosAttr.setXYZ(i, fx, fy, fz);
        }
        ffPosAttr.needsUpdate = true;

        // --- CONSTELLATION / NEURAL CONNECTIONS UPDATE ---
        let lineVertexIndex = 0;
        for (let i = 0; i < nodeCount; i++) {
          const x1 = ffPosAttr.getX(i);
          const y1 = ffPosAttr.getY(i);
          const z1 = ffPosAttr.getZ(i);

          for (let j = i + 1; j < nodeCount; j++) {
            const x2 = ffPosAttr.getX(j);
            const y2 = ffPosAttr.getY(j);
            const z2 = ffPosAttr.getZ(j);

            const dist = Math.sqrt(
              (x1 - x2) ** 2 + (y1 - y2) ** 2 + (z1 - z2) ** 2
            );

            if (dist < 14) {
              constellationPositions[lineVertexIndex++] = x1;
              constellationPositions[lineVertexIndex++] = y1;
              constellationPositions[lineVertexIndex++] = z1;
              constellationPositions[lineVertexIndex++] = x2;
              constellationPositions[lineVertexIndex++] = y2;
              constellationPositions[lineVertexIndex++] = z2;
            }
          }
        }
        constellationGeo.setAttribute(
          "position",
          new THREE.BufferAttribute(
            constellationPositions.subarray(0, lineVertexIndex),
            3
          )
        );
        constellationGeo.attributes.position.needsUpdate = true;
      }

      // --- SHOCKWAVES PROPAGATION & CLEANUP ---
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.scale += 1.8;
        sw.opacity -= 0.025;
        sw.ring.scale.set(sw.scale, sw.scale, 1);

        const ringMat = sw.ring.material as THREE.MeshBasicMaterial;
        if (ringMat) {
          ringMat.opacity = Math.max(0, sw.opacity);
        }

        if (sw.opacity <= 0) {
          scene.remove(sw.ring);
          sw.ring.geometry.dispose();
          if (Array.isArray(sw.ring.material)) {
            sw.ring.material.forEach((m) => m.dispose());
          } else {
            sw.ring.material.dispose();
          }
          shockwaves.splice(i, 1);
        }
      }

      // --- CRM TEXT MORPH ANIMATION ---
      if (morphProgress > 0.001) {
        const crmPosAttr = crmPointCloud.geometry.attributes.position;
        for (let i = 0; i < crmParticles; i++) {
          const cx = crmVoidOriginals[i * 3];
          const cy = crmVoidOriginals[i * 3 + 1];
          const cz = crmVoidOriginals[i * 3 + 2];

          const dist = Math.sqrt(cx * cx + cy * cy);
          const rotAngle = (0.04 / Math.max(1, dist * 0.15)) * elapsed;
          const currentAngle = Math.atan2(cy, cx) + rotAngle;

          const rotX = Math.cos(currentAngle) * dist;
          const rotY = Math.sin(currentAngle) * dist;
          const rotZ = cz + Math.sin(elapsed * 1.2 + dist) * 0.12;

          const targetIdx = crmTextTargetIndices[i];

          let finalX = rotX;
          let finalY = rotY;
          let finalZ = rotZ;

          if (targetIdx !== -1 && textData.length > 0) {
            const textTarget = textData[targetIdx % textData.length];
            finalX = THREE.MathUtils.lerp(rotX, textTarget.x, morphProgress);
            finalY = THREE.MathUtils.lerp(rotY, textTarget.y, morphProgress);
            finalZ = THREE.MathUtils.lerp(rotZ, textTarget.z, morphProgress);
          }

          crmPosAttr.setXYZ(i, finalX, finalY, finalZ);
        }
        crmPosAttr.needsUpdate = true;
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
      document.removeEventListener("click", handleGlobalClick);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);

      starTexture.dispose();
      bokehTexture.dispose();
      beamTexture.dispose();

      auroraGeo.dispose();
      auroraMaterialRef.current?.dispose();
      nebulaMaterialRef.current?.dispose();
      zTunnelMaterialRef.current?.dispose();
      bokehMaterialRef.current?.dispose();
      fireflyMaterialRef.current?.dispose();
      foregroundDustMaterialRef.current?.dispose();
      crmMaterialRef.current?.dispose();

      nebulaGeometry.dispose();
      zTunnelGeometry.dispose();
      bokehGeometry.dispose();
      fireflyGeometry.dispose();
      fgDustGeometry.dispose();
      crmGeometry.dispose();
      constellationGeo.dispose();
      constellationMat.dispose();

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-slate-950"
    />
  );
}
