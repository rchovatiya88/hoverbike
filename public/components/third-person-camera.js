
/**
 * Third-person camera component that follows the player entity
 */
if (!AFRAME.components['third-person-camera']) {
  AFRAME.registerComponent('third-person-camera', {
  schema: {
    target: { type: 'selector', default: '#player' },
    distance: { type: 'number', default: 6 },
    height: { type: 'number', default: 3 },
    lookAtHeight: { type: 'number', default: 1.5 },
    rotationSpeed: { type: 'number', default: 10 },
    smoothing: { type: 'number', default: 10 }
  },

  init: function () {
    this.cameraPosition = new THREE.Vector3();
    this.targetPosition = new THREE.Vector3();
    this.targetRotation = new THREE.Euler();
    
    // Create a look target offset above the player
    this.lookTarget = new THREE.Vector3();
    
    // Store references to avoid garbage collection
    this.cameraEl = this.el.querySelector('#camera');
    this.targetEl = this.data.target;
    
    // Make sure we have valid references
    if (!this.cameraEl) {
      console.error('No camera found within the entity with third-person-camera');
      return;
    }
    if (!this.targetEl) {
      console.error('No target found for third-person-camera');
      return;
    }
    
    console.log('Third-person camera initialized, following:', this.targetEl.id);
  },
  
  tick: function (time, delta) {
    if (!this.targetEl || !this.cameraEl) return;

    const dt = delta / 1000;
    
    // Get target position and add height offset
    this.targetEl.object3D.getWorldPosition(this.targetPosition);
    this.lookTarget.copy(this.targetPosition);
    this.lookTarget.y += this.data.lookAtHeight;
    
    // Get target rotation (just the Y component for horizontal rotation)
    this.targetRotation.y = this.targetEl.object3D.rotation.y;
    
    // Calculate camera position based on target position and rotation
    const distance = this.data.distance;
    const height = this.data.height;
    
    // Position the camera behind and above the target
    this.cameraPosition.x = this.targetPosition.x - Math.sin(this.targetRotation.y) * distance;
    this.cameraPosition.z = this.targetPosition.z - Math.cos(this.targetRotation.y) * distance;
    this.cameraPosition.y = this.targetPosition.y + height;
    
    // Apply smoothing - lerp between current position and desired position
    const smoothing = Math.min(this.data.smoothing * dt, 1.0);
    this.el.object3D.position.lerp(this.targetPosition, smoothing);
    
    // Update camera position with smoothing
    this.cameraEl.object3D.position.lerp(
      new THREE.Vector3(
        this.cameraPosition.x - this.targetPosition.x,
        this.cameraPosition.y - this.targetPosition.y,
        this.cameraPosition.z - this.targetPosition.z
      ),
      smoothing
    );
    
    // Make camera look at the target
    this.cameraEl.object3D.lookAt(this.lookTarget);
  }
  });
}
