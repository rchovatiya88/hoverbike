
/* global AFRAME, THREE */

AFRAME.registerComponent('third-person-camera', {
  schema: {
    target: { type: 'selector' },
    distance: { type: 'number', default: 5 },
    height: { type: 'number', default: 2 },
    followSpeed: { type: 'number', default: 5 },
    rotationSpeed: { type: 'number', default: 5 },
    lookAtHeight: { type: 'number', default: 0 },
    collisionLayers: { type: 'array', default: [] }
  },

  init: function () {
    // Create a dummy object for camera positioning
    this.dummy = new THREE.Object3D();
    this.el.object3D.add(this.dummy);

    // Setup camera positions
    this.cameraPosition = new THREE.Vector3();
    this.targetPosition = new THREE.Vector3();
    this.lookAtPosition = new THREE.Vector3();

    // Raycaster for collision detection
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = this.data.distance;
    this.cameraObstructed = false;
    
    // Debug
    console.log("Third-person camera initialized with target:", this.data.target ? this.data.target.id : "none");
    
    // Update camera if target exists
    if (this.data.target) {
      console.log("Camera target changed to:", this.data.target.id);
      this.updateCamera(0);
    }
    
    // Setup listener for when target changes
    this.el.addEventListener('componentchanged', (evt) => {
      if (evt.detail.name === 'third-person-camera' && 
          evt.detail.newData.target !== evt.detail.oldData.target) {
        console.log("Camera target changed to:", this.data.target.id);
      }
    });
  },

  tick: function (time, delta) {
    if (!this.data.target || !this.data.target.object3D) return;
    this.updateCamera(delta / 1000);
  },

  updateCamera: function (dt) {
    const targetObject = this.data.target.object3D;
    const camera = this.el.object3D;
    
    if (!targetObject || !camera) return;
    
    // Get camera component for updates
    const cameraEl = this.el.querySelector('[camera]');
    if (!cameraEl) return;
    
    // Update target position based on player's position
    this.targetPosition.copy(targetObject.position);
    
    // Calculate ideal camera position
    this.updateCameraPosition(dt);
    
    // Handle collisions
    this.handleCollisions();
    
    // Apply the calculated position to the camera
    camera.position.copy(this.cameraPosition);
    
    // Update lookAt position (target plus height offset)
    this.lookAtPosition.copy(this.targetPosition);
    this.lookAtPosition.y += this.data.lookAtHeight;
    
    // Make camera look at target if not in first person
    if (this.data.distance > 0.1) {
      cameraEl.object3D.lookAt(this.lookAtPosition);
    }
  },
  
  updateCameraPosition: function(dt) {
    // Calculate ideal camera position based on target, distance, and height
    const idealPosition = this.dummy.position;
    
    // Get player's forward direction
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.data.target.object3D.quaternion);
    
    // Calculate position behind player
    idealPosition.copy(this.targetPosition)
      .sub(forward.multiplyScalar(this.data.distance))
      .add(new THREE.Vector3(0, this.data.height, 0));
    
    // Smoothly move camera to ideal position
    this.cameraPosition.lerp(idealPosition, dt * this.data.followSpeed);
  },
  
  handleCollisions: function() {
    // Cast ray from target to camera to check for obstacles
    const direction = new THREE.Vector3();
    direction.subVectors(this.cameraPosition, this.targetPosition).normalize();
    
    this.raycaster.set(this.targetPosition, direction);
    
    // Get all collidable objects
    const collidableObjects = Array.from(document.querySelectorAll('[collidable]'))
      .map(el => el.object3D);
    
    // Check for intersections
    const intersects = this.raycaster.intersectObjects(collidableObjects, true);
    
    if (intersects.length > 0 && intersects[0].distance < this.data.distance) {
      // Calculate new camera position based on intersection
      this.cameraPosition.copy(this.targetPosition)
        .add(direction.multiplyScalar(intersects[0].distance * 0.9));
      this.cameraObstructed = true;
    } else {
      this.cameraObstructed = false;
    }
  }
});
