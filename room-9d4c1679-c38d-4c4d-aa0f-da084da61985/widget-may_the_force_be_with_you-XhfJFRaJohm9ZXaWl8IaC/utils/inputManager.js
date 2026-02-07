// Input manager for keyboard controls

export class InputManager {
  constructor() {
    this.keys = {};
    this.enabled = true;
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
  }

  init() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  handleKeyDown(e) {
    if (!this.enabled) return;
    
    const key = e.key.toLowerCase();
    this.keys[key] = true;
    
    // Prevent arrow key scrolling
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      e.preventDefault();
    }
  }

  handleKeyUp(e) {
    const key = e.key.toLowerCase();
    this.keys[key] = false;
  }

  isKeyPressed(key) {
    return this.enabled && this.keys[key.toLowerCase()];
  }

  isAnyKeyPressed(keys) {
    return keys.some(key => this.isKeyPressed(key));
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.keys = {};
    }
  }

  reset() {
    this.keys = {};
  }
}
