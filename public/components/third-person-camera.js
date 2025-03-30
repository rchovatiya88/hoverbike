/* global AFRAME, THREE */

AFRAME.registerComponent('third-person-camera', {
  schema: {
    target: { type: 'selector' },
    distance: { type: 'number', default: 5 },
    height: { type: 'number', default: 4.5 },
    lookAtHeight: { type: 'number', default: 1.5 },
    rotationSpeed: { type: 'number', default: 10 },
    collisionRadius: { type: 'number', default: 0.35 },
    damping: { type: 'number', default: 0.3 },
    heightDamping: { type: 'number', default: 0.3 },
    minDistance: { type: 'number', default: 3 },
    maxDistance: { type: 'number', default: 10 },
    pitchAngle: { type: 'number', default: 45 }, // Default pitch angle in degrees
    enabled: { type: 'boolean', default: true }
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

    this.cameraEl = this.el.querySelector('[camera]');
    if (!this.cameraEl) {
      this.cameraEl = this.el;
    }
    this.camera = this.cameraEl.getObject3D('camera');

    this.yaw.add(this.pitch);
    this.pitch.add(this.dolly);
    this.el.sceneEl.object3D.add(this.yaw);

    this.tempVector = new THREE.Vector3();
    
    // Rotate camera 180 degrees to face the player
    if (this.el.object3D) {
      this.el.object3D.rotation.y = Math.PI; // 180 degrees in radians
      
      // Apply initial pitch rotation (looking down at player)
      const pitchRadians = THREE.MathUtils.degToRad(this.data.pitchAngle);
      this.el.object3D.rotation.x = pitchRadians;
    }
    
    console.log("Third-person camera initialized with target:", this.data.target);
  },

  update: function() {
    if (!this.data.target) {
      console.warn('Third-person camera: No target specified');
      return;
    }
  },

  tick: function(time, deltaTime) {
    if (!this.data.target || !this.data.enabled) return;

    const deltaSeconds = deltaTime / 1000;

    // Get the player's position and velocity
    const targetPosition = this.data.target.object3D.position.clone();
    const targetVelocity = this.data.target.components['player-component'] ? 
                          this.data.target.components['player-component'].velocity : 
                          new THREE.Vector3();

    // Apply lookAtHeight offset to target position
    targetPosition.y += this.data.lookAtHeight;

    // Calculate dynamic height and distance based on speed
    const speedFactor = targetVelocity ? Math.min(targetVelocity.length() / 15, 1) : 0;
    const dynamicHeight = THREE.MathUtils.lerp(this.data.height, this.data.height * 1.3, speedFactor);
    const dynamicDistance = THREE.MathUtils.lerp(
      this.data.distance, 
      this.data.maxDistance, 
      speedFactor
    );

    // Get the player's current rotation
    const targetRotation = this.data.target.object3D.rotation.y;
    
    // Calculate ideal camera position BEHIND the player
    const idealOffset = new THREE.Vector3(
      Math.sin(targetRotation) * -dynamicDistance,
      dynamicHeight,
      Math.cos(targetRotation) * -dynamicDistance
    );

    // Apply offset to player position to get ideal camera position
    const idealPosition = new THREE.Vector3();
    idealPosition.copy(targetPosition).add(idealOffset);

    // Check for collisions and adjust position if needed
    const finalPosition = this.handleCollision(idealPosition);

    // Smoothly move camera to final position with damping
    const cameraRigPosition = this.el.object3D.position;
    cameraRigPosition.lerp(finalPosition, 1.0 - Math.pow(this.data.damping, deltaSeconds * 60));

    // Make camera directly face player position with fixed pitch
    // This is important - we maintain our pitch angle while changing yaw
    const direction = new THREE.Vector3();
    direction.subVectors(targetPosition, cameraRigPosition).normalize();
    
    // Calculate yaw (horizontal rotation)
    const yaw = Math.atan2(direction.x, direction.z);
    
    // Apply yaw rotation while maintaining our fixed pitch
    const pitchRadians = THREE.MathUtils.degToRad(this.data.pitchAngle);
    this.el.object3D.rotation.set(pitchRadians, yaw, 0);

    // Debug position update
    if (time % 1000 < 20) { // Update roughly every second
      console.log('Camera tracking player at position:', this.data.target.object3D.position);
      console.log('Camera position:', this.el.object3D.position);
      console.log('Camera rotation:', this.el.object3D.rotation);
    }
  },

  handleCollision: function(idealPosition) {
    const result = new THREE.Vector3();
    result.copy(idealPosition);

    const camera = this.el.querySelector('[camera]') || this.el;
    const cameraPosition = this.el.object3D.position.clone();

    this.raycaster.set(
      this.data.target.object3D.position.clone(),
      cameraPosition.clone().sub(this.data.target.object3D.position).normalize()
    );

    const colliders = Array.from(
      document.querySelectorAll('[data-third-person-camera-collider]')
    );

    const collisions = this.raycaster.intersectObjects(
      colliders.map(el => el.object3D),
      true
    );

    if (collisions.length > 0) {
      const collision = collisions[0];
      if (collision.distance < this.data.distance) {
        const direction = cameraPosition.clone().sub(this.data.target.object3D.position).normalize();
        result.copy(this.data.target.object3D.position).add(
          direction.multiplyScalar(collision.distance - 0.1)
        );
      }
    }

    return result;
  }
});