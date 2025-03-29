
/* global AFRAME, THREE */

// Prevent duplicate registration
if (!AFRAME.components['player-component']) {
  AFRAME.registerComponent('player-component', {
    schema: {
      speed: { type: 'number', default: 5 },
      rotationSpeed: { type: 'number', default: 2 },
      health: { type: 'number', default: 100 },
      acceleration: { type: 'number', default: 30 },
      deceleration: { type: 'number', default: 10 },
      verticalSpeed: { type: 'number', default: 3 },
      maxSpeed: { type: 'number', default: 8 }
    },

    init: function () {
      // Initialize movement variables
      this.velocity = new THREE.Vector3(0, 0, 0);
      this.acceleration = new THREE.Vector3(0, 0, 0);
      this.keys = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        up: false, // For Q key (up)
        down: false // For E key (down)
      };
      this.mouseX = 0;
      this.mouseY = 0;
      this.targetRotation = new THREE.Euler();
      this.currentHealth = this.data.health;
      this.dead = false;
      this.gameManager = document.querySelector('[game-manager]');
      
      // Subscribe to key events
      this.addEventListeners();

      console.log("Player component initialized with health:", this.currentHealth);
      
      // Set up health UI
      this.updateHealthUI();
    },

    // Set up event listeners for keyboard input
    addEventListeners: function () {
      // Key down events
      this.onKeyDown = this.onKeyDown.bind(this);
      this.onKeyUp = this.onKeyUp.bind(this);
      this.onMouseMove = this.onMouseMove.bind(this);

      window.addEventListener('keydown', this.onKeyDown);
      window.addEventListener('keyup', this.onKeyUp);
      document.addEventListener('mousemove', this.onMouseMove);
    },

    onKeyDown: function (event) {
      // Check if game is running (if game manager exists)
      if (this.gameManager && 
          this.gameManager.components &&
          this.gameManager.components['game-manager'] &&
          !this.gameManager.components['game-manager'].gameStarted) {
        return;
      }

      // Handle key presses for movement
      switch (event.code) {
        case 'KeyW':
          this.keys.forward = true;
          break;
        case 'KeyS':
          this.keys.backward = true;
          break;
        case 'KeyA':
          this.keys.left = true;
          break;
        case 'KeyD':
          this.keys.right = true;
          break;
        case 'KeyQ': // Up
          this.keys.up = true;
          break;
        case 'KeyE': // Down
          this.keys.down = true;
          break;
      }
    },

    onKeyUp: function (event) {
      // Handle key releases for movement
      switch (event.code) {
        case 'KeyW':
          this.keys.forward = false;
          break;
        case 'KeyS':
          this.keys.backward = false;
          break;
        case 'KeyA':
          this.keys.left = false;
          break;
        case 'KeyD':
          this.keys.right = false;
          break;
        case 'KeyQ': // Up
          this.keys.up = false;
          break;
        case 'KeyE': // Down
          this.keys.down = false;
          break;
      }
    },

    onMouseMove: function (event) {
      // Only track mouse if pointer is locked (game is active)
      if (document.pointerLockElement) {
        this.mouseX = event.movementX || 0;
      }
    },

    // Deal damage to player
    takeDamage: function (amount) {
      if (this.dead) return;

      this.currentHealth = Math.max(0, this.currentHealth - amount);
      this.updateHealthUI();
      this.showDamageEffect();

      // Check if player died
      if (this.currentHealth <= 0) {
        this.die();
      }
    },

    // Show damage overlay effect
    showDamageEffect: function () {
      const damageOverlay = document.getElementById('damage-overlay');
      if (damageOverlay) {
        damageOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
        setTimeout(() => {
          damageOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0)';
        }, 200);
      }
    },

    // Update health UI
    updateHealthUI: function () {
      const healthBar = document.getElementById('health-bar');
      if (healthBar) {
        const healthPercent = (this.currentHealth / this.data.health) * 100;
        healthBar.style.width = healthPercent + '%';

        // Change color based on health
        if (healthPercent > 60) {
          healthBar.style.backgroundColor = '#0f0'; // Green
        } else if (healthPercent > 30) {
          healthBar.style.backgroundColor = '#ff0'; // Yellow
        } else {
          healthBar.style.backgroundColor = '#f00'; // Red
        }
      }
    },

    // Player death logic
    die: function () {
      this.dead = true;

      // Notify game manager
      if (this.gameManager && 
          this.gameManager.components && 
          this.gameManager.components['game-manager']) {
        this.gameManager.components['game-manager'].playerDied();
      }

      // Show game over screen
      const gameMessage = document.getElementById('game-message');
      if (gameMessage) {
        gameMessage.innerHTML = 'Game Over!<br/><button id="restart-button">Restart</button>';
        gameMessage.style.display = 'block';

        // Add restart button functionality
        document.getElementById('restart-button').addEventListener('click', () => {
          location.reload();
        });
      }
    },

    tick: function (time, deltaTime) {
      // Skip if player is dead or game is not running
      if (this.dead || 
         (this.gameManager && 
          this.gameManager.components && 
          this.gameManager.components['game-manager'] &&
          !this.gameManager.components['game-manager'].gameStarted)) {
        return;
      }

      // Delta time in seconds, clamped to avoid huge jumps
      const dt = Math.min(deltaTime / 1000, 0.1);
      
      // Handle jetbike controls
      this.processControls(dt);
    },

    processControls: function(dt) {
      try {
        // Reset acceleration
        this.acceleration.set(0, 0, 0);

        // Get current rotation of player entity in radians
        const rotation = this.el.object3D.rotation.y;

        // Process keyboard input for movement
        // Forward/backward
        if (this.keys.forward) {
          this.acceleration.z = -Math.cos(rotation) * this.data.acceleration;
          this.acceleration.x = -Math.sin(rotation) * this.data.acceleration;
        } else if (this.keys.backward) {
          this.acceleration.z = Math.cos(rotation) * this.data.acceleration;
          this.acceleration.x = Math.sin(rotation) * this.data.acceleration;
        }

        // Strafe left/right
        if (this.keys.left) {
          this.acceleration.z -= Math.sin(rotation) * this.data.acceleration;
          this.acceleration.x += Math.cos(rotation) * this.data.acceleration;
        } else if (this.keys.right) {
          this.acceleration.z += Math.sin(rotation) * this.data.acceleration;
          this.acceleration.x -= Math.cos(rotation) * this.data.acceleration;
        }

        // Up/down for flying
        if (this.keys.up) {
          this.acceleration.y = this.data.verticalSpeed;
        } else if (this.keys.down) {
          this.acceleration.y = -this.data.verticalSpeed;
        }

        // Apply acceleration to velocity
        this.velocity.x += this.acceleration.x * dt;
        this.velocity.y += this.acceleration.y * dt;
        this.velocity.z += this.acceleration.z * dt;

        // Apply deceleration (drag) when no key is pressed
        if (!this.keys.forward && !this.keys.backward && !this.keys.left && !this.keys.right) {
          this.velocity.x *= (1 - Math.min(dt * this.data.deceleration, 0.95));
          this.velocity.z *= (1 - Math.min(dt * this.data.deceleration, 0.95));
        }
        
        // Apply vertical deceleration if not moving up/down
        if (!this.keys.up && !this.keys.down) {
          this.velocity.y *= (1 - Math.min(dt * this.data.deceleration, 0.95));
        }

        // Cap velocity at max speed
        const speedSq = this.velocity.x * this.velocity.x + 
                        this.velocity.z * this.velocity.z;
        if (speedSq > this.data.maxSpeed * this.data.maxSpeed) {
          const speed = Math.sqrt(speedSq);
          this.velocity.x = (this.velocity.x / speed) * this.data.maxSpeed;
          this.velocity.z = (this.velocity.z / speed) * this.data.maxSpeed;
        }

        // Set a slight hover bobbing motion
        const hoverOffset = Math.sin(time / 500) * 0.05;
        
        // Apply position changes from velocity
        this.el.object3D.position.x += this.velocity.x * dt;
        this.el.object3D.position.y += this.velocity.y * dt + hoverOffset;
        this.el.object3D.position.z += this.velocity.z * dt;

        // Rotate jetbike based on mouse movement
        if (this.mouseX !== 0) {
          this.el.object3D.rotation.y -= this.mouseX * 0.01 * this.data.rotationSpeed * dt;
          this.mouseX = 0; // Reset after applying
        }

        // Prevent falling through the ground
        if (this.el.object3D.position.y < 1) {
          this.el.object3D.position.y = 1;
          this.velocity.y = 0;
        }
      } catch (error) {
        console.error("Error in player controls:", error);
      }
    },

    remove: function () {
      // Remove event listeners
      window.removeEventListener('keydown', this.onKeyDown);
      window.removeEventListener('keyup', this.onKeyUp);
      document.removeEventListener('mousemove', this.onMouseMove);
    }
  });
}

/* global AFRAME, THREE */

if (!AFRAME.components['player-component']) {
  AFRAME.registerComponent('player-component', {
    schema: {
      speed: { type: 'number', default: 5 },
      rotationSpeed: { type: 'number', default: 2 },
      health: { type: 'number', default: 100 },
      maxHealth: { type: 'number', default: 100 },
      hoverHeight: { type: 'number', default: 1.5 },
      hoverVariation: { type: 'number', default: 0.1 },
      debug: { type: 'boolean', default: false }
    },

    init: function () {
      // Player state
      this.velocity = new THREE.Vector3(0, 0, 0);
      this.acceleration = new THREE.Vector3(0, 0, 0);
      this.keysPressed = {};
      this.isAlive = true;
      this.isMoving = false;
      this.direction = new THREE.Vector3();
      this.rotation = new THREE.Euler();

      // Health initialization
      this.currentHealth = this.data.health;
      this.healthBar = document.getElementById('health-bar');
      this.damageOverlay = document.getElementById('damage-overlay');
      this.updateHealthBar();

      // Hovering variables
      this.hoverTime = 0;
      this.hoverDelta = 0;
      this.currentHoverHeight = this.data.hoverHeight;

      // Camera reference
      this.cameraEl = document.getElementById('camera');
      this.pointerLocked = false;

      // Set up event listeners
      this.setupEventListeners();

      console.log("Player component initialized with health:", this.currentHealth);
    },

    setupEventListeners: function() {
      // Register keyboard event listeners
      this.keydownHandler = this.handleKeyDown.bind(this);
      this.keyupHandler = this.handleKeyUp.bind(this);
      window.addEventListener('keydown', this.keydownHandler);
      window.addEventListener('keyup', this.keyupHandler);

      // Pointer lock change handler
      document.addEventListener('pointerlockchange', () => {
        this.pointerLocked = document.pointerLockElement === document.body;
      });
    },

    handleKeyDown: function(event) {
      this.keysPressed[event.code] = true;
    },

    handleKeyUp: function(event) {
      this.keysPressed[event.code] = false;
    },

    tick: function(time, delta) {
      if (!this.isAlive || !this.pointerLocked) return;

      const dt = delta / 1000; // Convert to seconds

      try {
        // Calculate hover bobbing effect
        this.hoverTime += dt;
        this.hoverDelta = Math.sin(this.hoverTime * 2) * this.data.hoverVariation;
        this.currentHoverHeight = this.data.hoverHeight + this.hoverDelta;

        // Get camera direction for movement relative to view
        const cameraRotation = this.cameraEl.object3D.rotation.y;

        // Reset acceleration
        this.acceleration.set(0, 0, 0);

        // Handle keyboard input
        const speedFactor = this.data.speed;

        // Forward/backward movement
        if (this.keysPressed['KeyW']) {
          this.acceleration.x -= Math.sin(cameraRotation) * speedFactor;
          this.acceleration.z -= Math.cos(cameraRotation) * speedFactor;
        }
        if (this.keysPressed['KeyS']) {
          this.acceleration.x += Math.sin(cameraRotation) * speedFactor;
          this.acceleration.z += Math.cos(cameraRotation) * speedFactor;
        }

        // Left/right movement (strafing)
        if (this.keysPressed['KeyA']) {
          this.acceleration.x -= Math.sin(cameraRotation + Math.PI/2) * speedFactor;
          this.acceleration.z -= Math.cos(cameraRotation + Math.PI/2) * speedFactor;
        }
        if (this.keysPressed['KeyD']) {
          this.acceleration.x += Math.sin(cameraRotation + Math.PI/2) * speedFactor;
          this.acceleration.z += Math.cos(cameraRotation + Math.PI/2) * speedFactor;
        }

        // Up/down movement (vertical thrust)
        if (this.keysPressed['KeyQ']) {
          this.acceleration.y += speedFactor;
        }
        if (this.keysPressed['KeyE']) {
          this.acceleration.y -= speedFactor;
        }

        // Apply acceleration to velocity with damping
        this.velocity.x += this.acceleration.x * dt;
        this.velocity.y += this.acceleration.y * dt;
        this.velocity.z += this.acceleration.z * dt;

        // Apply damping (drag)
        const damping = 0.9;
        this.velocity.x *= damping;
        this.velocity.y *= damping;
        this.velocity.z *= damping;

        // Apply velocity to position
        const position = this.el.object3D.position;
        position.x += this.velocity.x * dt;
        position.y += this.velocity.y * dt;
        position.z += this.velocity.z * dt;

        // Enforce minimum height
        if (position.y < this.currentHoverHeight) {
          position.y = this.currentHoverHeight;
          this.velocity.y = 0;
        }

        // Update player rotation to face movement direction if moving
        if (Math.abs(this.velocity.x) > 0.1 || Math.abs(this.velocity.z) > 0.1) {
          this.isMoving = true;
          const targetRotation = Math.atan2(this.velocity.x, this.velocity.z);

          // Smoothly rotate toward movement direction
          const currentRotation = this.el.object3D.rotation.y;
          let deltaRotation = targetRotation - currentRotation;

          // Ensure we rotate the shortest way
          if (deltaRotation > Math.PI) deltaRotation -= Math.PI * 2;
          if (deltaRotation < -Math.PI) deltaRotation += Math.PI * 2;

          // Apply rotation with smoothing
          this.el.object3D.rotation.y += deltaRotation * Math.min(dt * this.data.rotationSpeed, 1);
        } else {
          this.isMoving = false;
        }
      } catch (error) {
        console.error('Error in player tick:', error);
      }
    },

    takeDamage: function(amount) {
      if (!this.isAlive) return;

      this.currentHealth -= amount;

      // Show damage effect
      if (this.damageOverlay) {
        this.damageOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
        setTimeout(() => {
          if (this.damageOverlay) {
            this.damageOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0)';
          }
        }, 100);
      }

      // Check for death
      if (this.currentHealth <= 0) {
        this.currentHealth = 0;
        this.die();
      }

      this.updateHealthBar();
    },

    updateHealthBar: function() {
      if (this.healthBar) {
        const healthPercent = (this.currentHealth / this.data.maxHealth) * 100;
        this.healthBar.style.width = healthPercent + '%';

        // Change color based on health
        if (healthPercent > 60) {
          this.healthBar.style.backgroundColor = '#0f0'; // Green
        } else if (healthPercent > 30) {
          this.healthBar.style.backgroundColor = '#ff0'; // Yellow
        } else {
          this.healthBar.style.backgroundColor = '#f00'; // Red
        }
      }
    },

    die: function() {
      this.isAlive = false;

      // Show game over message
      const gameMessage = document.getElementById('game-message');
      if (gameMessage) {
        gameMessage.innerHTML = 'Game Over<br><button id="restart-button">Restart</button>';
        gameMessage.style.display = 'block';

        // Add restart button handler
        document.getElementById('restart-button').addEventListener('click', () => {
          // Reload the page to restart
          window.location.reload();
        });
      }

      // Release pointer lock
      document.exitPointerLock();
    },

    remove: function() {
      // Clean up event listeners
      window.removeEventListener('keydown', this.keydownHandler);
      window.removeEventListener('keyup', this.keyupHandler);
    }
  });
}