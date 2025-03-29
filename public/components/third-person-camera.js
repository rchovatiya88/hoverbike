
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
    this.dolly = new THREE.Object3D();
    this.yaw = new THREE.Object3D();
    this.pitch = new THREE.Object3D();
    this.targetPosition = new THREE.Vector3();
    this.currentPosition = new THREE.Vector3();
    this.cameraPosition = new THREE.Vector3();
    this.targetRotation = new THREE.Euler();
    this.cameraRotation = new THREE.Euler();
    this.collisionDetected = false;
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

    console.log("Third-person camera initialized with target:", this.data.target);
  },

  update: function() {
    if (!this.data.target) {
      console.warn('Third-person camera: No target specified');
      return;
    }
  },

  tick: function(time, delta) {
    if (!this.data.target || !this.camera) return;

    const target = this.data.target.object3D;
    if (!target) return;

    // Get target world position
    target.getWorldPosition(this.targetPosition);
    
    // Update camera position with smooth damping
    const idealOffset = new THREE.Vector3(0, this.data.height, this.data.distance);
    idealOffset.applyQuaternion(target.quaternion);
    idealOffset.add(this.targetPosition);
    
    // Camera collision detection
    if (this.data.enableCollision) {
      this.handleCollision(idealOffset);
    }
    
    // Apply damping to camera position
    const movementFactor = Math.min(delta / 1000 * 10 * this.data.damping, 1);
    this.currentPosition.lerp(this.collisionDetected ? this.cameraPosition : idealOffset, movementFactor);
    
    // Look at target with height offset
    const lookAtPosition = this.targetPosition.clone();
    lookAtPosition.y += this.data.lookAtHeight;
    
    // Update camera rotation with smooth damping
    this.yaw.position.copy(this.currentPosition);
    this.dolly.lookAt(lookAtPosition);
    
    // Apply camera position and rotation
    this.camera.position.set(0, 0, 0);
    this.camera.rotation.set(0, 0, 0);
    
    // Update the camera rig
    this.el.setAttribute('position', this.currentPosition);
    
    // Reset collision flag for next frame
    this.collisionDetected = false;
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
