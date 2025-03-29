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
    debug: { type: 'boolean', default: true }
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

    // Setup debug information
    this.setupDebugInfo();

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
    this.keys[event.key.toLowerCase()] = true;

    // Handle reload key (R)
    if (event.key.toLowerCase() === 'r') {
      const weaponComponent = this.el.components['weapon-component'];
      if (weaponComponent && weaponComponent.reload) {
        weaponComponent.reload();
      }
    }

    // Handle boost key (Shift)
    if (event.key === 'Shift') {
      this.isBoosting = true;
    }
  },

  onKeyUp: function(event) {
    this.keys[event.key.toLowerCase()] = false;

    // Handle boost key (Shift)
    if (event.key === 'Shift') {
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

  updateMovement: function(delta) {
    const deltaSeconds = delta / 1000;

    // Get move inputs
    this.moveDirection.set(0, 0, 0);

    // Forward/backward
    if (this.keys['w']) this.moveDirection.z -= 1;
    if (this.keys['s']) this.moveDirection.z += 1;

    // Left/right
    if (this.keys['a']) this.moveDirection.x -= 1;
    if (this.keys['d']) this.moveDirection.x += 1;

    // Up/down (Q/E for hover bikes)
    if (this.keys['q']) this.moveDirection.y += 1;
    if (this.keys['e']) this.moveDirection.y -= 1;

    // Check if moving at all
    this.isMoving = (this.moveDirection.x !== 0 || this.moveDirection.z !== 0 || this.moveDirection.y !== 0);

    // Normalize movement vector
    if (this.moveDirection.length() > 0) {
      this.moveDirection.normalize();
    }

    // Apply camera direction to movement (relative to camera)
    const cameraEl = document.querySelector('[camera]');
    if (cameraEl) {
      const cameraObject = cameraEl.object3D;
      // Use negative Z for proper forward direction
      const cameraDirection = new THREE.Vector3(0, 0, -1);
      cameraDirection.applyQuaternion(cameraObject.quaternion);
      cameraDirection.y = 0; // Keep movement on XZ plane
      cameraDirection.normalize();

      // Create a rotation matrix based on camera orientation (y-axis only)
      const rotationMatrix = new THREE.Matrix4();
      const eY = new THREE.Euler(0, Math.atan2(cameraDirection.x, cameraDirection.z), 0);
      rotationMatrix.makeRotationFromEuler(eY);

      // Apply rotation to movement direction
      this.moveDirection.applyMatrix4(rotationMatrix);
    }

    // Calculate acceleration
    let accelerationValue = this.data.acceleration;
    let maxVelocity = this.data.maxVelocity;

    if (this.isBoosting) {
      accelerationValue *= 2;
      maxVelocity *= 1.5;
    }

    // Apply acceleration in movement direction
    if (this.isMoving) {
      this.acceleration.copy(this.moveDirection).multiplyScalar(accelerationValue);
    } else {
      // Apply deceleration when not moving
      const deceleration = this.data.deceleration;
      this.acceleration.set(
        -this.velocity.x * deceleration,
        -this.velocity.y * deceleration,
        -this.velocity.z * deceleration
      );
    }

    // Apply gravity if enabled
    if (this.data.gravityEnabled && !this.isGrounded) {
      this.acceleration.y -= this.data.gravity;
    }

    // Update velocity with acceleration
    this.velocity.add(this.acceleration.clone().multiplyScalar(deltaSeconds));

    // Clamp velocity to max speed
    if (this.velocity.length() > maxVelocity) {
      this.velocity.normalize().multiplyScalar(maxVelocity);
    }

    // Apply hover effect for jetbike
    this.applyHoverEffect(deltaSeconds);

    // Move the player
    const movement = this.velocity.clone().multiplyScalar(deltaSeconds);
    this.el.object3D.position.add(movement);

    // Face movement direction if moving
    if (this.isMoving && (this.moveDirection.x !== 0 || this.moveDirection.z !== 0)) {
      // Gradually rotate to match movement direction
      const targetRotation = Math.atan2(this.moveDirection.x, this.moveDirection.z);
      const currentRotation = this.el.object3D.rotation.y;

      // Smoothly interpolate rotation
      const rotationStep = this.data.rotationSpeed * deltaSeconds;
      let newRotation = currentRotation;

      // Calculate the shortest rotation path
      const diff = targetRotation - currentRotation;
      const shortestDiff = Math.atan2(Math.sin(diff), Math.cos(diff));

      newRotation += Math.sign(shortestDiff) * Math.min(Math.abs(shortestDiff), rotationStep);

      // Apply rotation
      this.el.object3D.rotation.y = newRotation;
    }
  },

  applyHoverEffect: function(deltaSeconds) {
    // Simple hover effect for jetbike
    this.hoverPhase += this.data.hoverFrequency * deltaSeconds;

    // Sinusoidal hover motion
    const hoverOffset = Math.sin(this.hoverPhase) * this.data.hoverAmplitude;

    // Apply hover to the Y position with minimum height
    this.el.object3D.position.y = Math.max(this.data.hoverHeight + hoverOffset, 2.5); // Increased minimum height

    // Slight roll/tilt based on movement
    if (this.moveDirection.x !== 0) {
      const targetTilt = this.moveDirection.x * 0.2; // Max tilt in radians
      const currentTilt = this.el.object3D.rotation.z;

      // Smooth tilt transition
      this.el.object3D.rotation.z = currentTilt + (targetTilt - currentTilt) * 0.1;
    } else {
      // Return to level when not moving sideways
      this.el.object3D.rotation.z *= 0.9;
    }
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

  setupDebugInfo: function() {
    // Create debug text for player position
    if (this.data.debug) {
      this.debugText = document.createElement('a-text');
      this.debugText.setAttribute('value', 'Player Position');
      this.debugText.setAttribute('align', 'center');
      this.debugText.setAttribute('position', '0 2 0');
      this.debugText.setAttribute('scale', '0.5 0.5 0.5');
      this.debugText.setAttribute('visible', 'false');
      this.el.appendChild(this.debugText);

      // Debug key is shared with camera component
      window.addEventListener('keydown', (e) => {
        if (e.key === 'd' || e.key === 'D') {
          const isVisible = this.debugText.getAttribute('visible');
          this.debugText.setAttribute('visible', !isVisible);

          // Log current position when debug is toggled
          const pos = this.el.object3D.position;
          const rot = this.el.object3D.rotation;
          console.log('Player position:', pos);
          console.log('Player rotation:', {
            x: THREE.MathUtils.radToDeg(rot.x),
            y: THREE.MathUtils.radToDeg(rot.y),
            z: THREE.MathUtils.radToDeg(rot.z)
          });
        }
      });
    }
  },

  tick: function(time, delta) {
    if (this.isDead) return;

        // Handle movement with smooth acceleration and deceleration
        const rotation = this.el.getAttribute("rotation");
        let position = this.el.getAttribute("position");

        // Initialize velocity if not present
        if (!this.velocity) {
            this.velocity = { x: 0, y: 0, z: 0 };
            this.acceleration = 0.01;
            this.deceleration = 0.008;
            this.maxSpeed = this.data.speed / 1000;
            this.hoverHeight = 2.0;
            this.hoverVariance = 0.2;
            this.hoverFrequency = 0.001;
        }

        // Calculate move direction based on key inputs
        let moveZ = 0;
        let moveX = 0;
        let moveY = 0;

        if (this.keys["w"]) moveZ = -1;
        if (this.keys["s"]) moveZ = 1;
        if (this.keys["a"]) rotation.y += 2;
        if (this.keys["d"]) rotation.y -= 2;
        if (this.keys["q"]) moveY = 1;
        if (this.keys["e"]) moveY = -1;

        // Convert direction to world space
        const radians = (rotation.y * Math.PI) / 180;
        const worldMoveX = -(moveZ * Math.sin(radians));
        const worldMoveZ = -(moveZ * Math.cos(radians));

        // Apply acceleration or deceleration
        if (moveZ !== 0) {
            this.velocity.x += worldMoveX * this.acceleration * delta;
            this.velocity.z += worldMoveZ * this.acceleration * delta;
        } else {
            // Apply deceleration when not accelerating
            if (Math.abs(this.velocity.x) > 0.0001) {
                this.velocity.x *= (1 - this.deceleration * delta);
            } else {
                this.velocity.x = 0;
            }

            if (Math.abs(this.velocity.z) > 0.0001) {
                this.velocity.z *= (1 - this.deceleration * delta);
            } else {
                this.velocity.z = 0;
            }
        }

        // Apply vertical movement
        if (moveY !== 0) {
            this.velocity.y += moveY * this.acceleration * delta;
        } else {
            // Apply vertical deceleration
            if (Math.abs(this.velocity.y) > 0.0001) {
                this.velocity.y *= (1 - this.deceleration * delta);
            } else {
                this.velocity.y = 0;
            }
        }

        // Apply hover effect - gentle bobbing up and down
        const hoverOffset = Math.sin(time * this.hoverFrequency) * this.hoverVariance;

        // Cap speed
        const currentSpeed = Math.sqrt(
            this.velocity.x * this.velocity.x + 
            this.velocity.z * this.velocity.z
        );

        if (currentSpeed > this.maxSpeed) {
            const scaleFactor = this.maxSpeed / currentSpeed;
            this.velocity.x *= scaleFactor;
            this.velocity.z *= scaleFactor;
        }

        // Cap vertical speed
        const verticalSpeed = Math.abs(this.velocity.y);
        if (verticalSpeed > this.maxSpeed * 0.7) {
            this.velocity.y = (this.velocity.y / verticalSpeed) * this.maxSpeed * 0.7;
        }

        // Apply velocity to position
        position.x += this.velocity.x * delta;
        position.y += this.velocity.y * delta + hoverOffset * 0.01;
        position.z += this.velocity.z * delta;

        // Ensure minimum hover height
        if (position.y < this.hoverHeight) {
            position.y = this.hoverHeight + hoverOffset * 0.05;
        }

        // Bank the jetbike slightly during turns
        const bankAmount = rotation.y - (this.prevRotationY || rotation.y);
        if (Math.abs(bankAmount) > 0.1) {
            // Apply banking (roll) effect, max 15 degrees
            const targetBank = Math.max(Math.min(bankAmount * 2, 15), -15);
            if (!this.currentBank) this.currentBank = 0;
            this.currentBank = this.currentBank * 0.9 + targetBank * 0.1;
            this.el.object3D.rotation.z = THREE.MathUtils.degToRad(-this.currentBank);
        } else if (this.currentBank) {
            // Return to upright
            this.currentBank *= 0.9;
            this.el.object3D.rotation.z = THREE.MathUtils.degToRad(-this.currentBank);
        }

        this.prevRotationY = rotation.y;

        // Apply movement
        this.el.setAttribute("position", position);
        this.el.setAttribute("rotation", rotation);

        // Update UI
        this.updateAmmoDisplay();

    // Update particle effects
    this.updateParticles(delta);

    // Update debug text
    if (this.debugText && this.debugText.getAttribute('visible')) {
      const pos = this.el.object3D.position;
      const rot = this.el.object3D.rotation;
      const velocity = this.velocity;

      const posText = `Pos: ${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}`;
      const rotText = `Rot: ${THREE.MathUtils.radToDeg(rot.y).toFixed(0)}°`;
      const velText = `Vel: ${velocity.length().toFixed(2)} m/s`;

      this.debugText.setAttribute('value', `${posText}\n${rotText}\n${velText}`);
      this.debugText.setAttribute('position', `0 ${2 + (this.data.hoverHeight / 2)} 0`);
    }

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
  }
});