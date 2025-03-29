
/* global AFRAME, THREE */

if (!AFRAME.components['third-person-camera']) {
  AFRAME.registerComponent('third-person-camera', {
    schema: {
      target: { type: 'selector' },
      distance: { type: 'number', default: 5 },
      height: { type: 'number', default: 2 },
      followSpeed: { type: 'number', default: 5 },
      rotationSpeed: { type: 'number', default: 5 },
      lookAtHeight: { type: 'number', default: 0 }
    },

    init: function () {
      // Initialize component variables
      this.targetPosition = new THREE.Vector3();
      this.currentPosition = new THREE.Vector3();
      this.cameraPosition = new THREE.Vector3();
      this.targetRotation = new THREE.Euler();
      this.currentRotation = new THREE.Euler();
      this.isInitialized = false;
      this.targetEl = null;
      
      // Track if we've completed initialization
      this.initCompleted = false;
      this.initTimeout = null;

      // Camera setup
      try {
        if (this.data.target) {
          this.targetEl = this.data.target;
          console.log("Third-person camera initialized with target:", this.targetEl.id);
        } else {
          console.warn("No target specified for third-person camera");
        }
      } catch (error) {
        console.error('Error initializing third-person camera:', error);
      }

      // Attempt delayed initialization if needed
      this.delayedInit();
    },

    delayedInit: function() {
      if (this.initCompleted) return;
      
      if (!this.targetEl && this.data.target) {
        this.targetEl = this.data.target;
        console.log("Camera target changed to:", this.targetEl.id);
      }
      
      if (this.targetEl && this.el.object3D) {
        this.isInitialized = true;
        this.initCompleted = true;
        
        // Clear any pending attempts
        if (this.initTimeout) {
          clearTimeout(this.initTimeout);
          this.initTimeout = null;
        }
      } else {
        // If not ready, try again in 500ms
        this.initTimeout = setTimeout(() => this.delayedInit(), 500);
      }
    },

    update: function () {
      // Reset initialization if target changes
      if (this.data.target !== this.targetEl) {
        this.targetEl = this.data.target;
        if (this.targetEl) {
          console.log("Camera target changed to:", this.targetEl.id);
          this.isInitialized = true;
        }
      }
    },

    tick: function (time, delta) {
      // Skip if not initialized or missing target
      if (!this.isInitialized || !this.targetEl || !this.targetEl.object3D) {
        this.delayedInit();
        return;
      }

      try {
        const dt = delta / 1000; // Convert to seconds
        
        // Get target position from the player entity
        this.targetEl.object3D.getWorldPosition(this.targetPosition);
        
        // Calculate ideal camera position
        // Distance behind the player
        const playerRotation = this.targetEl.object3D.rotation.y;
        const cameraOffsetX = -Math.sin(playerRotation) * this.data.distance;
        const cameraOffsetZ = -Math.cos(playerRotation) * this.data.distance;

        this.cameraPosition.set(
          this.targetPosition.x + cameraOffsetX,
          this.targetPosition.y + this.data.height,
          this.targetPosition.z + cameraOffsetZ
        );
        
        // Smooth camera movement using lerp
        this.currentPosition.lerp(this.cameraPosition, Math.min(dt * this.data.followSpeed, 1));
        
        // Apply the position to the camera rig
        this.el.object3D.position.copy(this.currentPosition);
        
        // Make camera look at target with height offset
        this.el.object3D.lookAt(
          this.targetPosition.x,
          this.targetPosition.y + this.data.lookAtHeight,
          this.targetPosition.z
        );
      } catch (error) {
        console.error('Error in third-person camera tick:', error);
      }
    },

    remove: function () {
      if (this.initTimeout) {
        clearTimeout(this.initTimeout);
        this.initTimeout = null;
      }
    }
  });
}
