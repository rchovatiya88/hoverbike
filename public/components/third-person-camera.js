/* global AFRAME, THREE */

AFRAME.registerComponent('third-person-camera', {
  schema: {
    target: { type: 'selector' },
    distance: { type: 'number', default: 6 },
    height: { type: 'number', default: 2.5 },
    damping: { type: 'number', default: 0.5 },
    rotationDamping: { type: 'number', default: 0.3 },
    followSpeed: { type: 'number', default: 5 },
    enableRotation: { type: 'boolean', default: true },
    enableZoom: { type: 'boolean', default: true },
    minDistance: { type: 'number', default: 2 },
    maxDistance: { type: 'number', default: 10 },
    zoomSpeed: { type: 'number', default: 0.5 }
  },

  init: function() {
    this.dolly = new THREE.Object3D();
    this.yaw = new THREE.Object3D();
    this.pitch = new THREE.Object3D();
    this.targetPosition = new THREE.Vector3();
    this.currentPosition = new THREE.Vector3();
    this.cameraPosition = new THREE.Vector3();
    this.targetRotation = new THREE.Euler();
    this.cameraRotation = new THREE.Euler();
    this.collisionDetected = false;
    this.isInitialized = false;
    this.raycaster = new THREE.Raycaster();

    // Initial setup
    this.cameraEl = this.el.querySelector('[camera]');
    if (!this.cameraEl) {
      this.cameraEl = this.el;
    }
    this.camera = this.cameraEl.getObject3D('camera');

    // Setup the camera rig hierarchy
    this.yaw.add(this.pitch);
    this.pitch.add(this.dolly);
    this.el.sceneEl.object3D.add(this.yaw);

    // Create temporary vector for calculations
    this.tempVector = new THREE.Vector3();

    console.log("Third-person camera initialized with target:", this.data.target);
  },

  update: function() {
    if (!this.data.target) {
      console.warn('Third-person camera: No target specified');
      return;
    }
  },

  tick: function(time, delta) {
    if (!this.data.target || !this.data.target.object3D) return;

    // Get target position and rotation
    const targetObj = this.data.target.object3D;
    targetObj.getWorldPosition(this.targetPosition);

    // Adjust for look height
    this.targetPosition.y += this.data.lookAtHeight;

    // Calculate ideal camera position
    const idealPosition = new THREE.Vector3();

    // Get the direction the target is facing (assuming -Z is forward)
    const direction = new THREE.Vector3(0, 0, -1); // -Z is forward in A-Frame
    direction.applyQuaternion(targetObj.quaternion);

    // Position the camera behind the target based on direction
    idealPosition.copy(this.targetPosition)
      .add(direction.multiplyScalar(-this.data.distance)) // Negative because we want to be behind
      .add(new THREE.Vector3(0, this.data.height, 0));

    // Apply damping based on delta time for smoother movement
    const dampingFactor = Math.min(Math.max(this.data.damping * (delta/16.6), 0), 1);
    this.el.object3D.position.lerp(idealPosition, dampingFactor);

    // Create a look target that includes the height offset
    const lookTarget = this.targetPosition.clone();

    // Make camera look at target 
    this.el.object3D.lookAt(lookTarget);
  },

  handleCollision: function(idealPosition) {
    // Direction from target to camera
    const direction = new THREE.Vector3().subVectors(idealPosition, this.targetPosition).normalize();

    // Set up raycaster
    this.raycaster.set(this.targetPosition, direction);
    this.raycaster.far = this.data.distance + 1;

    // Get collision objects
    const collisionObjects = [];
    this.el.sceneEl.object3D.traverse((node) => {
      if (node.isMesh && node !== this.data.target.object3D) {
        collisionObjects.push(node);
      }
    });

    // Check for collisions
    const intersects = this.raycaster.intersectObjects(collisionObjects, true);

    if (intersects.length > 0 && intersects[0].distance < this.data.distance) {
      // Collision detected, adjust camera position
      this.collisionDetected = true;
      const collisionDistance = Math.max(intersects[0].distance * 0.8, 2); // Keep some minimum distance

      this.cameraPosition.copy(this.targetPosition)
        .add(direction.multiplyScalar(collisionDistance));
    }
  },

  remove: function() {
    // Clean up
    if (this.yaw.parent) {
      this.yaw.parent.remove(this.yaw);
    }
  }
});