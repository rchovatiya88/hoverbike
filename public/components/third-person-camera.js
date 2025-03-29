/* global AFRAME, THREE */

AFRAME.registerComponent('third-person-camera', {
  schema: {
    target: { type: 'selector' },
    distance: { type: 'number', default: 5 },
    height: { type: 'number', default: 2 },
    lookAtHeight: { type: 'number', default: 1 },
    rotationSpeed: { type: 'number', default: 10 },
    collisionRadius: { type: 'number', default: 0.35 },
    damping: { type: 'number', default: 0.5 },
    heightDamping: { type: 'number', default: 0.3 },
    minDistance: { type: 'number', default: 3 },
    maxDistance: { type: 'number', default: 10 }
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

  tick: function(time, deltaTime) {
    if (!this.data.target) return;

    const deltaSeconds = deltaTime / 1000;

    // Get target position and velocity
    const targetPosition = this.data.target.object3D.position.clone();
    const targetVelocity = this.data.target.components['player-component'] ? 
                          this.data.target.components['player-component'].velocity : 
                          new THREE.Vector3();

    // Add look height to target position
    targetPosition.y += this.data.lookAtHeight;

    // Dynamic camera height based on player velocity
    const speedFactor = targetVelocity ? Math.min(targetVelocity.length() / 15, 1) : 0;
    const dynamicHeight = THREE.MathUtils.lerp(this.data.height, this.data.height * 1.3, speedFactor);

    // Dynamic camera distance - move further when player is moving fast
    const dynamicDistance = THREE.MathUtils.lerp(
      this.data.distance, 
      this.data.maxDistance, 
      speedFactor
    );

    // Get camera position in scene
    const cameraRigPosition = this.el.object3D.position;

    // Calculate ideal position behind the target
    const targetRotation = this.data.target.object3D.rotation.y;

    // Create offset with dynamic distance
    const idealOffset = new THREE.Vector3(
      Math.sin(targetRotation) * -dynamicDistance,
      dynamicHeight,
      Math.cos(targetRotation) * -dynamicDistance
    );

    // Apply slight offset based on horizontal velocity for more dynamic feel
    if (targetVelocity && speedFactor > 0.2) {
      const horizontalVelocity = new THREE.Vector2(targetVelocity.x, targetVelocity.z);
      if (horizontalVelocity.length() > 0) {
        horizontalVelocity.normalize().multiplyScalar(speedFactor * 0.5);
        idealOffset.x -= horizontalVelocity.x;
        idealOffset.z -= horizontalVelocity.y;
      }
    }

    const idealPosition = targetPosition.clone().add(idealOffset);

    // Apply different damping levels for xyz for natural camera motion
    const posDamping = this.data.damping * (1 + speedFactor * 0.5); // Faster damping at higher speeds
    cameraRigPosition.x += (idealPosition.x - cameraRigPosition.x) * posDamping * deltaSeconds * 60;
    cameraRigPosition.y += (idealPosition.y - cameraRigPosition.y) * this.data.heightDamping * deltaSeconds * 60;
    cameraRigPosition.z += (idealPosition.z - cameraRigPosition.z) * posDamping * deltaSeconds * 60;

    // Get the camera entity
    const camera = this.el.querySelector('[camera]') || this.el;

    // Look at target with slight offset based on movement
    const lookTarget = targetPosition.clone();
    if (targetVelocity && targetVelocity.length() > 5) {
      // Add a small anticipation offset in the direction of travel
      lookTarget.add(targetVelocity.clone().normalize().multiplyScalar(speedFactor * 1.5));
    }

    // Apply smooth look
    camera.object3D.lookAt(lookTarget);
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