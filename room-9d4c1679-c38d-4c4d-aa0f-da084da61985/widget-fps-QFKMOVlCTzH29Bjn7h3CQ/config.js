// =============================================================================
// GAME CONFIGURATION
// =============================================================================

export const CONFIG = {
  // Rendering settings
  FIELD_OF_VIEW: 60,           // Degrees
  RENDER_DISTANCE: 16,         // Units (how far the player can see)
  RAYS_PER_PIXEL: 2.5,         // One ray per N pixels (controls quality vs performance)

  // Player movement
  MOVE_SPEED: 0.08,            // Units per frame
  ROTATION_SPEED: 0.05,        // Radians per frame
  MOUSE_SENSITIVITY: 0.002,    // Mouse look sensitivity
  MAX_PITCH: 60,               // Max vertical look angle in degrees

  // Player stats
  STARTING_HEALTH: 100,
  STARTING_AMMO: 20,
  MAX_AMMO: 50,

  // Height system
  MAX_STEP_HEIGHT: 0.25,    // Max floor height diff player/enemies can step up
  MIN_CLEARANCE: 0.5,       // Min ceiling-floor gap to pass through
  EYE_HEIGHT: 0.5,          // Eye height above floor
  HEIGHT_LERP_SPEED: 0.15,  // Smooth height transition rate per frame

  // Derived values (computed once)
  get FOV_RADIANS() { return this.FIELD_OF_VIEW * (Math.PI / 180); },
  get HALF_FOV() { return this.FOV_RADIANS / 2; },
};

/**
 * Dynamic canvas dimensions - recalculated on resize
 */
export class CanvasDimensions {
  constructor() {
    this.update();
  }

  update() {
    this.width = Math.max(800, window.innerWidth || 800);
    this.height = Math.max(600, window.innerHeight || 600);
    this.halfWidth = this.width / 2;
    this.halfHeight = this.height / 2;
    this.numRays = Math.floor(this.width / CONFIG.RAYS_PER_PIXEL);
    this.wallHeightConstant = this.height / 600;
  }
}

// Global instance that will be updated on resize
export const canvasDims = new CanvasDimensions();

// Wall height projection constant
export const WALL_HEIGHT_CONSTANT = 1.0;
