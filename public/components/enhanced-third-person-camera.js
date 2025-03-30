/* global AFRAME, THREE */

AFRAME.registerComponent('enhanced-third-person-camera', {
  schema: {
    target: { type: 'selector' },
    distance: { type: 'number', default: 5 },
    height: { type: 'number', default: 7.6 },
    lookAtHeight: { type: 'number', default: 1.5 },
    pitchAngle: { type: 'number', default: 42 }, // Default pitch angle in degrees
    damping: { type: 'number', default: 0.3 },
    
    // Spring system parameters
    stiffness: { type: 'number', default: 0.3 }, // How quickly the spring reacts
    restLength: { type: 'number', default: 5 }, // Rest length of the spring (same as distance)
    damper: { type: 'number', default: 0.7 }, // Damping factor for the spring
    mass: { type: 'number', default: 1 }, // Mass of the camera (affects inertia)
    
    // Collision parameters
    collisionEnabled: { type: 'boolean', default: true },
    collisionLayers: { type: 'string', default: '.wall, .obstacle' }, // CSS selector for collidable objects
    collisionRadius: { type: 'number', default: 0.5 },
    
    // Occlusion parameters
    occlusionEnabled: { type: 'boolean', default: true },
    occlusionLayers: { type: 'string', default: '.wall, .obstacle' }, // CSS selector for objects that can occlude
    
    // Camera behavior parameters
    minDistance: { type: 'number', default: 2 },
    maxDistance: { type: 'number', default: 10 },
    zoomSpeed: { type: 'number', default: 1 },
    rotationSpeed: { type: 'number', default: 2 },
    
    // Enable/disable the component
    enabled: { type: 'boolean', default: true }
  },

  init: function() {
    // Reference to the camera and player
    this.cameraEl = this.el.querySelector('[camera]') || this.el;
    this.camera = this.cameraEl.getObject3D('camera');
    
    // Set up physics variables
    this.velocity = new THREE.Vector3();
    this.acceleration = new THREE.Vector3();
    this.force = new THREE.Vector3();
    
    // Position variables
    this.currentPosition = new THREE.Vector3();
    this.targetPosition = new THREE.Vector3();
    this.idealPosition = new THREE.Vector3();
    this.currentLookAt = new THREE.Vector3();
    this.targetLookAt = new THREE.Vector3();
    
    // Rotation variables
    this.currentRotation = new THREE.Euler();
    this.targetRotation = new THREE.Euler();
    
    // Spring system variables
    this.springLength = this.data.distance;
    this.springVelocity = 0;
    this.springForce = 0;
    
    // Set up raycasters for collision detection
    this.collisionRaycaster = new THREE.Raycaster();
    this.occlusionRaycaster = new THREE.Raycaster();
    
    // Temporary vectors for calculations
    this.tempVector = new THREE.Vector3();
    this.directionVector = new THREE.Vector3();
    
    // Initial setup
    if (this.el.object3D) {
      // Set initial pitch (looking down at the target)
      const pitchRadians = THREE.MathUtils.degToRad(this.data.pitchAngle);
      this.el.object3D.rotation.x = pitchRadians;
      
      // Face the target (180 degrees)
      this.el.object3D.rotation.y = Math.PI;
    }
    
    // Debug
    this.debug = false;
    
    // Set up collider objects
    this.updateColliderList();
    
    console.log("Enhanced third-person camera initialized with target:", this.data.target);
  },
  
  update: function(oldData) {
    // Update parameters if they changed
    if (oldData.collisionLayers !== this.data.collisionLayers ||
        oldData.occlusionLayers !== this.data.occlusionLayers) {
      this.updateColliderList();
    }
    
    // Update spring system parameters
    this.springLength = this.data.restLength;
  },
  
  updateColliderList: function() {
    // Get all collision objects from the scene
    if (this.data.collisionEnabled) {
      this.colliders = Array.from(document.querySelectorAll(this.data.collisionLayers))
        .map(el => el.object3D)
        .filter(obj => obj !== undefined);
    } else {
      this.colliders = [];
    }
    
    // Get all occlusion objects from the scene
    if (this.data.occlusionEnabled) {
      this.occluders = Array.from(document.querySelectorAll(this.data.occlusionLayers))
        .map(el => el.object3D)
        .filter(obj => obj !== undefined);
    } else {
      this.occluders = [];
    }
  },
  
  tick: function(time, deltaTime) {
    if (!this.data.enabled || !this.data.target) return;
    
    const deltaSeconds = deltaTime / 1000;
    
    // Get target (player) position and properties
    const targetObject = this.data.target.object3D;
    const targetPosition = targetObject.position.clone();
    const targetRotation = targetObject.rotation.y;
    
    // Apply lookAtHeight offset to get the target look-at point
    const targetLookAt = targetPosition.clone();
    targetLookAt.y += this.data.lookAtHeight;
    
    // Calculate ideal camera position behind the target
    this.calculateIdealCameraPosition(targetPosition, targetRotation, targetLookAt);
    
    // Check for collisions and adjust camera position
    if (this.data.collisionEnabled) {
      this.handleCameraCollision(targetPosition);
    }
    
    // Check for occlusion between camera and target
    if (this.data.occlusionEnabled) {
      this.handleTargetOcclusion(targetPosition, targetLookAt);
    }
    
    // Apply spring physics to camera movement
    this.applySpringPhysics(deltaSeconds);
    
    // Update camera position and orientation
    this.updateCameraTransform(deltaSeconds);
    
    // Debug output occasionally
    if (this.debug && time % 1000 < 20) {
      console.log('Camera position:', this.el.object3D.position);
      console.log('Target position:', targetPosition);
      console.log('Camera-target distance:', this.el.object3D.position.distanceTo(targetPosition));
    }
  },
  
  calculateIdealCameraPosition: function(targetPosition, targetRotation, targetLookAt) {
    // Calculate ideal offset based on target rotation
    // This positions the camera behind the target based on its forward direction
    const idealOffset = new THREE.Vector3(
      Math.sin(targetRotation) * -this.data.distance,
      this.data.height,
      Math.cos(targetRotation) * -this.data.distance
    );
    
    // Apply offset to target position to get ideal camera position
    this.idealPosition.copy(targetPosition).add(idealOffset);
    
    // Store the target look-at point
    this.targetLookAt.copy(targetLookAt);
  },
  
  handleCameraCollision: function(targetPosition) {
    // Cast rays from the ideal camera position to detect collisions
    const cameraPos = this.idealPosition.clone();
    const direction = new THREE.Vector3().subVectors(targetPosition, cameraPos).normalize();
    
    this.collisionRaycaster.set(cameraPos, direction);
    
    // Check for collisions with scene objects
    const collisionResults = [];
    
    // Traverse all colliders and check for intersections
    this.colliders.forEach(collider => {
      collider.traverseVisible(child => {
        if (child.isMesh) {
          const intersects = this.collisionRaycaster.intersectObject(child, false);
          if (intersects.length > 0) {
            collisionResults.push(...intersects);
          }
        }
      });
    });
    
    // If we have collisions, adjust camera position
    if (collisionResults.length > 0) {
      // Sort by distance
      collisionResults.sort((a, b) => a.distance - b.distance);
      
      // Get the closest collision
      const collision = collisionResults[0];
      
      // If collision is closer than our distance, move camera toward target
      if (collision.distance < this.data.distance) {
        const newDistance = Math.max(collision.distance - this.data.collisionRadius, this.data.minDistance);
        
        // Recalculate camera position based on new distance
        const newOffset = new THREE.Vector3(
          Math.sin(targetRotation) * -newDistance,
          this.data.height,
          Math.cos(targetRotation) * -newDistance
        );
        
        this.idealPosition.copy(targetPosition).add(newOffset);
      }
    }
  },
  
  handleTargetOcclusion: function(targetPosition, targetLookAt) {
    // Check if there's anything between the camera and the target
    const cameraPos = this.idealPosition.clone();
    const direction = new THREE.Vector3().subVectors(targetLookAt, cameraPos).normalize();
    const distance = cameraPos.distanceTo(targetLookAt);
    
    this.occlusionRaycaster.set(cameraPos, direction);
    
    // Check for occlusions with scene objects
    const occlusionResults = [];
    
    // Traverse all occluders and check for intersections
    this.occluders.forEach(occluder => {
      occluder.traverseVisible(child => {
        if (child.isMesh) {
          const intersects = this.occlusionRaycaster.intersectObject(child, false);
          if (intersects.length > 0) {
            occlusionResults.push(...intersects);
          }
        }
      });
    });
    
    // If something is occluding the target, adjust camera position
    if (occlusionResults.length > 0) {
      // Sort by distance
      occlusionResults.sort((a, b) => a.distance - b.distance);
      
      // Get the closest occlusion
      const occlusion = occlusionResults[0];
      
      // If occlusion is between camera and target, move camera closer to target
      if (occlusion.distance < distance) {
        // Get the occlusion point
        const occlusionPoint = occlusion.point;
        
        // Move slightly past the occlusion point toward the target
        const newDirection = new THREE.Vector3().subVectors(targetLookAt, occlusionPoint).normalize();
        const offsetDistance = 0.5; // Small offset to move past the occlusion
        
        // Calculate new camera position
        this.idealPosition.copy(occlusionPoint).add(newDirection.multiplyScalar(offsetDistance));
      }
    }
  },
  
  applySpringPhysics: function(deltaSeconds) {
    // Only apply spring physics if we have a significant time delta
    if (deltaSeconds <= 0) return;
    
    // Get current position
    this.currentPosition.copy(this.el.object3D.position);
    
    // Calculate spring force based on Hooke's law: F = -k * (x - L)
    // Where:
    // - k is the spring stiffness
    // - x is the current spring length (distance from current to ideal position)
    // - L is the rest length
    
    // Calculate current spring extension (displacement from ideal position)
    const currentDistance = this.currentPosition.distanceTo(this.idealPosition);
    
    // Calculate direction from current to ideal position
    this.directionVector.copy(this.idealPosition).sub(this.currentPosition).normalize();
    
    // Calculate spring force (Hooke's law)
    const displacement = currentDistance - this.springLength;
    const springForce = this.data.stiffness * displacement;
    
    // Apply damping to the velocity (damper reduces oscillation)
    this.velocity.multiplyScalar(1 - this.data.damper * deltaSeconds);
    
    // Calculate acceleration (F = ma, so a = F/m)
    this.acceleration.copy(this.directionVector).multiplyScalar(springForce / this.data.mass);
    
    // Update velocity (v = v0 + at)
    this.velocity.add(this.acceleration.multiplyScalar(deltaSeconds));
    
    // Update position (p = p0 + vt)
    this.tempVector.copy(this.velocity).multiplyScalar(deltaSeconds);
    this.targetPosition.copy(this.currentPosition).add(this.tempVector);
  },
  
  updateCameraTransform: function(deltaSeconds) {
    // Update camera position with smooth transition
    this.el.object3D.position.lerp(this.targetPosition, 1.0 - Math.pow(1.0 - this.data.damping, deltaSeconds * 60));
    
    // Calculate camera orientation to look at target
    // Get direction from camera to target
    const cameraPos = this.el.object3D.position;
    this.directionVector.copy(this.targetLookAt).sub(cameraPos).normalize();
    
    // Calculate yaw (horizontal rotation) - we want the camera to face the target
    const yaw = Math.atan2(this.directionVector.x, this.directionVector.z);
    
    // Convert pitch angle to radians
    const pitchRadians = THREE.MathUtils.degToRad(this.data.pitchAngle);
    
    // Set camera rotation
    // We use a fixed pitch angle and calculated yaw
    this.el.object3D.rotation.set(pitchRadians, yaw, 0);
  }
});
