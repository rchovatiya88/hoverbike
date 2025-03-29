AFRAME.registerComponent('player-component', {
  schema: {
    speed: { type: 'number', default: 5 },
    health: { type: 'number', default: 100 },
    rotationSpeed: { type: 'number', default: 2 },
    hoverHeight: { type: 'number', default: 1.5 },
    hoverVariance: { type: 'number', default: 0.1 },
    acceleration: { type: 'number', default: 0.1 },
    deceleration: { type: 'number', default: 0.05 },
    verticalSpeed: { type: 'number', default: 3 },
    maxSpeed: { type: 'number', default: 10 }
  },

  init: function () {
    // Initialize movement variables
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.acceleration = new THREE.Vector3(0, 0, 0);
    this.targetRotation = new THREE.Euler();
    this.moveVector = new THREE.Vector3(0, 0, 0);
    this.targetPosition = new THREE.Vector3();
    this.cameraEl = document.getElementById('camera');

    // Input state
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      ascend: false,
      descend: false
    };

    // Movement state
    this.movementEnabled = true;
    this.health = this.data.health;
    this.isAlive = true;
    this.isHovering = true;
    this.hoverTime = 0;

    // Setup health display
    this.updateHealthDisplay();

    // Setup event listeners
    this.setupEventListeners();

    console.log('Player component initialized');
  },

  updateHealthDisplay: function() {
    const healthBar = document.getElementById('health-bar');
    if (healthBar) {
      const healthPercent = Math.max(0, this.health) / this.data.health * 100;
      healthBar.style.width = healthPercent + '%';

      // Change color based on health
      if (healthPercent > 50) {
        healthBar.style.backgroundColor = '#0f0';  // Green
      } else if (healthPercent > 25) {
        healthBar.style.backgroundColor = '#ff0';  // Yellow
      } else {
        healthBar.style.backgroundColor = '#f00';  // Red
      }
    }
  },

  setupEventListeners: function() {
    // Keyboard event listeners
    this.onKeyDown = this.handleKeyDown.bind(this);
    this.onKeyUp = this.handleKeyUp.bind(this);

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    // Handle damage events
    this.el.addEventListener('player-damage', this.onDamage.bind(this));
  },

  handleKeyDown: function(event) {
    const code = event.code;

    // Check if game is paused or player is dead
    if (!this.movementEnabled || !this.isAlive) return;

    switch(code) {
      case 'KeyW': this.keys.forward = true; break;
      case 'KeyS': this.keys.backward = true; break;
      case 'KeyA': this.keys.left = true; break;
      case 'KeyD': this.keys.right = true; break;
      case 'KeyQ': this.keys.ascend = true; break;
      case 'KeyE': this.keys.descend = true; break;
    }
  },

  handleKeyUp: function(event) {
    const code = event.code;

    switch(code) {
      case 'KeyW': this.keys.forward = false; break;
      case 'KeyS': this.keys.backward = false; break;
      case 'KeyA': this.keys.left = false; break;
      case 'KeyD': this.keys.right = false; break;
      case 'KeyQ': this.keys.ascend = false; break;
      case 'KeyE': this.keys.descend = false; break;
    }
  },

  onDamage: function(event) {
    const damage = event.detail.damage;

    // Apply damage to player
    this.health = Math.max(0, this.health - damage);
    this.updateHealthDisplay();

    // Show damage overlay
    const overlay = document.getElementById('damage-overlay');
    if (overlay) {
      overlay.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
      setTimeout(() => {
        overlay.style.backgroundColor = 'rgba(255, 0, 0, 0)';
      }, 100);
    }

    // Check if player is dead
    if (this.health <= 0 && this.isAlive) {
      this.isAlive = false;
      this.death();
    }
  },

  death: function() {
    this.movementEnabled = false;

    // Display game over message
    const gameMessage = document.getElementById('game-message');
    if (gameMessage) {
      gameMessage.innerHTML = 'Game Over<br /><button id="restart-button">Restart</button>';
      gameMessage.style.display = 'block';

      // Add event listener to restart button
      document.getElementById('restart-button').addEventListener('click', () => {
        window.location.reload();
      });
    }

    // Tell game manager player is dead
    const gameManagerEl = document.querySelector('[game-manager]');
    if (gameManagerEl && gameManagerEl.components['game-manager']) {
      gameManagerEl.components['game-manager'].onPlayerDeath();
    }
  },

  updateMovement: function(deltaTime) {
    // Get movement input
    this.moveVector.set(0, 0, 0);

    // Forward/backward movement
    if (this.keys.forward) this.moveVector.z -= 1;
    if (this.keys.backward) this.moveVector.z += 1;

    // Left/right movement
    if (this.keys.left) this.moveVector.x -= 1;
    if (this.keys.right) this.moveVector.x += 1;

    // Normalize movement vector if necessary
    if (this.moveVector.length() > 1) {
      this.moveVector.normalize();
    }

    // Get camera direction to align movement with view
    if (this.cameraEl) {
      const cameraRotation = this.cameraEl.object3D.rotation;
      const forward = new THREE.Vector3(0, 0, -1);
      forward.applyEuler(new THREE.Euler(0, cameraRotation.y, 0));

      const right = new THREE.Vector3(1, 0, 0);
      right.applyEuler(new THREE.Euler(0, cameraRotation.y, 0));

      // Calculate movement direction
      const moveDir = new THREE.Vector3();
      moveDir.addScaledVector(forward, -this.moveVector.z);
      moveDir.addScaledVector(right, this.moveVector.x);

      // Apply horizontal movement
      if (moveDir.length() > 0) {
        moveDir.normalize();
        this.velocity.x += moveDir.x * this.data.acceleration * this.data.speed;
        this.velocity.z += moveDir.z * this.data.acceleration * this.data.speed;

        // Update rotation to match movement direction
        if (moveDir.length() > 0.1) {
          this.targetRotation.y = Math.atan2(moveDir.x, -moveDir.z);
        }
      }
    }

    // Vertical movement
    if (this.keys.ascend) {
      this.velocity.y += this.data.acceleration * this.data.verticalSpeed;
    }
    if (this.keys.descend && this.el.object3D.position.y > this.data.hoverHeight) {
      this.velocity.y -= this.data.acceleration * this.data.verticalSpeed;
    }

    // Apply deceleration
    this.velocity.x *= (1 - this.data.deceleration);
    this.velocity.z *= (1 - this.data.deceleration);
    this.velocity.y *= (1 - this.data.deceleration);

    // Apply hover effect - gentle bobbing
    if (this.isHovering) {
      this.hoverTime += deltaTime;
      const hoverOffset = Math.sin(this.hoverTime * 2) * this.data.hoverVariance;

      // Apply hover force if below hover height
      const currentHeight = this.el.object3D.position.y;
      const targetHeight = this.data.hoverHeight + hoverOffset;

      if (currentHeight < targetHeight) {
        this.velocity.y += (targetHeight - currentHeight) * 0.05;
      }
    }

    // Apply velocity
    const position = this.el.object3D.position;
    position.x += this.velocity.x * deltaTime;
    position.y += this.velocity.y * deltaTime;
    position.z += this.velocity.z * deltaTime;

    // Apply rotation with smoothing
    const currentRotation = this.el.object3D.rotation;
    currentRotation.y += (this.targetRotation.y - currentRotation.y) * 0.1;

    // Ensure we don't go below ground level (with a small buffer)
    if (position.y < 0.1) {
      position.y = 0.1;
      this.velocity.y = 0;
    }
  },

  tick: function (time, deltaTime) {
    // Convert to seconds for easier physics calculations
    const dt = deltaTime / 1000;

    if (this.isAlive && this.movementEnabled) {
      this.updateMovement(dt);
    }
  },

  remove: function () {
    // Clean up event listeners
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.el.removeEventListener('player-damage', this.onDamage);
  }
});