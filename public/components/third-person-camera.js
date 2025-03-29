
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
    
    const dt = delta / 1000;
    
    // Get target position and add height offset
    this.data.target.object3D.getWorldPosition(this.targetPosition);
    this.lookTarget.copy(this.targetPosition);
    this.lookTarget.y += this.data.lookAtHeight;
    
    // Get target rotation (just the Y component for horizontal rotation)
    this.targetRotation.y = this.data.target.object3D.rotation.y;
    
    // Calculate camera position based on target position and rotation
    const distance = this.data.distance;
    const height = this.data.height;
    
    // Position the camera behind and above the target
    this.cameraPosition.x = this.targetPosition.x - Math.sin(this.targetRotation.y) * distance;
    this.cameraPosition.z = this.targetPosition.z - Math.cos(this.targetRotation.y) * distance;
    this.cameraPosition.y = this.targetPosition.y + height;
    
    // Apply smoothing - lerp between current position and desired position
    const smoothing = Math.min(this.data.smoothing * dt, 1.0);
    
    // Update rig position with smoothing
    this.el.object3D.position.lerp(this.targetPosition, smoothing);
    
    // Update camera position relative to the rig
    const cameraOffset = new THREE.Vector3(
      this.cameraPosition.x - this.targetPosition.x,
      this.cameraPosition.y - this.targetPosition.y,
      this.cameraPosition.z - this.targetPosition.z
    );
    
    this.cameraEl.object3D.position.lerp(cameraOffset, smoothing);
    
    // Make camera look at the target
    this.cameraEl.object3D.lookAt(this.lookTarget);
  }
});
