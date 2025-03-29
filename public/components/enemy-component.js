// Prevent duplicate registration
if (!AFRAME.components['enemy-component']) {
  AFRAME.registerComponent('enemy-component', {
    schema: {
      health: { type: 'number', default: 100 },
      speed: { type: 'number', default: 2 },
      attackPower: { type: 'number', default: 10 },
      attackRate: { type: 'number', default: 1 },
      detectionRange: { type: 'number', default: 20 },
      attackRange: { type: 'number', default: 2 },
      weaponDamage: { type: 'number', default: 15 },
      weaponCooldown: { type: 'number', default: 2 },
      weaponAccuracy: { type: 'number', default: 0.7 },
      weaponRange: { type: 'number', default: 50 },
      hitboxScale: { type: 'number', default: 1.0 } // Added hitbox scale
    },
    init: function() {
    try {
      // Set up enemy properties
      this.health = this.data.health;
      this.isAlive = true;
      this.playerEntity = document.getElementById('player');

      // Create a simple mesh for the enemy if none exists
      if (!this.el.getObject3D('mesh')) {
        // Create a simple mesh for visualization
        const geometry = new THREE.SphereGeometry(0.5, 16, 16);
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const mesh = new THREE.Mesh(geometry, material);
        this.el.setObject3D('mesh', mesh);
      }

      // Create hitbox for the enemy (simplified)
      this.hitboxSize = new THREE.Vector3(1, 1, 1);
      this.hitboxCenter = new THREE.Vector3(0, 0, 0);
      this.hitboxHelper = new THREE.Box3();
      this.updateHitbox();

      // Set up AI navigation (after mesh is created)
      this.setupYukaAI();

      // Get reference to the game manager
      const gameManager = document.querySelector('[game-manager]');
      if (gameManager && gameManager.components) {
        // Call registerEnemy directly on the component instance
        const gameManagerComponent = gameManager.components['game-manager'];
        if (gameManagerComponent && typeof gameManagerComponent.registerEnemy === 'function') {
          gameManagerComponent.registerEnemy(this.el);
        } else {
          console.error('Game manager component or registerEnemy function not found');
        }
      } else {
        console.error('Error initializing enemy component: Game manager not found or not initialized');
      }
    } catch (error) {
      console.error('Error initializing enemy component:', error);
    }
  },
    getDistanceTo: function(otherEnemy) {
      const myPos = this.el.object3D.position;
      const otherPos = otherEnemy.object3D.position;
      return new THREE.Vector3()
        .subVectors(myPos, otherPos)
        .length();
    },
    updateCollisionAvoidance: function() {
      try {
        const enemies = document.querySelectorAll('[enemy-component]');
        this.nearbyEnemies = [];

        enemies.forEach(enemy => {
          if (enemy !== this.el) {
            const distance = this.getDistanceTo(enemy);
            if (distance < this.minSeparationDistance) {
              this.nearbyEnemies.push({ enemy, distance });
            }
          }
        });

        this.nearbyEnemies.forEach(({ enemy, distance }) => {
          const enemyPos = enemy.object3D.position;
          const myPos = this.el.object3D.position;

          const pushDirection = new THREE.Vector3()
            .subVectors(myPos, enemyPos)
            .normalize();

          const pushMagnitude = (this.minSeparationDistance - distance) * this.separationForce;

          // Apply push in all three dimensions (including Y axis for height)
          this.vehicle.position.x += pushDirection.x * pushMagnitude * 0.1;
          this.vehicle.position.y += pushDirection.y * pushMagnitude * 0.1;
          this.vehicle.position.z += pushDirection.z * pushMagnitude * 0.1;
        });
      } catch (error) {
        console.error('Error in collision avoidance:', error);
      }
    },
    enemyShoot: function() {
      try {
        const now = performance.now();
        const timeSinceLastShot = now - this.lastEnemyShot;

        if (timeSinceLastShot < this.data.weaponCooldown * 1000) {
          return false;
        }

        const playerPos = this.playerEntity.object3D.position;
        const enemyPos = this.el.object3D.position;
        // Calculate full 3D distance including height
        const distance = new THREE.Vector3()
          .subVectors(playerPos, enemyPos)
          .length();

        if (distance <= this.data.weaponRange) {
          // Create direction vector in 3D space from enemy to player
          const direction = new THREE.Vector3()
            .subVectors(playerPos, enemyPos)
            .normalize();

          // Add some randomness based on accuracy
          const accuracySpread = 1.0 - this.data.weaponAccuracy;
          direction.x += (Math.random() - 0.5) * accuracySpread * 0.2;
          direction.y += (Math.random() - 0.5) * accuracySpread * 0.2;
          direction.z += (Math.random() - 0.5) * accuracySpread * 0.2;
          direction.normalize();

          this.weaponRaycaster.set(enemyPos, direction);
          this.weaponRaycaster.far = this.data.weaponRange;

          const intersects = this.weaponRaycaster.intersectObject(this.playerEntity.object3D, true);

          if (intersects.length > 0) {
            this.lastEnemyShot = now;
            this.createEnemyShootEffect(enemyPos, direction);
            // Sound disabled

            if (this.playerEntity.components['player-component']) {
              this.playerEntity.components['player-component'].takeDamage(this.data.weaponDamage);
            }

            return true;
          }
        }
        return false;
      } catch (error) {
        console.error('Error in enemy shooting:', error);
        return false;
      }
    },
    createEnemyShootEffect: function(position, direction) {
      try {
        const muzzleFlash = document.createElement('a-entity');
        muzzleFlash.setAttribute('position', position);
        muzzleFlash.setAttribute('particle-system', {
          preset: 'dust',
          particleCount: 10,
          color: '#f00,#900',
          size: 0.1,
          duration: 0.1,
          direction: 'normal',
          velocity: 0.5
        });
        document.querySelector('a-scene').appendChild(muzzleFlash);

        const scene = document.querySelector('a-scene').object3D;
        const material = new THREE.LineBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.5 });
        const endPoint = new THREE.Vector3()
          .copy(position)
          .add(direction.multiplyScalar(this.data.weaponRange));
        const geometry = new THREE.BufferGeometry().setFromPoints([position, endPoint]);
        const line = new THREE.Line(geometry, material);
        scene.add(line);

        setTimeout(() => {
          if (muzzleFlash.parentNode) {
            muzzleFlash.parentNode.removeChild(muzzleFlash);
          }
          scene.remove(line);
          line.geometry.dispose();
          line.material.dispose();
        }, 100);

      } catch (error) {
        console.error('Error creating enemy shoot effect:', error);
      }
    },
    updateAI: function(dt) {
      try {
        if (this.isDead) return;
        if (!this.playerEntity || !this.playerEntity.object3D) return;

        const playerPos = this.playerEntity.object3D.position;
        const enemyPos = this.el.object3D.position;
        // Use full 3D distance calculation, including height
        const distance = new THREE.Vector3(playerPos.x - enemyPos.x, playerPos.y - enemyPos.y, playerPos.z - enemyPos.z).length();

        this.updateCollisionAvoidance();

        if (distance <= this.data.detectionRange) {
          if (distance <= this.data.attackRange) {
            if (this.currentState !== 'attack') {
              this.setState('attack');
            }

            this.enemyShoot();

            this.attackPlayer();

            this.seekBehavior.active = false;
            this.separationBehavior.active = false;
          } else {
            if (this.currentState !== 'chase') {
              this.setState('chase');
            }
            // Set the target in 3D space with Y coordinate
            this.seekBehavior.target.copy(new YUKA.Vector3(playerPos.x, playerPos.y, playerPos.z));
            this.seekBehavior.active = true;
            this.separationBehavior.active = true;
          }
        } else {
          if (this.currentState !== 'idle') {
            this.setState('idle');
          }
          this.seekBehavior.active = false;
          this.separationBehavior.active = false;
        }

        // Update all three coordinates of the enemy position safely
        if (this.vehicle && this.vehicle.position) {
          this.el.object3D.position.x = this.vehicle.position.x;
          this.el.object3D.position.y = this.vehicle.position.y;
          this.el.object3D.position.z = this.vehicle.position.z;
        }

        if ((this.currentState === 'chase' || this.currentState === 'attack') && distance > 0.1) {
          // Look at player in full 3D space
          const lookAt = new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z);
          this.el.object3D.lookAt(lookAt);
        }
      } catch (error) {
        console.error('Error updating enhanced AI:', error);
      }
    },
    createEnemyModel: function() {
      try {
        const body = document.createElement('a-box');
        body.setAttribute('color', 'red');
        body.setAttribute('width', '0.8');
        body.setAttribute('height', '1.6');
        body.setAttribute('depth', '0.8');
        body.setAttribute('position', '0 0.8 0');
        body.setAttribute('class', 'enemy-body');
        this.el.appendChild(body);

        const head = document.createElement('a-sphere');
        head.setAttribute('color', 'darkred');
        head.setAttribute('radius', '0.3');
        head.setAttribute('position', '0 1.8 0');
        head.setAttribute('class', 'enemy-head');
        this.el.appendChild(head);

        const leftEye = document.createElement('a-sphere');
        leftEye.setAttribute('color', 'black');
        leftEye.setAttribute('radius', '0.05');
        leftEye.setAttribute('position', '-0.15 1.85 0.25');
        this.el.appendChild(leftEye);

        const rightEye = document.createElement('a-sphere');
        rightEye.setAttribute('color', 'black');
        rightEye.setAttribute('radius', '0.05');
        rightEye.setAttribute('position', '0.15 1.85 0.25');
        this.el.appendChild(rightEye);

        const hitboxHelper = document.createElement('a-box');
        hitboxHelper.setAttribute('width', this.hitboxSize.width);
        hitboxHelper.setAttribute('height', this.hitboxSize.height);
        hitboxHelper.setAttribute('depth', this.hitboxSize.depth);
        hitboxHelper.setAttribute('position', `0 ${this.hitboxSize.height/2} 0`);
        hitboxHelper.setAttribute('opacity', '0.0');
        hitboxHelper.setAttribute('color', '#00FF00');
        hitboxHelper.setAttribute('class', 'hitbox-helper');
        this.el.appendChild(hitboxHelper);
      } catch (error) {
        console.error('Error creating enemy model:', error);
      }
    },
    setupYukaAI: function() {
    try {
      // Get a reference to the game manager's entity manager
      const gameManager = document.querySelector('[game-manager]');

      if (gameManager && gameManager.components && gameManager.components['game-manager']) {
        const entityManager = gameManager.components['game-manager'].entityManager;

        if (entityManager) {
          // Create a vehicle for the enemy
          this.vehicle = new YUKA.Vehicle();
          this.vehicle.position.set(
            this.el.object3D.position.x,
            this.el.object3D.position.y,
            this.el.object3D.position.z
          );
          this.vehicle.maxSpeed = this.data.speed;
          this.vehicle.maxForce = 10;

          // Add behaviors for the entity
          this.seekBehavior = new YUKA.SeekBehavior();
          this.separationBehavior = new YUKA.SeparationBehavior();
          this.separationBehavior.weight = 2;

          this.vehicle.steering.add(this.seekBehavior);
          this.vehicle.steering.add(this.separationBehavior);

          // Add to entity manager
          entityManager.add(this.vehicle);

          this.currentState = 'idle';
        } else {
          console.error('Entity manager not found in game manager');
        }
      } else {
        console.error('Game manager component not properly initialized');
      }
    } catch (error) {
      console.error('Error setting up Yuka AI:', error);
    }
  },
    setState: function(state) {
      try {
        if (this.currentState === state) return;
        this.currentState = state;
        if (state === 'idle') {
          this.el.querySelector('a-box').setAttribute('color', 'red');
        } else if (state === 'chase') {
          this.el.querySelector('a-box').setAttribute('color', 'orange');
        } else if (state === 'attack') {
          this.el.querySelector('a-box').setAttribute('color', 'darkred');
        }
      } catch (error) {
        console.error('Error setting state:', error);
      }
    },
    attackPlayer: function() {
      try {
        const now = performance.now();
        if (now - this.lastAttack < this.data.attackRate * 1000) {
          return;
        }
        this.lastAttack = now;
        if (this.playerEntity && this.playerEntity.components['player-component']) {
          this.playerEntity.components['player-component'].takeDamage(this.data.attackPower);
        }
        this.flashColor('darkred', 'red', 200);
      } catch (error) {
        console.error('Error attacking player:', error);
      }
    },
    createHealthBar: function() {
      try {
        const healthBarContainer = document.createElement('a-entity');
        healthBarContainer.setAttribute('position', '0 2.3 0');
        healthBarContainer.setAttribute('id', 'health-bar-container');

        const healthBarBg = document.createElement('a-plane');
        healthBarBg.setAttribute('width', '1');
        healthBarBg.setAttribute('height', '0.1');
        healthBarBg.setAttribute('color', '#333');
        healthBarBg.setAttribute('opacity', '0.7');
        healthBarContainer.appendChild(healthBarBg);

        const healthBar = document.createElement('a-plane');
        healthBar.setAttribute('width', '0.98');
        healthBar.setAttribute('height', '0.08');
        healthBar.setAttribute('color', '#00FF00');
        healthBar.setAttribute('position', '0 0 0.001');
        healthBar.setAttribute('id', 'health-bar');
        healthBarContainer.appendChild(healthBar);

        healthBarContainer.setAttribute('look-at', '[camera]');

        this.el.appendChild(healthBarContainer);
      } catch (error) {
        console.error('Error creating health bar:', error);
      }
    },
    updateHealthBar: function() {
      try {
        const healthBar = this.el.querySelector('#health-bar');
        if (!healthBar) return;

        const healthPercent = Math.max(0, this.health / this.maxHealth);
        const width = 0.98 * healthPercent;

        healthBar.setAttribute('width', width);
        healthBar.setAttribute('position', `${(width - 0.98) / 2} 0 0.001`);

        if (healthPercent <= 0.25) {
          healthBar.setAttribute('color', '#FF0000');
        } else if (healthPercent <= 0.5) {
          healthBar.setAttribute('color', '#FFFF00');
        } else {
          healthBar.setAttribute('color', '#00FF00');
        }
      } catch (error) {
        console.error('Error updating health bar:', error);
      }
    },
    takeDamage: function(amount, hitPosition) {
      try {
        if (this.isDead) return;

        const oldHealth = this.health;
        this.health = Math.max(0, this.health - amount);
        this.lastDamageTime = performance.now();

        console.log(`ENEMY HIT! Damage: ${amount}, Health: ${oldHealth} -> ${this.health}, Max: ${this.maxHealth}`);

        if (hitPosition) {
          this.createHitEffect(hitPosition);
          this.showDamageNumber(amount, hitPosition);
        }

        this.updateHealthBar();

        const flashIntensity = amount > 20 ? 200 : 100;
        this.flashColor('white', this.currentState === 'idle' ? 'red' : 'orange', flashIntensity);

        if (this.playerEntity && this.playerEntity.object3D && !this.isDead) {
          const playerPos = this.playerEntity.object3D.position;
          const enemyPos = this.el.object3D.position;
          const direction = new THREE.Vector3()
            .subVectors(enemyPos, playerPos)
            .normalize();

          const pushForce = 0.3 * (amount / 25);
          this.vehicle.position.x += direction.x * pushForce;
          this.vehicle.position.z += direction.z * pushForce;
        }

        if (this.health <= 0) {
          console.log('ENEMY KILLED! Health reached zero.');
          this.die();
          return;
        } else {
          const healthPercent = Math.floor((this.health / this.maxHealth) * 100);
          console.log(`Enemy at ${healthPercent}% health (${this.health}/${this.maxHealth})`);

          this.setState('chase');
          if (this.playerEntity && this.playerEntity.object3D) {
            const playerPos = this.playerEntity.object3D.position;
            this.seekBehavior.target.copy(new YUKA.Vector3(playerPos.x, 0, playerPos.z));
            this.seekBehavior.active = true;
            this.separationBehavior.active = true;
          }
        }
      } catch (error) {
        console.error('Error taking damage:', error);
      }
    },
    showDamageNumber: function(amount, position) {
      try {
        const damageText = document.createElement('a-text');
        damageText.setAttribute('value', amount.toString());
        damageText.setAttribute('color', '#FF0000');
        damageText.setAttribute('position', position);
        damageText.setAttribute('align', 'center');
        damageText.setAttribute('scale', '0.5 0.5 0.5');
        damageText.setAttribute('look-at', '[camera]');

        damageText.setAttribute('animation__position', {
          property: 'position.y',
          to: position.y + 1,
          dur: 1000,
          easing: 'easeOutQuad'
        });

        damageText.setAttribute('animation__opacity', {
          property: 'opacity',
          from: 1,
          to: 0,
          dur: 1000,
          easing: 'easeInQuad'
        });

        document.querySelector('a-scene').appendChild(damageText);

        setTimeout(() => {
          if (damageText.parentNode) {
            damageText.parentNode.removeChild(damageText);
          }
        }, 1000);
      } catch (error) {
        console.error('Error showing damage number:', error);
      }
    },
    createHitEffect: function(position) {
      try {
        const hitEffect = document.createElement('a-entity');
        hitEffect.setAttribute('position', position);
        hitEffect.setAttribute('particle-system', {
          preset: 'dust',
          particleCount: 30,
          color: '#900,#f00',
          size: 0.15,
          duration: 0.5,
          direction: 'normal',
          velocity: 1.5,
          spread: 1.5
        });
        document.querySelector('a-scene').appendChild(hitEffect);

        setTimeout(() => {
          if (hitEffect.parentNode) {
            hitEffect.parentNode.removeChild(hitEffect);
          }
        }, 500);
      } catch (error) {
        console.error('Error creating hit effect:', error);
      }
    },
    flashColor: function(flashColor, returnColor, duration) {
      try {
        const body = this.el.querySelector('a-box');
        if (!body) return;
        const originalColor = body.getAttribute('color');
        body.setAttribute('color', flashColor);
        setTimeout(() => {
          if (!this.isDead && body.parentNode) {
            body.setAttribute('color', returnColor || originalColor);
          }
        }, duration);
      } catch (error) {
        console.error('Error flashing color:', error);
      }
    },
    die: function() {
      try {
        if (this.isDead) return;
        this.isDead = true;
        console.log('Enemy killed!');

        const healthBar = this.el.querySelector('#health-bar-container');
        if (healthBar) healthBar.setAttribute('visible', false);

        const bodyEl = this.el.querySelector('.enemy-body');
        const headEl = this.el.querySelector('.enemy-head');
        const hitboxHelper = this.el.querySelector('.hitbox-helper');

        if (bodyEl) bodyEl.setAttribute('color', 'black');
        if (headEl) headEl.setAttribute('color', 'black');
        if (hitboxHelper) hitboxHelper.setAttribute('visible', false);

        if (this.seekBehavior) this.seekBehavior.active = false;
        if (this.separationBehavior) this.separationBehavior.active = false;

        const gameManager = document.querySelector('[game-manager]');
        if (gameManager && gameManager.components['game-manager']) {
          gameManager.components['game-manager'].entityManager.remove(this.vehicle);
          gameManager.components['game-manager'].enemyKilled(this);
        }

        const position = this.el.object3D.position;
        const deathEffect = document.createElement('a-entity');
        deathEffect.setAttribute('position', position);
        deathEffect.setAttribute('particle-system', {
          preset: 'dust',
          particleCount: 50,
          color: '#900,#f00,#000',
          size: 0.2,
          duration: 1.0,
          velocity: 2,
          spread: 2
        });
        document.querySelector('a-scene').appendChild(deathEffect);

        this.el.setAttribute('animation__fall', { property: 'rotation.z', to: 90, dur: 1000, easing: 'easeOutQuad' });
        setTimeout(() => {
          this.el.setAttribute('animation__fade', { property: 'scale', to: '0 0 0', dur: 1000, easing: 'easeInQuad' });
          setTimeout(() => {
            if (this.el.parentNode) {
              this.el.parentNode.removeChild(this.el);
            }
          }, 1000);
        }, 1500);
      } catch (error) {
        console.error('Error handling enemy death:', error);
      }
    },
    tick: function(time, deltaTime) {
      try {
        // Skip processing if disabled/dead
        if (!this.isActive || this.isDead) return;

        // Find player if not already set
        if (!this.playerEntity) {
          this.playerEntity = document.getElementById('player');
          if (!this.playerEntity) {
            // Player not found, retry next tick
            return;
          }
        }

        // Verify player entity exists and is valid
        if (!this.playerEntity.object3D) {
          console.warn("Player entity has no object3D, skipping enemy tick");
          return;
        }

        // Update vehicle target data every tick to prevent stale references
        if (this.vehicle && this.vehicle.userData) {
          this.vehicle.userData.target = this.playerEntity;
          this.vehicle.userData.targetPosition = new THREE.Vector3();
          this.playerEntity.object3D.getWorldPosition(this.vehicle.userData.targetPosition);
        }

        // Simple AI if YUKA isn't working - move toward player
        if (!this.entityManager || !this.vehicle) {
          // Get player position
          const playerPos = this.playerEntity.object3D.position;
          const enemyPos = this.el.object3D.position;

          // Calculate direction to player
          const direction = new THREE.Vector3()
            .subVectors(playerPos, enemyPos)
            .normalize();

          // Calculate distance to player
          const distance = enemyPos.distanceTo(playerPos);

          // Simple movement logic
          if (distance > 3) {
            // Move toward player
            const moveSpeed = (this.data.speed || 2) * (deltaTime / 1000);
            this.el.object3D.position.add(direction.multiplyScalar(moveSpeed));

            // Make enemy look at player
            this.el.object3D.lookAt(playerPos);
          }
        } else {
          // YUKA AI update
          const dt = deltaTime / 1000;

          if (this.time) {
            this.time.update(dt);
          }

          // Handle YUKA entity update safely
          try {
            // Get reference to the game manager's entity manager
            const gameManager = document.querySelector('[game-manager]');
            if (gameManager && gameManager.components && 
                gameManager.components['game-manager'] && 
                gameManager.components['game-manager'].entityManager) {
              // The game manager will update all entities
              // No need to update here
            } else if (this.entityManager) {
              // Only update local entity manager if needed
              this.entityManager.update(dt);
            }
          } catch (yukaError) {
            console.warn('YUKA update error:', yukaError);
            // Fallback to simple movement if YUKA fails
          }

          // Update the entity's position based on the AI vehicle
          if (this.vehicle) {
            // Set the target for seeking behavior to be the player's position
            const playerPos = this.playerEntity.object3D.position;
            this.seekBehavior.target.set(playerPos.x, playerPos.y, playerPos.z);

            // Calculate distance to player
            const distance = this.el.object3D.position.distanceTo(playerPos);

            // If close enough to player, switch to flee behavior
            if (distance < 5) {
              this.seekBehavior.weight = 0;
              this.fleeBehavior.weight = 1;
            } else {
              this.seekBehavior.weight = 1;
              this.fleeBehavior.weight = 0;
            }

            // Copy position from YUKA vehicle to A-Frame entity
            this.el.object3D.position.copy(this.vehicle.position);

            // Copy rotation (convert YUKA rotation to A-Frame)
            if (this.vehicle.rotation) {
              this.el.object3D.quaternion.copy(this.vehicle.rotation);
            }
          }
        }

        // Update hitbox for collision detection
        this.updateHitbox();

        if (this.vehicleSound) {
          try {
            // Completely disable audio to prevent errors
            this.audioEnabled = false;
            // Skip all audio processing
            return;
          } catch (error) {
            console.error('Error updating enemy audio:', error);
          }
        }
      } catch (error) {
        console.error('Error in enemy tick:', error);
      }
    },
    updateHitbox: function() {
      try {
        const mesh = this.el.getObject3D('mesh');

        if (!mesh) {
          // If no mesh exists yet, use a default hitbox
          const position = new THREE.Vector3();
          this.el.object3D.getWorldPosition(position);

          this.hitboxCenter = position;
          this.hitboxSize = new THREE.Vector3(1, 1, 1);

          // Create a simple box hitbox around the entity position
          this.hitboxHelper.setFromCenterAndSize(
            this.hitboxCenter,
            this.hitboxSize.clone().multiplyScalar(this.data.hitboxScale || 1.0)
          );
          return;
        }

        // Get the mesh's bounding box
        const boundingBox = new THREE.Box3().setFromObject(mesh);

        // Check that the bounding box is valid (not empty)
        if (boundingBox.isEmpty()) {
          // Use a default size if bounding box is invalid
          this.hitboxSize = new THREE.Vector3(1, 1, 1);

          const position = new THREE.Vector3();
          this.el.object3D.getWorldPosition(position);
          this.hitboxCenter = position;
        } else {
          // Get size and center from valid bounding box
          const size = boundingBox.getSize(new THREE.Vector3());
          const center = boundingBox.getCenter(new THREE.Vector3());

          // Update hitbox with mesh bounds
          this.hitboxSize = size;
          this.hitboxCenter = center;
        }

        // Update the helper box
        this.hitboxHelper.setFromCenterAndSize(
          this.hitboxCenter,
          this.hitboxSize.clone().multiplyScalar(this.data.hitboxScale || 1.0)
        );
      } catch (error) {
        console.error('Error updating hitbox:', error);
      }
    },
    remove: function() {
      try {
        const gameManager = document.querySelector('[game-manager]');
        if (gameManager && gameManager.components['game-manager'] && this.vehicle) {
          gameManager.components['game-manager'].entityManager.remove(this.vehicle);
          gameManager.components['game-manager'].unregisterEnemy(this);
        }
      } catch (error) {
        console.error('Error removing enemy component:', error);
      }
    }
  });
}

// Helper function to create particle effects
function createParticles(scene, position, color, count, lifespan) {
  for (let i = 0; i < count; i++) {
    const particle = document.createElement('a-entity');

    // Random direction
    const angle1 = Math.random() * Math.PI * 2;
    const angle2 = Math.random() * Math.PI * 2;
    const speed = Math.random() * 2 + 1;

    const velocity = {
      x: Math.cos(angle1) * Math.cos(angle2) * speed,
      y: Math.sin(angle2) * speed,
      z: Math.sin(angle1) * Math.cos(angle2) * speed
    };

    // Set attributes
    particle.setAttribute('position', `${position.x} ${position.y} ${position.z}`);
    particle.setAttribute('geometry', 'primitive: sphere; radius: 0.1');
    particle.setAttribute('material', `color: ${color}; shader: flat`);

    // Add to scene
    scene.appendChild(particle);

    // Animate and remove
    let elapsed = 0;
    const tick = function(time, timeDelta) {
      elapsed += timeDelta;

      // Update position based on velocity
      const currentPos = particle.getAttribute('position');
      particle.setAttribute('position', {
        x: currentPos.x + velocity.x * (timeDelta/1000),
        y: currentPos.y + velocity.y * (timeDelta/1000),
        z: currentPos.z + velocity.z * (timeDelta/1000)
      });

      // Scale down over time
      const scale = 1 - (elapsed / lifespan);
      if (scale > 0) {
        particle.setAttribute('scale', `${scale} ${scale} ${scale}`);
      }

      // Remove when lifespan is over
      if (elapsed >= lifespan) {
        scene.removeChild(particle);
        particle.removeEventListener('tick', tick);
      }
    };

    particle.addEventListener('tick', tick);

    // Ensure cleanup
    setTimeout(() => {
      if (particle.parentNode) {
        scene.removeChild(particle);
      }
    }, lifespan);
  }
}