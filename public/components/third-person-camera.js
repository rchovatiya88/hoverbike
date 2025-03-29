/* global AFRAME, THREE */

AFRAME.registerComponent('third-person-camera', {
  schema: {
    target: { type: 'selector' },
    distance: { type: 'number', default: 5 },
    height: { type: 'number', default: 2 },
    damping: { type: 'number', default: 0.5 },
    rotationDamping: { type: 'number', default: 0.3 },
    lookAtHeight: { type: 'number', default: 0 },
    enableCollision: { type: 'boolean', default: true },
    collisionLayers: { type: 'array', default: [] }
  },

  init: function() {
    // Camera setup
    this.dolly = new THREE.Object3D();
    this.yaw = new THREE.Object3D();
    this.pitch = new THREE.Object3D();

    // Position vectors
    this.targetPosition = new THREE.Vector3();
    this.currentPosition = new THREE.Vector3();
    this.cameraPosition = new THREE.Vector3();
    this.desiredPosition = new THREE.Vector3();
    this.tempVector = new THREE.Vector3();

    // Rotation handling
    this.targetRotation = new THREE.Euler();
    this.cameraRotation = new THREE.Euler();

    // State tracking
    this.collisionDetected = false;
    this.isInitialized = false;
    this.lastTargetPosition = new THREE.Vector3();
    this.velocityVector = new THREE.Vector3();
    this.lastTime = 0;

    // Collision detection
    this.raycaster = new THREE.Raycaster();

    // Camera element reference
    this.cameraEl = this.el.querySelector('[camera]');
    if (!this.cameraEl) {
      this.cameraEl = this.el;
    }
    this.camera = this.cameraEl.getObject3D('camera');

    // Setup camera rig hierarchy
    this.yaw.add(this.pitch);
    this.pitch.add(this.dolly);
    this.el.sceneEl.object3D.add(this.yaw);

    // Debug mode for visualization
    this.debugMode = false;

    // Create debug visualizations if needed
    this.debugCamera = this.el.sceneEl.querySelector('#debugCamera');
    this.debugTarget = this.el.sceneEl.querySelector('#debugTarget');
    this.debugLine = this.el.sceneEl.querySelector('#debugLine');
    this.debugText = this.el.sceneEl.querySelector('#debugText');

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

    const dt = delta / 1000; // Convert to seconds
    const targetObj = this.data.target.object3D;

    // Get target position and calculate velocity
    targetObj.getWorldPosition(this.targetPosition);

    if (this.lastTime > 0) {
      // Calculate velocity for smoother following during rapid movement
      this.tempVector.copy(this.targetPosition).sub(this.lastTargetPosition);
      this.velocityVector.lerp(this.tempVector.multiplyScalar(1/dt), 0.2);
    }

    // Save current position for next frame
    this.lastTargetPosition.copy(this.targetPosition);
    this.lastTime = time;

    // Adjust target position with lookAtHeight
    const lookTarget = this.targetPosition.clone();
    lookTarget.y += this.data.lookAtHeight;

    // Get target forward direction (assuming -Z is forward in A-Frame)
    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(targetObj.quaternion);

    // Calculate ideal camera position - behind the target based on direction
    this.desiredPosition.copy(this.targetPosition)
      .sub(direction.multiplyScalar(this.data.distance))
      .add(new THREE.Vector3(0, this.data.height, 0));

    // Add a slight velocity-based offset for better following during fast movement
    if (this.velocityVector.length() > 0.5) {
      const velocityInfluence = 0.2;
      this.desiredPosition.add(
        this.velocityVector.clone().normalize().multiplyScalar(velocityInfluence)
      );
    }

    // Perform collision detection if enabled
    if (this.data.enableCollision) {
      this.raycaster.set(this.targetPosition, 
        this.desiredPosition.clone().sub(this.targetPosition).normalize());
      this.raycaster.far = this.desiredPosition.distanceTo(this.targetPosition);

      const colliders = this.el.sceneEl.querySelectorAll('.collidable');
      const intersections = this.raycaster.intersectObjects(
        Array.from(colliders).map(el => el.object3D), true);

      if (intersections.length > 0) {
        // Adjust position to avoid collision
        const closestIntersection = intersections[0];
        const distanceToTarget = closestIntersection.distance - 0.5; // Add buffer

        this.desiredPosition.copy(this.targetPosition).add(
          this.desiredPosition.clone()
            .sub(this.targetPosition)
            .normalize()
            .multiplyScalar(distanceToTarget)
        );
      }
    }

    // Apply smooth camera movement with damping
    this.el.object3D.position.lerp(this.desiredPosition, this.data.damping * (delta/16.6));

    // Make camera look at the target with smooth rotation
    this.el.object3D.lookAt(lookTarget);

    // Update debug visualization if enabled
    if (this.debugMode && this.debugCamera && this.debugTarget && this.debugLine) {
      this.debugCamera.setAttribute('position', this.el.object3D.position);
      this.debugTarget.setAttribute('position', lookTarget);

      // Update debug line between camera and target
      const linePoints = [
        this.el.object3D.position.x, this.el.object3D.position.y, this.el.object3D.position.z,
        lookTarget.x, lookTarget.y, lookTarget.z
      ];
      this.debugLine.setAttribute('line', {start: this.el.object3D.position, end: lookTarget});
    }
  }
});