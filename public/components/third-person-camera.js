
/**
 * Third-person camera component - makes the camera follow the player in third person view
 */
AFRAME.registerComponent('third-person-camera', {
  schema: {
    target: { type: 'selector', default: '#player' },
    distance: { type: 'number', default: 5 },
    height: { type: 'number', default: 2 },
    smoothing: { type: 'number', default: 0.1 },
    lockRotation: { type: 'boolean', default: false }
  },

  init: function() {
    this.targetPosition = new THREE.Vector3();
    this.currentPosition = new THREE.Vector3();
    
    // Create a dummy object for smooth camera rotation
    this.cameraHolder = document.createElement('a-entity');
    this.cameraHolder.setAttribute('position', '0 0 0');
    this.el.sceneEl.appendChild(this.cameraHolder);
    
    // Set up collision detection for camera
    this.raycaster = new THREE.Raycaster();
    this.collisionDetected = false;
  },

  tick: function(time, delta) {
    const target = this.data.target;
    
    if (!target) return;
    
    // Get target's position and rotation
    const targetObject3D = target.object3D;
    targetObject3D.getWorldPosition(this.targetPosition);
    
    // Get camera rotation
    const cameraRotation = this.el.getAttribute('rotation');
    const radians = THREE.MathUtils.degToRad(cameraRotation.y);
    
    // Calculate ideal camera position based on target and distance
    const idealPosition = new THREE.Vector3(
      this.targetPosition.x - Math.sin(radians) * this.data.distance,
      this.targetPosition.y + this.data.height,
      this.targetPosition.z - Math.cos(radians) * this.data.distance
    );
    
    // Check for collisions with raycaster
    this.raycaster.set(this.targetPosition, idealPosition.clone().sub(this.targetPosition).normalize());
    const distance = this.targetPosition.distanceTo(idealPosition);
    const intersections = this.raycaster.intersectObjects(this.el.sceneEl.object3D.children, true);
    
    let finalPosition;
    if (intersections.length > 0 && intersections[0].distance < distance) {
      // If collision detected, place camera at collision point
      finalPosition = new THREE.Vector3().copy(intersections[0].point);
      this.collisionDetected = true;
    } else {
      finalPosition = idealPosition;
      this.collisionDetected = false;
    }
    
    // Apply smoothing
    if (this.data.smoothing > 0 && this.data.smoothing < 1) {
      this.currentPosition.lerp(finalPosition, this.data.smoothing);
    } else {
      this.currentPosition.copy(finalPosition);
    }
    
    // Update camera position
    this.el.setAttribute('position', this.currentPosition);
    
    // If lockRotation is true, make the camera look at the target
    if (this.data.lockRotation) {
      this.el.object3D.lookAt(this.targetPosition);
    }
  }
});
