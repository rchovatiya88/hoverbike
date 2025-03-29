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