AFRAME.registerComponent('player-component', {
  schema: {
    speed: { type: 'number', default: 5 },
    health: { type: 'number', default: 100 }
  },

  init: function () {
    // Movement controls
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.acceleration = 80.0;
    this.deceleration = 5.0;
    this.keys = {
      KeyW: false,
      KeyS: false,
      KeyA: false,
      KeyD: false,
      KeyQ: false, // Up
      KeyE: false, // Down
      ShiftLeft: false, // Boost
      Space: false // Fire weapon
    };

    // Health management
    this.currentHealth = this.data.health;
    this.healthBar = document.getElementById('health-bar');
    this.damageOverlay = document.getElementById('damage-overlay');
    this.updateHealthBar();

    // Movement velocity
    this.moveVector = new THREE.Vector3(0, 0, 0);

    // Set up event listeners
    this.attachEventListeners();

    // Create jetbike sounds
    this.createSounds();

    // Hoverbike-specific variables
    this.hoverTime = 0;
    this.rotationSpeed = 0;
    this.weaponComponent = this.el.querySelector('[weapon-component]');
  },

  attachEventListeners: function () {
    // Keyboard events
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));

    // Damage event
    this.el.addEventListener('damage', this.onDamage.bind(this));
  },

  createSounds: function () {
  },

  onKeyDown: function (event) {
    if (event.code in this.keys) {
      this.keys[event.code] = true;

      // Prevent default for movement/action keys to avoid scrolling
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'Space'].includes(event.code)) {
        event.preventDefault();
      }

      // Handle space key for firing
      if (event.code === 'Space') {
        // Fire weapon directly
        const weaponComponent = this.el.components['weapon-component'];
        if (weaponComponent) {
          weaponComponent.fire();
        }
      }
    }
  },

  onKeyUp: function (event) {
    if (this.keys.hasOwnProperty(event.code)) {
      this.keys[event.code] = false;
    }
  },

  onDamage: function (event) {
    const damageAmount = event.detail.amount;
    this.currentHealth = Math.max(0, this.currentHealth - damageAmount);

    // Visual feedback
    this.damageOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
    setTimeout(() => {
      this.damageOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0)';
    }, 100);

    // Play damage sound
    console.log('Player damage - sound disabled');

    // Update health bar
    this.updateHealthBar();

    // Check for death
    if (this.currentHealth <= 0) {
      this.onDeath();
    }
  },

  updateHealthBar: function () {
    const healthPercent = (this.currentHealth / this.data.health) * 100;
    this.healthBar.style.width = healthPercent + '%';

    // Change color based on health
    if (healthPercent > 60) {
      this.healthBar.style.backgroundColor = '#0f0'; // Green
    } else if (healthPercent > 30) {
      this.healthBar.style.backgroundColor = '#ff0'; // Yellow
    } else {
      this.healthBar.style.backgroundColor = '#f00'; // Red
    }
  },

  onDeath: function () {
    // Show game over message
    const gameMessage = document.getElementById('game-message');
    gameMessage.innerHTML = 'Game Over<br><button id="restart-button">Restart</button>';
    gameMessage.style.display = 'block';

    document.getElementById('restart-button').addEventListener('click', () => {
      window.location.reload();
    });
  },

  tick: function (time, delta) {
    // Check if game is running
    const gameManager = document.querySelector('[game-manager]').components['game-manager'];
    if (!gameManager || !gameManager.gameStarted) return;

    const deltaSeconds = delta / 1000;
    let velocity = this.velocity;
    let moveVector = this.moveVector;
    const acceleration = this.acceleration;
    const deceleration = this.deceleration;

    // Reset move vector
    moveVector.set(0, 0, 0);

    // Apply hover effect - gentle bobbing up and down
    this.hoverTime += deltaSeconds;
    const hoverOffset = Math.sin(this.hoverTime * 2) * this.data.hoverVariation;
    const targetHeight = this.data.hoverHeight + hoverOffset;
    this.el.object3D.position.y = THREE.MathUtils.lerp(
      this.el.object3D.position.y,
      targetHeight,
      deltaSeconds * 2
    );

    // Forward/backward movement in bike's local z axis
    if (this.keys.KeyW) moveVector.z -= 1;
    if (this.keys.KeyS) moveVector.z += 1;

    // Turning left/right updates rotation rather than strafing
    if (this.keys.KeyA) this.rotationSpeed = THREE.MathUtils.lerp(this.rotationSpeed, this.data.turnSpeed, deltaSeconds * 5);
    else if (this.keys.KeyD) this.rotationSpeed = THREE.MathUtils.lerp(this.rotationSpeed, -this.data.turnSpeed, deltaSeconds * 5);
    else this.rotationSpeed = THREE.MathUtils.lerp(this.rotationSpeed, 0, deltaSeconds * 3);

    // Up/Down movement
    if (this.keys.KeyQ) moveVector.y += 1;
    if (this.keys.KeyE) moveVector.y -= 1;

    // Rotate the bike based on turn speed
    this.el.object3D.rotation.y += this.rotationSpeed * deltaSeconds;

    // Fire weapons when space is pressed
    if (this.keys.Space && this.weaponComponent) {
      this.weaponComponent.fire();
    }

    // Normalize vector if we're moving in multiple directions
    if (moveVector.length() > 1) {
      moveVector.normalize();
    }

    // Apply acceleration
    if (moveVector.z !== 0 || moveVector.y !== 0) {
      // Get speed multiplier
      const speedMultiplier = this.keys.ShiftLeft ? 2.0 : 1.0;

      // Forward/backward acceleration in local space
      velocity.z = THREE.MathUtils.lerp(
        velocity.z,
        moveVector.z * this.data.speed * speedMultiplier,
        acceleration * deltaSeconds
      );

      // Up/down acceleration in world space
      velocity.y = THREE.MathUtils.lerp(
        velocity.y,
        moveVector.y * this.data.speed * speedMultiplier,
        acceleration * deltaSeconds
      );
    } else {
      // Apply deceleration
      velocity.z = THREE.MathUtils.lerp(velocity.z, 0, deceleration * deltaSeconds);
      velocity.y = THREE.MathUtils.lerp(velocity.y, 0, deceleration * deltaSeconds);
    }

    // Convert local forward/backward velocity to world space
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.el.object3D.quaternion);
    forward.y = 0; // Keep movement in horizontal plane
    if (forward.length() > 0) forward.normalize();

    // Move in the bike's forward direction
    this.el.object3D.position.addScaledVector(forward, velocity.z * deltaSeconds);

    // Apply vertical movement directly in world space
    this.el.object3D.position.y += velocity.y * deltaSeconds;
  }
});

// Helper function to convert degrees to radians
function degToRad(degrees) {
  return degrees * (Math.PI / 180);
}
AFRAME.registerComponent('player-component', {
  schema: {
    speed: { type: 'number', default: 5 },
    health: { type: 'number', default: 100 },
    canMove: { type: 'boolean', default: true }
  },

  init: function () {
    // Store initial health
    this.health = this.data.health;
    this.isDead = false;
    this.isSprinting = false;
    this.velocity = new THREE.Vector3();
    this.acceleration = new THREE.Vector3();
    this.damping = 0.9;
    this.rotationSpeed = 2.0;
    
    // Initialize camera reference
    this.camera = document.getElementById('camera');
    if (!this.camera) {
      console.error('Player component could not find camera!');
    }

    // Setup key bindings for movement
    this.keys = {
      KeyW: false,
      KeyA: false,
      KeyS: false,
      KeyD: false,
      KeyQ: false,
      KeyE: false,
      ShiftLeft: false
    };

    // Add event listeners for key presses
    this.addKeyListeners();
    
    // Setup the UI elements
    this.setupUI();
    
    // Add a small wobble effect for hover
    this.addHoverEffect();
  },

  addKeyListeners: function() {
    // Key down listener
    this.keyDownHandler = (e) => {
      if (this.keys.hasOwnProperty(e.code)) {
        this.keys[e.code] = true;
        if (e.code === 'ShiftLeft') {
          this.isSprinting = true;
        }
      }
    };
    
    // Key up listener
    this.keyUpHandler = (e) => {
      if (this.keys.hasOwnProperty(e.code)) {
        this.keys[e.code] = false;
        if (e.code === 'ShiftLeft') {
          this.isSprinting = false;
        }
      }
    };
    
    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);
  },
  
  setupUI: function() {
    this.healthBar = document.getElementById('health-bar');
    this.updateHealthUI();
  },
  
  addHoverEffect: function() {
    // Add subtle hover bob to the player
    const initialY = this.el.object3D.position.y;
    this.hoverData = {
      amplitude: 0.1,
      frequency: 1.5,
      initialY: initialY,
      time: 0
    };
  },

  updateHealthUI: function() {
    if (this.healthBar) {
      const healthPercent = (this.health / this.data.health) * 100;
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
  
  takeDamage: function(amount) {
    if (this.isDead) return;
    
    this.health -= amount;
    this.updateHealthUI();
    
    // Show damage overlay
    const damageOverlay = document.getElementById('damage-overlay');
    if (damageOverlay) {
      damageOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
      setTimeout(() => {
        damageOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0)';
      }, 300);
    }
    
    if (this.health <= 0) {
      this.die();
    }
  },
  
  die: function() {
    this.isDead = true;
    this.health = 0;
    this.updateHealthUI();
    
    // Notify game manager
    const gameManager = document.querySelector('[game-manager]');
    if (gameManager && gameManager.components['game-manager']) {
      gameManager.components['game-manager'].playerDied();
    }
  },

  updateMovement: function(dt) {
    if (this.isDead || !this.data.canMove) return;
    
    const rotationSpeed = this.rotationSpeed;
    const currentSpeed = this.isSprinting ? this.data.speed * 1.5 : this.data.speed;
    
    // Get camera rotation for movement direction
    const cameraRotation = this.camera ? this.camera.object3D.rotation.y : 0;
    
    // Reset velocity each frame
    this.velocity.set(0, 0, 0);
    
    // Calculate movement vector based on keys and camera rotation
    if (this.keys.KeyW) {
      this.velocity.z -= Math.cos(cameraRotation) * currentSpeed;
      this.velocity.x -= Math.sin(cameraRotation) * currentSpeed;
    }
    if (this.keys.KeyS) {
      this.velocity.z += Math.cos(cameraRotation) * currentSpeed;
      this.velocity.x += Math.sin(cameraRotation) * currentSpeed;
    }
    if (this.keys.KeyA) {
      this.velocity.z += Math.sin(cameraRotation) * currentSpeed;
      this.velocity.x -= Math.cos(cameraRotation) * currentSpeed;
    }
    if (this.keys.KeyD) {
      this.velocity.z -= Math.sin(cameraRotation) * currentSpeed;
      this.velocity.x += Math.cos(cameraRotation) * currentSpeed;
    }
    
    // Vertical movement (Q/E for up/down)
    if (this.keys.KeyQ) {
      this.velocity.y += currentSpeed;
    }
    if (this.keys.KeyE) {
      this.velocity.y -= currentSpeed;
    }
    
    // Apply velocity to position
    this.el.object3D.position.x += this.velocity.x * dt;
    this.el.object3D.position.y += this.velocity.y * dt;
    this.el.object3D.position.z += this.velocity.z * dt;
    
    // Apply hover effect
    this.updateHoverEffect(dt);
    
    // Update player rotation to face movement direction
    if (this.velocity.length() > 0.1) {
      // Calculate target rotation
      const targetRotation = Math.atan2(this.velocity.x, this.velocity.z);
      
      // Current rotation
      let currentRotation = this.el.object3D.rotation.y;
      
      // Smoothly interpolate rotation
      const delta = targetRotation - currentRotation;
      let rotDelta = delta;
      
      // Handle circular wrap-around
      if (delta > Math.PI) rotDelta = delta - Math.PI * 2;
      if (delta < -Math.PI) rotDelta = delta + Math.PI * 2;
      
      // Apply smooth rotation
      this.el.object3D.rotation.y += rotDelta * rotationSpeed * dt;
    }
  },
  
  updateHoverEffect: function(dt) {
    if (!this.hoverData) return;
    
    this.hoverData.time += dt * this.hoverData.frequency;
    const hoverOffset = Math.sin(this.hoverData.time) * this.hoverData.amplitude;
    
    // Apply subtle hover effect to Y position
    this.el.object3D.position.y = this.hoverData.initialY + hoverOffset;
  },

  tick: function(time, deltaTime) {
    const dt = deltaTime / 1000;
    
    // Update player movement
    this.updateMovement(dt);
  },
  
  remove: function() {
    // Clean up event listeners
    window.removeEventListener('keydown', this.keyDownHandler);
    window.removeEventListener('keyup', this.keyUpHandler);
  }
});
