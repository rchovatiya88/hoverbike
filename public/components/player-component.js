/* global AFRAME, THREE */

AFRAME.registerComponent('player-component', {
  schema: {
    speed: { type: 'number', default: 5 },
    rotationSpeed: { type: 'number', default: 2 },
    acceleration: { type: 'number', default: 30 },
    deceleration: { type: 'number', default: 10 },
    jumpForce: { type: 'number', default: 10 },
    maxVelocity: { type: 'number', default: 20 },
    health: { type: 'number', default: 100 },
    maxHealth: { type: 'number', default: 100 },
    gravityEnabled: { type: 'boolean', default: false },
    gravity: { type: 'number', default: 9.8 },
    hoverHeight: { type: 'number', default: 1.5 },
    hoverDamping: { type: 'number', default: 0.95 },
    hoverForce: { type: 'number', default: 5 },
    hoverAmplitude: { type: 'number', default: 0.1 },
    hoverFrequency: { type: 'number', default: 2 },
    moveSpeed: {type: 'number', default: 5},
    boostSpeed: {type: 'number', default: 10},
    boostAcceleration: {type: 'number', default: 50},
    damping: {type: 'number', default: 0.9}

  },

  init: function() {
    // Initialize state
    this.velocity = new THREE.Vector3();
    this.acceleration = new THREE.Vector3();
    this.moveDirection = new THREE.Vector3();
    this.keys = {};
    this.isMoving = false;
    this.isBoosting = false;
    this.isGrounded = false;
    this.hoverPhase = 0;
    this.currentHealth = this.data.health;
    this.isDead = false;
    this.targetDirection = new THREE.Vector3(0, 0, -1);

    // Create physics helpers
    this.raycaster = new THREE.Raycaster();
    this.groundNormal = new THREE.Vector3(0, 1, 0);

    // Create particle trail effect
    this.initParticleTrail();

    // Setup event listeners
    this.setupEventListeners();

    // Update health UI
    this.updateHealthBar();

    // Add control hints to UI
    this.addControlHints();

    console.log("Player component initialized");
  },

  setupEventListeners: function() {
    // Keyboard events
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousemove', this.onMouseMove);

    // Listen for damage events
    this.el.addEventListener('damage', this.onDamage.bind(this));
    this.el.addEventListener('heal', this.onHeal.bind(this));
  },

  initParticleTrail: function() {
    // Create simple particle trail effect (can be enhanced with a particle system)
    this.particleGroup = new THREE.Group();
    this.el.object3D.add(this.particleGroup);

    this.particles = [];
    this.particleCount = 10;
    this.particleSize = 0.1;

    const particleGeometry = new THREE.SphereGeometry(this.particleSize, 8, 8);
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: 0x3399ff,
      transparent: true,
      opacity: 0.7
    });

    for (let i = 0; i < this.particleCount; i++) {
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.set(0, -0.5, 1 + (i * 0.1));
      particle.visible = false;
      this.particleGroup.add(particle);
      this.particles.push({
        mesh: particle,
        life: 0,
        maxLife: 1.0,
        speed: 0.5 + Math.random() * 0.5
      });
    }
  },

  updateParticles: function(delta) {
    const deltaSeconds = delta / 1000;
    const speed = this.velocity.length();

    // Only emit particles when moving above a certain speed
    const shouldEmit = speed > 2.0 && this.isMoving;

    for (const particle of this.particles) {
      if (particle.life <= 0) {
        if (shouldEmit) {
          // Reset particle position to behind the player
          particle.mesh.position.set(
            (Math.random() - 0.5) * 0.3, 
            -0.5 + (Math.random() - 0.5) * 0.2, 
            1.0 + (Math.random() - 0.5) * 0.2
          );
          particle.life = particle.maxLife;
          particle.mesh.visible = true;
          particle.mesh.scale.set(1, 1, 1);

          // Set color based on movement speed
          if (this.isBoosting) {
            particle.mesh.material.color.setHex(0xff3333);
          } else {
            particle.mesh.material.color.setHex(0x3399ff);
          }
        }
      } else {
        // Update active particle
        particle.life -= deltaSeconds;
        particle.mesh.position.z += particle.speed * deltaSeconds;
        particle.mesh.material.opacity = particle.life / particle.maxLife;
        particle.mesh.scale.multiplyScalar(0.95);

        if (particle.life <= 0) {
          particle.mesh.visible = false;
        }
      }
    }
  },

  onKeyDown: function(event) {
    this.keys[event.code] = true;

    // Handle vertical movement with Q/E keys
    if (event.code === 'KeyQ' && !this.isDead) {
      // Upward movement
      this.moveDirection.y = 1;
    }
    if (event.code === 'KeyE' && !this.isDead) {
      // Downward movement
      this.moveDirection.y = -1;
    }

    // Toggle boost
    if (event.code === 'ShiftLeft') {
      this.isBoosting = true;
    }
  },

  onKeyUp: function(event) {
    this.keys[event.code] = false;

    // Reset vertical velocity when Q/E released
    if ((event.code === 'KeyQ' || event.code === 'KeyE') && !this.isDead) {
      this.moveDirection.y = 0;
    }

    // Toggle boost off
    if (event.code === 'ShiftLeft') {
      this.isBoosting = false;
    }
  },

  onMouseMove: function(event) {
    if (!document.pointerLockElement) return;

    // This function only handles targeting direction for weapons
    // The camera controls handle actual rotation
  },

  onDamage: function(event) {
    const damage = event.detail.damage || 10;

    this.currentHealth = Math.max(0, this.currentHealth - damage);
    this.updateHealthBar();

    // Show damage overlay
    this.showDamageEffect();

    if (this.currentHealth <= 0 && !this.isDead) {
      this.die();
    }
  },

  onHeal: function(event) {
    const amount = event.detail.amount || 10;

    this.currentHealth = Math.min(this.data.maxHealth, this.currentHealth + amount);
    this.updateHealthBar();
  },

  updateHealthBar: function() {
    const healthBar = document.getElementById('health-bar');
    if (healthBar) {
      const healthPercent = (this.currentHealth / this.data.maxHealth) * 100;
      healthBar.style.width = `${healthPercent}%`;

      // Change color based on health
      if (healthPercent < 25) {
        healthBar.style.backgroundColor = '#f00';
      } else if (healthPercent < 50) {
        healthBar.style.backgroundColor = '#ff0';
      } else {
        healthBar.style.backgroundColor = '#0f0';
      }
    }
  },

  showDamageEffect: function() {
    const overlay = document.getElementById('damage-overlay');
    if (overlay) {
      overlay.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
      setTimeout(() => {
        overlay.style.backgroundColor = 'rgba(255, 0, 0, 0)';
      }, 100);
    }
  },

  die: function() {
    this.isDead = true;
    console.log('Player died');

    // Show game over message
    const gameMessage = document.getElementById('game-message');
    if (gameMessage) {
      gameMessage.style.display = 'block';
      gameMessage.innerHTML = 'Game Over!<br><button id="restart-button">Restart</button>';

      const restartButton = document.getElementById('restart-button');
      if (restartButton) {
        restartButton.addEventListener('click', () => {
          window.location.reload();
        });
      }
    }

    // Exit pointer lock
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
  },

  respawn: function() {
    this.isDead = false;
    this.currentHealth = this.data.maxHealth;
    this.updateHealthBar();
    this.el.setAttribute('position', '0 1.5 0');
    this.el.setAttribute('rotation', '0 0 0');
    this.velocity.set(0, 0, 0);
  },

  updateMovement: function(deltaTime) {
    const deltaSeconds = deltaTime / 1000;

    // Reset acceleration each frame
    this.acceleration.set(0, 0, 0);

    // Apply movement force based on player input
    if (this.moveDirection.length() > 0) {
      // Normalize direction to prevent diagonal movement being faster
      const normalizedDirection = this.moveDirection.clone().normalize();

      // Convert direction from local to world space
      const rotationMatrix = new THREE.Matrix4();
      rotationMatrix.makeRotationY(this.el.object3D.rotation.y);
      normalizedDirection.applyMatrix4(rotationMatrix);

      // Apply movement force with potential boost
      const currentSpeed = this.isBoosting ? this.data.boostSpeed : this.data.speed;

      // Smoother acceleration for better flying feel
      const targetAcceleration = normalizedDirection.multiplyScalar(currentSpeed * 12);
      this.acceleration.lerp(targetAcceleration, 0.15);
    }

    // Update velocity with acceleration
    this.velocity.add(this.acceleration.clone().multiplyScalar(deltaSeconds));

    // Apply progressive damping - less damping at higher speeds for smoother deceleration
    const speedFactor = Math.min(this.velocity.length() / 15, 1);
    const dynamicDamping = THREE.MathUtils.lerp(0.99, this.data.damping, speedFactor);

    // Apply damping to slow down gradually when not moving
    this.velocity.x *= dynamicDamping;
    this.velocity.z *= dynamicDamping;
    this.velocity.y *= dynamicDamping; // Apply damping to vertical movement as well
  },

  checkGround: function() {
    // Check distance to ground
    const origin = this.el.object3D.position.clone();
    origin.y += 0.1; // Start slightly above the player position

    this.raycaster.set(origin, new THREE.Vector3(0, -1, 0));
    this.raycaster.far = 2.0; // Maximum ground check distance

    const intersects = this.raycaster.intersectObject(this.el.sceneEl.object3D, true);

    // Filter out self-intersections
    const validHits = intersects.filter(hit => {
      const hitEntity = hit.object.el;
      return hitEntity !== this.el;
    });

    if (validHits.length > 0) {
      const groundDistance = validHits[0].distance;
      this.isGrounded = groundDistance <= 0.2;

      if (this.isGrounded) {
        // Get ground normal for slopes
        this.groundNormal.copy(validHits[0].face.normal);
      }
    } else {
      this.isGrounded = false;
    }
  },

  tick: function(time, deltaTime) {
    if (this.isDead) return;

    // Convert to seconds
    const deltaSeconds = deltaTime / 1000;

    // Reset acceleration
    this.acceleration.set(0, 0, 0);

    // Apply hover effect for flying jetbike (independent of ground)
    this.hoverPhase += deltaSeconds * this.data.hoverFrequency;
    const hoverOffset = Math.sin(this.hoverPhase) * this.data.hoverAmplitude;
    this.el.object3D.position.y += hoverOffset * deltaSeconds;

    // Check if near objects for collision purposes
    const raycaster = new THREE.Raycaster(
      this.el.object3D.position,
      new THREE.Vector3(0, -1, 0)
    );
    const intersections = raycaster.intersectObjects(
      document.querySelector('a-scene').object3D.children,
      true
    );


    this.updateMovement(deltaTime);
    this.updateParticles(deltaTime);

    // Check if player fell off the map
    if (this.el.object3D.position.y < -10) {
      this.onDamage({ detail: { damage: this.currentHealth } });
    }
  },

  remove: function() {
    // Remove event listeners
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
  },

  addControlHints: function() {
    const hintsElement = document.createElement('div');
    hintsElement.id = 'control-hints';
    hintsElement.innerHTML = `
      <h3>Jetbike Controls</h3>
      <ul>
        <li>W: Forward</li>
        <li>S: Backward</li>
        <li>A: Left</li>
        <li>D: Right</li>
        <li>Q: Up</li>
        <li>E: Down</li>
        <li>Shift: Boost</li>
      </ul>
    `;
    document.body.appendChild(hintsElement);
  }
});