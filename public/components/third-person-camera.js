
/* global AFRAME, THREE */

AFRAME.registerComponent('third-person-camera', {
  schema: {
    target: { type: 'selector' },
    distance: { type: 'number', default: 5 },
    height: { type: 'number', default: 2 },
    lookAtHeight: { type: 'number', default: 1 },
    smoothing: { type: 'number', default: 10 }
  },

  init: function () {
    // Make sure we have access to the camera element
    this.cameraEl = this.el.querySelector('a-camera');
    if (!this.cameraEl) {
      this.cameraEl = this.el.querySelector('[camera]');
    }
    
    if (!this.cameraEl) {
      console.error('No camera found as child of the camera rig');
      return;
    }
    
    // Initialize vectors for calculations
    this.targetPosition = new THREE.Vector3();
    this.cameraPosition = new THREE.Vector3();
    this.targetRotation = new THREE.Euler();
    this.lookTarget = new THREE.Vector3();
    
    // Make sure target exists
    if (!this.data.target) {
      console.error('No target specified for third-person camera');
      return;
    }
    
    console.log("Third-person camera initialized with target:", this.data.target.id);
    
    // Disable look-controls on initialization to prevent conflicts
    if (this.cameraEl.getAttribute('look-controls')) {
      this.lookControlsEnabled = this.cameraEl.getAttribute('look-controls').enabled;
      this.cameraEl.setAttribute('look-controls', 'enabled', false);
    }
    
    // Initialize the camera position
    this.updateCameraPosition(0);
  },
  
  update: function (oldData) {
    // Handle any parameter changes
    if (oldData.target !== this.data.target) {
      console.log("Camera target changed to:", this.data.target ? this.data.target.id : 'none');
    }
  },
  
  tick: function (time, delta) {
    if (!this.data.target || !this.cameraEl) return;
    
    this.updateCameraPosition(delta);
  },
  
  updateCameraPosition: function (delta) {
    if (!this.data.target || !this.cameraEl) return;
    
    try {
      // Ensure delta is valid for smoothing calculations
      const dt = delta ? delta / 1000 : 0.016; // Default to 60fps if delta is missing
      
      // Calculate adaptive smoothing - slower for stability, faster for responsiveness
      const smoothing = Math.max(0.05, Math.min(this.data.smoothing * dt, 0.2));
      
      // Cache frequently accessed properties
      const distance = this.data.distance;
      const height = this.data.height;
      
      // Get target position and rotation
      this.data.target.object3D.getWorldPosition(this.targetPosition);
      
      // Make sure we have a valid position
      if (isNaN(this.targetPosition.x) || isNaN(this.targetPosition.y) || isNaN(this.targetPosition.z)) {
        console.warn("Invalid target position detected");
        return;
      }
      
      // Get target rotation
      this.targetRotation.y = this.data.target.object3D.rotation.y;
      
      // Calculate look target with height offset for better view
      this.lookTarget.copy(this.targetPosition);
      this.lookTarget.y += this.data.lookAtHeight;
      
      // Calculate ideal camera position in orbit around target
      // Using sin/cos for circular orbit around target based on target rotation
      this.cameraPosition.x = this.targetPosition.x - Math.sin(this.targetRotation.y) * distance;
      this.cameraPosition.z = this.targetPosition.z - Math.cos(this.targetRotation.y) * distance;
      this.cameraPosition.y = this.targetPosition.y + height;
      
      // First move the rig to follow the target position with smoothing
      this.el.object3D.position.lerp(this.targetPosition, smoothing);
      
      // Calculate camera offset from rig center
      const cameraOffset = new THREE.Vector3().subVectors(this.cameraPosition, this.targetPosition);
      
      // Apply the offset to camera with smoothing
      this.cameraEl.object3D.position.lerp(cameraOffset, smoothing);
      
      // Make camera look at the target
      this.cameraEl.object3D.lookAt(this.lookTarget);

    } catch (error) {
      console.error("Error updating camera position:", error);
    }
  }
});
