
/* global AFRAME, THREE */

if (!AFRAME.components['player-component']) {
  AFRAME.registerComponent('player-component', {
    schema: {
      speed: { type: 'number', default: 2 },
      rotationSpeed: { type: 'number', default: 3 },
      health: { type: 'number', default: 100 },
      maxHealth: { type: 'number', default: 100 },
      jumpForce: { type: 'number', default: 10 },
      gravity: { type: 'number', default: 9.8 }
    },

    init: function () {
      // Player state
      this.health = this.data.health;
      this.isDead = false;
      this.isJumping = false;
      this.velocity = new THREE.Vector3(0, 0, 0);
      this.acceleration = new THREE.Vector3(0, 0, 0);
      this.direction = new THREE.Vector3(0, 0, 0);
      
      // Controls state
      this.keys = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        up: false,
        down: false,
        sprint: false
      };
      
      // Cache references
      this.camera = document.getElementById('camera');
      this.cameraRig = document.getElementById('camera-rig');
      
      // Set up event listeners
      this.addEventListeners();
      
      // Initialize health display
      this.updateHealthDisplay();
      
      // Animation mixer for player model animations
      if (this.el.getObject3D('mesh')) {
        this.setupAnimations();
      } else {
        this.el.addEventListener('model-loaded', this.setupAnimations.bind(this));
      }
      
      // Initial position - useful for respawning
      this.initialPosition = this.el.object3D.position.clone();
      
      // Override A-Frame look controls
      if (this.camera && this.camera.components['look-controls']) {
        this.camera.components['look-controls'].pitchObject.rotation.x = 0;
        this.camera.components['look-controls'].yawObject.rotation.y = 0;
      }
    },

    addEventListeners: function () {
      // Keyboard event listeners
      this.keydownHandler = this.handleKeyDown.bind(this);
      this.keyupHandler = this.handleKeyUp.bind(this);
      
      window.addEventListener('keydown', this.keydownHandler);
      window.addEventListener('keyup', this.keyupHandler);
      
      // Collision event listeners
      this.el.addEventListener('collidestart', this.handleCollision.bind(this));
      
      // Game event listeners
      document.addEventListener('game-started', this.onGameStarted.bind(this));
      document.addEventListener('game-reset', this.onGameReset.bind(this));
      
      // Damage event
      this.el.addEventListener('damage', this.onDamage.bind(this));
    },
    
    setupAnimations: function() {
      const mesh = this.el.getObject3D('mesh');
      if (!mesh) return;
      
      // If model has animations, set up the mixer
      if (mesh.animations && mesh.animations.length) {
        this.mixer = new THREE.AnimationMixer(mesh);
        this.actions = {};
        
        mesh.animations.forEach(animation => {
          this.actions[animation.name] = this.mixer.clipAction(animation);
        });
        
        // Play idle animation if available
        if (this.actions['idle']) {
          this.actions['idle'].play();
        }
      }
    },

    handleKeyDown: function (event) {
      const gameManager = document.querySelector('[game-manager]');
      if (!gameManager || !gameManager.components['game-manager'] || 
          !gameManager.components['game-manager'].gameStarted) return;
      
      switch (event.code) {
        case 'KeyW': this.keys.forward = true; break;
        case 'KeyS': this.keys.backward = true; break;
        case 'KeyA': this.keys.left = true; break;
        case 'KeyD': this.keys.right = true; break;
        case 'KeyQ': this.keys.up = true; break;
        case 'KeyE': this.keys.down = true; break;
        case 'ShiftLeft': this.keys.sprint = true; break;
      }
    },

    handleKeyUp: function (event) {
      switch (event.code) {
        case 'KeyW': this.keys.forward = false; break;
        case 'KeyS': this.keys.backward = false; break;
        case 'KeyA': this.keys.left = false; break;
        case 'KeyD': this.keys.right = false; break;
        case 'KeyQ': this.keys.up = false; break;
        case 'KeyE': this.keys.down = false; break;
        case 'ShiftLeft': this.keys.sprint = false; break;
      }
    },

    handleCollision: function (event) {
      // Handle collisions with environment or enemies
      const collidingEntity = event.detail.body.el;
      
      if (collidingEntity && collidingEntity.components && 
          collidingEntity.components['enemy-component']) {
        // Take damage from enemy collision
        this.takeDamage(10);
      }
    },
    
    onGameStarted: function() {
      // Reset player when game starts
      this.reset();
    },
    
    onGameReset: function() {
      // Reset player position and health
      this.reset();
    },
    
    reset: function() {
      // Reset player to initial state
      this.health = this.data.maxHealth;
      this.isDead = false;
      this.el.object3D.position.copy(this.initialPosition);
      this.velocity.set(0, 0, 0);
      this.updateHealthDisplay();
    },

    takeDamage: function (amount) {
      if (this.isDead) return;
      
      this.health -= amount;
      
      // Show damage overlay
      const damageOverlay = document.getElementById('damage-overlay');
      if (damageOverlay) {
        damageOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
        setTimeout(() => {
          damageOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0)';
        }, 200);
      }
      
      // Update health display
      this.updateHealthDisplay();
      
      // Check if player died
      if (this.health <= 0) {
        this.health = 0;
        this.die();
      }
    },
    
    onDamage: function(event) {
      const damage = event.detail.damage || 10;
      this.takeDamage(damage);
    },

    die: function () {
      this.isDead = true;
      
      // Trigger game over
      const gameOverEvent = new CustomEvent('game-over');
      document.dispatchEvent(gameOverEvent);
      
      // Show game over message
      const gameMessage = document.getElementById('game-message');
      if (gameMessage) {
        gameMessage.style.display = 'block';
        gameMessage.innerHTML = 'Game Over!<br><button id="restart-button">Restart</button>';
        
        // Add restart button handler
        const restartButton = document.getElementById('restart-button');
        if (restartButton) {
          restartButton.addEventListener('click', () => {
            gameMessage.style.display = 'none';
            
            // Trigger game reset
            const gameResetEvent = new CustomEvent('game-reset');
            document.dispatchEvent(gameResetEvent);
            
            // Request pointer lock again
            document.body.requestPointerLock();
          });
        }
      }
    },

    updateHealthDisplay: function () {
      const healthBar = document.getElementById('health-bar');
      if (healthBar) {
        const healthPercent = (this.health / this.data.maxHealth) * 100;
        healthBar.style.width = healthPercent + '%';
        
        // Change color based on health level
        if (healthPercent > 60) {
          healthBar.style.backgroundColor = '#0f0'; // Green
        } else if (healthPercent > 30) {
          healthBar.style.backgroundColor = '#ff0'; // Yellow
        } else {
          healthBar.style.backgroundColor = '#f00'; // Red
        }
      }
    },

    tick: function (time, delta) {
      // Skip if player is dead or game isn't running
      if (this.isDead) return;
      
      const gameManager = document.querySelector('[game-manager]');
      if (!gameManager || !gameManager.components['game-manager'] || 
          !gameManager.components['game-manager'].gameStarted) return;
      
      // Convert delta to seconds
      const dt = delta / 1000;
      
      // Update animations if mixer exists
      if (this.mixer) {
        this.mixer.update(dt);
      }
      
      // Update player movement
      this.updateMovement(dt);
      
      // Apply hover effect
      this.applyHoverEffect(time);
    },

    updateMovement: function (dt) {
      // Get camera direction for movement relative to where player is looking
      if (!this.camera) return;
      
      const rotation = this.camera.object3D.rotation;
      const speedFactor = this.keys.sprint ? 2 : 1;
      const moveSpeed = this.data.speed * speedFactor * dt;
      
      // Reset movement direction
      this.direction.set(0, 0, 0);
      
      // Forward/backward movement
      if (this.keys.forward) {
        this.direction.z -= 1;
      }
      if (this.keys.backward) {
        this.direction.z += 1;
      }
      
      // Left/right movement
      if (this.keys.left) {
        this.direction.x -= 1;
      }
      if (this.keys.right) {
        this.direction.x += 1;
      }
      
      // Up/down movement (for jetbike)
      if (this.keys.up) {
        this.direction.y += 1;
      }
      if (this.keys.down) {
        this.direction.y -= 1;
      }
      
      // Normalize direction vector if moving diagonally
      if (this.direction.length() > 0) {
        this.direction.normalize();
      }
      
      // Apply camera-relative movement
      // Convert camera Y rotation to a rotation matrix
      const cameraY = new THREE.Matrix4().makeRotationY(this.cameraRig.object3D.rotation.y);
      // Apply camera rotation to movement direction vector
      this.direction.applyMatrix4(cameraY);
      
      // Move the player
      this.velocity.x = this.direction.x * moveSpeed * 60;
      this.velocity.z = this.direction.z * moveSpeed * 60;
      this.velocity.y = this.direction.y * moveSpeed * 60;
      
      // Apply velocity to position
      this.el.object3D.position.x += this.velocity.x * dt;
      this.el.object3D.position.y += this.velocity.y * dt;
      this.el.object3D.position.z += this.velocity.z * dt;
      
      // Rotate jetbike to face movement direction if moving
      if (this.direction.length() > 0) {
        // Calculate target rotation
        const targetRotation = Math.atan2(this.direction.x, this.direction.z);
        
        // Smoothly rotate towards movement direction
        let currentRotation = this.el.object3D.rotation.y;
        const rotationDiff = targetRotation - currentRotation;
        
        // Handle angle wrapping
        let angleDiff = (rotationDiff + Math.PI) % (Math.PI * 2) - Math.PI;
        
        // Apply smooth rotation
        this.el.object3D.rotation.y += angleDiff * dt * this.data.rotationSpeed;
      }
    },
    
    applyHoverEffect: function(time) {
      // Add a gentle bobbing hover effect
      const hoverHeight = Math.sin(time * 0.003) * 0.05;
      const hoverTilt = Math.sin(time * 0.002) * 0.02;
      
      // Apply hover height
      this.el.object3D.position.y += hoverHeight;
      
      // Apply hover tilt (slight roll)
      this.el.object3D.rotation.z = hoverTilt;
    },

    remove: function () {
      // Remove event listeners
      window.removeEventListener('keydown', this.keydownHandler);
      window.removeEventListener('keyup', this.keyupHandler);
      
      // Clean up animation mixer
      if (this.mixer) {
        this.mixer.stopAllAction();
      }
    }
  });
}
