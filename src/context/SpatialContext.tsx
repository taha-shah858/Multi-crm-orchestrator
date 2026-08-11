"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ROUTE_SPATIAL_MAP,
  DEFAULT_COORDINATES,
  SpatialCoordinates,
} from "@/config/spatialMap";

interface SpatialContextType {
  currentCoords: SpatialCoordinates;
  targetCoords: SpatialCoordinates;
}

const SpatialContext = createContext<SpatialContextType>({
  currentCoords: DEFAULT_COORDINATES,
  targetCoords: DEFAULT_COORDINATES,
});

export function SpatialProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [targetCoords, setTargetCoords] =
    useState<SpatialCoordinates>(DEFAULT_COORDINATES);
  const [currentCoords, setCurrentCoords] =
    useState<SpatialCoordinates>(DEFAULT_COORDINATES);

  // Update target coordinates whenever route changes
  useEffect(() => {
    const coords = ROUTE_SPATIAL_MAP[pathname] || DEFAULT_COORDINATES;
    setTargetCoords(coords);
  }, [pathname]);

  // Smooth internal interpolation ticker for non-Three.js UI feedback and dynamic transition values
  useEffect(() => {
    let animationFrameId: number;

    const updateInterpolation = () => {
      setCurrentCoords((prev) => ({
        x: prev.x + (targetCoords.x - prev.x) * 0.05,
        y: prev.y + (targetCoords.y - prev.y) * 0.05,
        z: prev.z + (targetCoords.z - prev.z) * 0.05,
        rotX: prev.rotX + (targetCoords.rotX - prev.rotX) * 0.05,
        rotY: prev.rotY + (targetCoords.rotY - prev.rotY) * 0.05,
        warpIntensity:
          prev.warpIntensity +
          (targetCoords.warpIntensity - prev.warpIntensity) * 0.05,
        springStiffness: targetCoords.springStiffness,
      }));
      animationFrameId = requestAnimationFrame(updateInterpolation);
    };

    animationFrameId = requestAnimationFrame(updateInterpolation);
    return () => cancelAnimationFrame(animationFrameId);
  }, [targetCoords]);

  return (
    <SpatialContext.Provider value={{ currentCoords, targetCoords }}>
      {children}
    </SpatialContext.Provider>
  );
}

export const useSpatial = () => useContext(SpatialContext);
