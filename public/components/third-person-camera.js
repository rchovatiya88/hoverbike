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

    this.debugMode = true; // Enable debug mode

    // Create debug visualizations (requires entities in your scene)
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

    // Get target position and rotation
    const targetObj = this.data.target.object3D;
    targetObj.getWorldPosition(this.targetPosition);

    // Adjust for look height
    this.targetPosition.y += this.data.lookAtHeight;

    // Calculate ideal camera position
    const idealPosition = new THREE.Vector3();

    // Get the direction the target is facing (assuming -Z is forward)
    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(targetObj.quaternion);

    // Position the camera behind the target based on direction
    idealPosition.copy(this.targetPosition)
      .sub(direction.multiplyScalar(this.data.distance))
      .add(new THREE.Vector3(0, this.data.height, 0));

    // Smooth camera movement with damping
    this.el.object3D.position.lerp(idealPosition, this.data.damping * (delta/16.6));

    // Make camera look at target plus height offset
    this.cameraEl.object3D.lookAt(this.targetPosition);

    // Update debug visualizations
    this.updateDebugVisuals(this.targetPosition);
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

  updateDebugVisuals: function(targetPos) {
    if (!this.debugMode) return;

    // Update camera debug sphere
    if (this.debugCamera) {
      this.debugCamera.setAttribute('position', {
        x: this.el.object3D.position.x,
        y: this.el.object3D.position.y,
        z: this.el.object3D.position.z
      });
    }

    // Update target debug sphere
    if (this.debugTarget) {
      this.debugTarget.setAttribute('position', {
        x: targetPos.x,
        y: targetPos.y + this.data.lookAtHeight,
        z: targetPos.z
      });
    }

    // Update debug line
    if (this.debugLine) {
      this.debugLine.setAttribute('line', {
        start: {
          x: this.el.object3D.position.x,
          y: this.el.object3D.position.y,
          z: this.el.object3D.position.z
        },
        end: {
          x: targetPos.x,
          y: targetPos.y + this.data.lookAtHeight,
          z: targetPos.z
        }
      });
    }

    // Update debug text with current values
    if (this.debugText) {
      this.debugText.setAttribute('position', {
        x: this.el.object3D.position.x,
        y: this.el.object3D.position.y + 1,
        z: this.el.object3D.position.z
      });

      const cameraPos = this.el.object3D.position;
      const formattedText = `Camera: ${cameraPos.x.toFixed(2)}, ${cameraPos.y.toFixed(2)}, ${cameraPos.z.toFixed(2)}\n` + 
                           `Height: ${this.data.height.toFixed(2)}, Distance: ${this.data.distance.toFixed(2)}`;
      this.debugText.setAttribute('value', formattedText);
    }
  },

  remove: function() {
    // Clean up
    if (this.yaw.parent) {
      this.yaw.parent.remove(this.yaw);
    }
  }
});