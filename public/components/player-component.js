
AFRAME.registerComponent('player-component', {
  schema: {
    speed: { type: 'number', default: 5 },
    health: { type: 'number', default: 100 },
    turnSpeed: { type: 'number', default: 2 }
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
      ShiftLeft: false // Boost
    };

    // Reference to the jetbike model
    this.jetbike = this.el.querySelector('#jetbike');
    
    // Reference to the camera rig
    this.cameraRig = this.el.querySelector('#camera-rig');
    this.camera = this.el.querySelector('#camera');
    
    // Direction the player is facing
    this.yaw = 0;
    
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
  },

  attachEventListeners: function () {
    // Keyboard events
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
    
    // Mouse movement for camera
    this.el.sceneEl.addEventListener('mousemove', this.onMouseMove.bind(this));
    
    // Damage event
    this.el.addEventListener('damage', this.onDamage.bind(this));
  },
  
  onMouseMove: function (event) {
    // Update the jetbike rotation to follow the camera direction
    if (document.pointerLockElement) {
      const rotation = this.camera.getAttribute('rotation');
      this.jetbike.setAttribute('rotation', {
        x: 0,
        y: rotation.y,
        z: 0
      });
    }
  },

  createSounds: function () {
    // Jetbike engine sound
    const engineSound = document.createElement('a-sound');
    engineSound.setAttribute('src', 'url(https://cdn.glitch.global/a0f42b6b-5748-4de7-8b7f-f072c068f79e/engine-loop.mp3)');
    engineSound.setAttribute('loop', 'true');
    engineSound.setAttribute('volume', '0.5');
    this.el.appendChild(engineSound);
    
    // Damage sound
    const damageSound = document.createElement('a-sound');
    damageSound.setAttribute('src', 'url(https://cdn.glitch.global/a0f42b6b-5748-4de7-8b7f-f072c068f79e/damage.mp3)');
    damageSound.setAttribute('volume', '1.0');
    this.el.appendChild(damageSound);
    
    this.engineSound = engineSound;
    this.damageSound = damageSound;
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
    this.damageSound.components.sound.playSound();
    
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

  tick: function (time, timeDelta) {
    // Skip if game not started
    const gameManager = document.querySelector('[game-manager]');
    if (!gameManager || !gameManager.components['game-manager'].gameStarted) {
      return;
    }
    
    // Delta in seconds
    const delta = timeDelta / 1000;
    
    // Calculate movement direction based on camera orientation
    const rotation = this.el.querySelector('#camera').getAttribute('rotation');
    const rotationRad = {
      y: degToRad(rotation.y)
    };
    
    // Reset movement vector
    this.moveVector.set(0, 0, 0);
    
    // Forward/backward (Z-axis)
    if (this.keys.KeyW) {
      this.moveVector.z = -1;
    } else if (this.keys.KeyS) {
      this.moveVector.z = 1;
    }
    
    // Left/right (X-axis)
    if (this.keys.KeyA) {
      this.moveVector.x = -1;
    } else if (this.keys.KeyD) {
      this.moveVector.x = 1;
    }
    
    // Up/down (Y-axis) - Direct control
    if (this.keys.KeyQ) {
      this.moveVector.y = 1; // Up
    } else if (this.keys.KeyE) {
      this.moveVector.y = -1; // Down
    }
    
    // Normalize if moving in multiple directions
    if (this.moveVector.length() > 0) {
      this.moveVector.normalize();
    }
    
    // Apply camera rotation to X/Z movement (but not Y)
    const rotatedMoveX = this.moveVector.x * Math.cos(rotationRad.y) + this.moveVector.z * Math.sin(rotationRad.y);
    const rotatedMoveZ = this.moveVector.z * Math.cos(rotationRad.y) - this.moveVector.x * Math.sin(rotationRad.y);
    this.moveVector.x = rotatedMoveX;
    this.moveVector.z = rotatedMoveZ;
    
    // Apply speed and boost
    const speed = this.data.speed * (this.keys.ShiftLeft ? 1.5 : 1.0);
    this.moveVector.multiplyScalar(speed);
    
    // Update position
    const currentPosition = this.el.getAttribute('position');
    this.el.setAttribute('position', {
      x: currentPosition.x + this.moveVector.x * delta,
      y: currentPosition.y + this.moveVector.y * delta,
      z: currentPosition.z + this.moveVector.z * delta
    });
    
    // Keep player above ground
    if (currentPosition.y < 1) {
      this.el.setAttribute('position', {
        x: currentPosition.x,
        y: 1,
        z: currentPosition.z
      });
    }
    
    // Adjust engine sound volume based on movement
    const isMoving = this.moveVector.length() > 0;
    const volume = isMoving ? (this.keys.ShiftLeft ? 0.8 : 0.5) : 0.2;
    this.engineSound.setAttribute('volume', volume);
  }
});

// Helper function to convert degrees to radians
function degToRad(degrees) {
  return degrees * (Math.PI / 180);
}

AFRAME.registerComponent('player-component', {
    schema: {
        speed: { type: 'number', default: 5 },
        sprintMultiplier: { type: 'number', default: 1.5 },
        health: { type: 'number', default: 100 },
        verticalSpeed: { type: 'number', default: 4 },
        damping: { type: 'number', default: 0.95 }
    },
    init: function() {
        try {
            this.camera = this.el.querySelector('a-camera');
            this.velocity = new THREE.Vector3(0, 0, 0);
            this.direction = new THREE.Vector3();
            this.isSprinting = false;
            this.health = this.data.health;
            this.maxHealth = this.data.health;
            this.isDead = false;
            this.lastDamageTime = 0;
            this.collisionRadius = 0.8;
            this.oldPosition = new THREE.Vector3();
            this.newPosition = new THREE.Vector3();
            this.setupControls();
            this.updateHealthUI();
            if (this.camera) {
                this.camera.setAttribute('wasd-controls', 'enabled', false);
            }
            
            // Add event listener for model loaded to attach camera properly
            this.el.addEventListener('model-loaded', () => {
                this.attachCameraToModel();
            });
        } catch (error) {
            console.error('Error initializing player component:', error);
        }
    },
    
    attachCameraToModel: function() {
        try {
            // Get the model's object3D
            const model = this.el.object3D;
            
            // Find a camera node in the model if it exists
            let cameraNode = null;
            model.traverse((node) => {
                if (node.name && node.name.toLowerCase().includes('camera')) {
                    cameraNode = node;
                }
            });
            
            if (cameraNode) {
                console.log('Found camera node in model');
                // Reposition the camera to the model's camera node
                this.camera.object3D.position.copy(cameraNode.position);
            } else {
                console.log('No camera node found in model, using default position');
                // Keep the default camera position
            }
        } catch (error) {
            console.error('Error attaching camera to model:', error);
        }
    },
    updateHealthUI: function() {
        try {
            const healthBar = document.getElementById('health-bar');
            if (healthBar) {
                const healthPercent = (this.health / this.maxHealth) * 100;
                healthBar.style.width = `${healthPercent}%`;
                if (healthPercent <= 25) {
                    healthBar.style.backgroundColor = '#f00';
                } else if (healthPercent <= 50) {
                    healthBar.style.backgroundColor = '#ff0';
                } else {
                    healthBar.style.backgroundColor = '#0f0';
                }
            }
        } catch (error) {
            console.error('Error updating health UI:', error);
        }
    },
    setupControls: function() {
        try {
            this.keys = { KeyW: false, KeyA: false, KeyS: false, KeyD: false, KeyQ: false, KeyE: false, ShiftLeft: false };
            this.onKeyDown = this.onKeyDown.bind(this);
            this.onKeyUp = this.onKeyUp.bind(this);
            document.addEventListener('keydown', this.onKeyDown);
            document.addEventListener('keyup', this.onKeyUp);
        } catch (error) {
            console.error('Error setting up controls:', error);
        }
    },
    onKeyDown: function(event) {
        if (this.keys.hasOwnProperty(event.code)) {
            this.keys[event.code] = true;
            if (event.code === 'ShiftLeft') {
                this.isSprinting = true;
                this.footstepInterval = 0.3;
            }
        }
    },
    onKeyUp: function(event) {
        if (this.keys.hasOwnProperty(event.code)) {
            this.keys[event.code] = false;
            if (event.code === 'ShiftLeft') {
                this.isSprinting = false;
                this.footstepInterval = 0.5;
            }
        }
    },
    updateMovement: function(dt) {
        try {
            if (this.isDead) return;
            const { speed, sprintMultiplier, verticalSpeed, damping } = this.data;
            this.oldPosition.copy(this.el.object3D.position);
            
            // Apply damping to gradually slow down
            this.velocity.multiplyScalar(damping);
            
            // Get camera direction for forward/backward motion
            const cameraDirection = new THREE.Vector3();
            this.camera.object3D.getWorldDirection(cameraDirection);
            
            // Get right vector (perpendicular to camera direction) for strafing
            const rightVector = new THREE.Vector3();
            rightVector.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0)).normalize();
            
            // Calculate movement speed
            const currentSpeed = this.isSprinting ? speed * sprintMultiplier : speed;
            
            // Forward/backward movement (along camera direction)
            if (this.keys.KeyW) {
                this.velocity.add(cameraDirection.clone().multiplyScalar(currentSpeed));
            } else if (this.keys.KeyS) {
                this.velocity.add(cameraDirection.clone().multiplyScalar(-currentSpeed));
            }
            
            // Left/right movement (perpendicular to camera direction)
            if (this.keys.KeyA) {
                this.velocity.add(rightVector.clone().multiplyScalar(-currentSpeed));
            } else if (this.keys.KeyD) {
                this.velocity.add(rightVector.clone().multiplyScalar(currentSpeed));
            }
            
            // Up/down movement (vertical control)
            if (this.keys.KeyQ) {
                this.velocity.y += verticalSpeed;
            } else if (this.keys.KeyE) {
                this.velocity.y -= verticalSpeed;
            }
            
            // Apply velocity to position
            const pos = this.el.object3D.position;
            pos.x += this.velocity.x * dt;
            pos.y += this.velocity.y * dt;
            pos.z += this.velocity.z * dt;
            
            this.newPosition.copy(this.el.object3D.position);
            
            // Check for collisions and boundaries
            this.checkObstacleCollisions();
            this.checkBoundaries();
            
            // Add some slight tilt based on movement for visual effect
            if (Math.abs(this.velocity.x) > 0.1 || Math.abs(this.velocity.z) > 0.1) {
                const tiltStrength = 0.1;
                const lateralSpeed = new THREE.Vector2(this.velocity.x, this.velocity.z).length();
                
                // Calculate dot product to determine direction for roll
                const dotProduct = rightVector.dot(new THREE.Vector3(this.velocity.x, 0, this.velocity.z).normalize());
                
                // Apply roll based on lateral movement
                const targetRoll = -dotProduct * tiltStrength * lateralSpeed;
                
                // Apply pitch based on forward/backward acceleration
                const forwardDot = cameraDirection.dot(new THREE.Vector3(this.velocity.x, 0, this.velocity.z).normalize());
                const targetPitch = -forwardDot * tiltStrength * 0.5 * lateralSpeed;
                
                // Smoothly interpolate current rotation toward target
                this.el.object3D.rotation.z = THREE.MathUtils.lerp(this.el.object3D.rotation.z, targetRoll, 2 * dt);
                this.el.object3D.rotation.x = THREE.MathUtils.lerp(this.el.object3D.rotation.x, targetPitch, 2 * dt);
            } else {
                // Return to level when not moving
                this.el.object3D.rotation.z = THREE.MathUtils.lerp(this.el.object3D.rotation.z, 0, 2 * dt);
                this.el.object3D.rotation.x = THREE.MathUtils.lerp(this.el.object3D.rotation.x, 0, 2 * dt);
            }
        } catch (error) {
            console.error('Error updating movement:', error);
        }
    },
    isMoving: function() {
        return this.keys.KeyW || this.keys.KeyA || this.keys.KeyS || this.keys.KeyD || this.keys.KeyQ || this.keys.KeyE;
    },

    checkObstacleCollisions: function() {
        try {
            const playerPos = this.el.object3D.position;
            const obstacles = document.querySelectorAll('.obstacle');
            obstacles.forEach(obstacle => {
                if (obstacle.object3D) {
                    const obstaclePos = obstacle.object3D.position;
                    const obstacleWidth = obstacle.getAttribute('width') || 1;
                    const obstacleHeight = obstacle.getAttribute('height') || 1;
                    const obstacleDepth = obstacle.getAttribute('depth') || 1;
                    
                    // Calculate 3D distance vector
                    const dx = playerPos.x - obstaclePos.x;
                    const dy = playerPos.y - (obstaclePos.y + obstacleHeight/2); // Center of obstacle in Y
                    const dz = playerPos.z - obstaclePos.z;
                    
                    // Calculate 3D distance
                    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    
                    // Calculate obstacle's bounding sphere radius
                    const obstacleRadius = Math.sqrt(
                        (obstacleWidth/2) * (obstacleWidth/2) + 
                        (obstacleHeight/2) * (obstacleHeight/2) + 
                        (obstacleDepth/2) * (obstacleDepth/2)
                    );
                    
                    const minDistance = this.collisionRadius + obstacleRadius;
                    
                    if (distance < minDistance) {
                        // Calculate 3D push direction
                        const pushDirection = new THREE.Vector3(dx, dy, dz).normalize();
                        const pushAmount = minDistance - distance;
                        
                        // Apply push
                        playerPos.x += pushDirection.x * pushAmount;
                        playerPos.y += pushDirection.y * pushAmount;
                        playerPos.z += pushDirection.z * pushAmount;
                    }
                }
            });
        } catch (error) {
            console.error('Error checking obstacle collisions:', error);
        }
    },
    checkBoundaries: function() {
        try {
            const boundaries = { minX: -24, maxX: 24, minZ: -24, maxZ: 24, minY: 1, maxY: 20 };
            const pos = this.el.object3D.position;
            if (pos.x < boundaries.minX) pos.x = boundaries.minX;
            if (pos.x > boundaries.maxX) pos.x = boundaries.maxX;
            if (pos.z < boundaries.minZ) pos.z = boundaries.minZ;
            if (pos.z > boundaries.maxZ) pos.z = boundaries.maxZ;
            if (pos.y < boundaries.minY) pos.y = boundaries.minY;
            if (pos.y > boundaries.maxY) pos.y = boundaries.maxY;
        } catch (error) {
            console.error('Error checking boundaries:', error);
        }
    },
    takeDamage: function(amount) {
        try {
            if (this.isDead) return;
            const now = performance.now();
            this.health -= amount;
            this.createDamageEffect();
            if (this.health <= 0) {
                this.health = 0;
                this.die();
            }
            this.updateHealthUI();
            this.lastDamageTime = now;
        } catch (error) {
            console.error('Error taking damage:', error);
        }
    },
    createDamageEffect: function() {
        try {
            const damageOverlay = document.getElementById('damage-overlay');
            if (damageOverlay) {
                damageOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
                setTimeout(() => {
                    damageOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0)';
                }, 100);
            }
        } catch (error) {
            console.error('Error creating damage effect:', error);
        }
    },
    die: function() {
        try {
            if (this.isDead) return;
            this.isDead = true;
            console.log('Player died');
            document.removeEventListener('keydown', this.onKeyDown);
            document.removeEventListener('keyup', this.onKeyUp);
            if (this.camera) {
                this.camera.setAttribute('look-controls', 'enabled', false);
            }
            this.el.setAttribute('animation', { property: 'position.y', to: '0.5', dur: 1000, easing: 'easeInQuad' });
            if (this.camera) {
                this.camera.setAttribute('animation', { property: 'rotation.z', to: '90', dur: 1000, easing: 'easeInQuad' });
            }
            this.el.emit('player-died', {});
        } catch (error) {
            console.error('Error handling player death:', error);
        }
    },
    tick: function(time, delta) {
        try {
            const dt = delta / 1000;
            if (document.pointerLockElement) {
                this.updateMovement(dt);
                const now = performance.now();
                if (this.health < this.maxHealth && now - this.lastDamageTime > 5000) {
                    this.health += 5 * dt;
                    if (this.health > this.maxHealth) {
                        this.health = this.maxHealth;
                    }
                    this.updateHealthUI();
                }
            }
        } catch (error) {
            console.error('Error in player tick:', error);
        }
    },
    remove: function() {
        try {
            document.removeEventListener('keydown', this.onKeyDown);
            document.removeEventListener('keyup', this.onKeyUp);
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }
        } catch (error) {
            console.error('Error removing player component:', error);
        }
    }
});