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
    if (this.keys.hasOwnProperty(event.code)) {
      this.keys[event.code] = true;
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