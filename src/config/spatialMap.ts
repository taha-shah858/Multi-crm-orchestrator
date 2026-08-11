export interface SpatialCoordinates {
  x: number;
  y: number;
  z: number;
  rotX: number;
  rotY: number;
  warpIntensity: number; // Unique hyperspace punch when arriving here
  springStiffness: number; // Unique acceleration/deceleration feel
}

export const DEFAULT_COORDINATES: SpatialCoordinates = {
  x: 0,
  y: 0,
  z: 0,
  rotX: 0,
  rotY: 0,
  warpIntensity: 1.5,
  springStiffness: 0.045,
};

export const ROUTE_SPATIAL_MAP: Record<string, SpatialCoordinates> = {
  // Main Hub: Balanced, smooth return to center
  "/": DEFAULT_COORDINATES,

  // Multi-CRM Suite: Custom cinematic framing & heavy warp punch for the 3D text morph
  "/multi-crm": {
    x: 0,
    y: 0,
    z: 2,
    rotX: 0,
    rotY: 0,
    warpIntensity: 3.2,
    springStiffness: 0.04,
  },

  // Integrations Hub: Sharp, aggressive banking turn
  "/integrations": {
    x: -8,
    y: 3,
    z: -6,
    rotX: 0.06,
    rotY: 0.18,
    warpIntensity: 2.5,
    springStiffness: 0.06,
  },

  // Unified Lead Directory: Dynamic wide sweep
  "/leads": {
    x: 10,
    y: -2,
    z: -10,
    rotX: -0.05,
    rotY: -0.2,
    warpIntensity: 2.8,
    springStiffness: 0.04,
  },

  // Twilio Smart Dialer: Focused forward entry
  "/dialer": {
    x: -5,
    y: -4,
    z: -8,
    rotX: -0.1,
    rotY: 0.1,
    warpIntensity: 3.0,
    springStiffness: 0.05,
  },

  // Aggregation Timeline: Deep linear tunnel thrust
  "/timeline": {
    x: 12,
    y: 2,
    z: -14,
    rotX: 0.04,
    rotY: -0.22,
    warpIntensity: 3.4,
    springStiffness: 0.035,
  },

  // AI Copilot Suite: Immersive forward dive into neural space
  "/copilot": {
    x: 0,
    y: -3,
    z: -12,
    rotX: -0.12,
    rotY: 0,
    warpIntensity: 3.0,
    springStiffness: 0.055,
  },

  // Telemetry & Logs: High-angle technical grid view
  "/telemetry": {
    x: -10,
    y: 6,
    z: -10,
    rotX: 0.15,
    rotY: 0.15,
    warpIntensity: 2.6,
    springStiffness: 0.045,
  },

  // Calendar Planner: Soft architectural glide
  "/calendar": {
    x: 6,
    y: 5,
    z: -7,
    rotX: 0.12,
    rotY: -0.12,
    warpIntensity: 2.0,
    springStiffness: 0.03,
  },
};
