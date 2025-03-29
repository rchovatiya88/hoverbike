/* global AFRAME, THREE */

// Prevent duplicate registration
if (!AFRAME.components['weapon-component']) {
  AFRAME.registerComponent('weapon-component', {
    schema: {
      damage: { type: "number", default: 10 },
      cooldown: { type: "number", default: 0.5 },
      automatic: { type: "boolean", default: false },
      range: { type: "number", default: 100 },
      accuracy: { type: "number", default: 0.9 },
      ammo: { type: "number", default: -1 }, // -1 for infinite
      infiniteAmmo: { type: "boolean", default: true} // Added for ammo management
    },

    init: function () {
      this.isFiring = false;
      this.lastFired = 0;
      this.currentAmmo = this.data.ammo;
      this.createWeaponModel();
      this.setupEventListeners();
      this.setupSound();
      this.muzzleFlash = null;
      this.createMuzzleFlash();
      this.canFire = true; // Flag to control firing

      // Raycaster for weapon
      this.raycaster = new THREE.Raycaster();
      this.direction = new THREE.Vector3();
      this.tempMatrix = new THREE.Matrix4();
      this.offsetRays = [];

      // Create offset rays for better hit detection (shotgun spread pattern)
      for (let i = 0; i < 5; i++) {
        this.offsetRays.push(new THREE.Vector3());
      }
    },

    createWeaponModel: function() {
    try {
      // Create a THREE.Group for the weapon
      this.weaponGroup = new THREE.Group();
      this.el.object3D.add(this.weaponGroup);

      // Create weapon parts with separate method for better organization
      this.createWeaponParts();

      // Position the complete weapon group
      this.weaponGroup.position.set(0.4, -0.2, -0.5);

      // Create a simple reference entity for A-Frame compatibility
      const weaponEntity = document.createElement('a-entity');
      this.el.appendChild(weaponEntity);
      this.weaponEntity = weaponEntity;
    } catch (error) {
      console.error('Error creating weapon model:', error);
      this.createFallbackWeapon();
    }
  },

  createWeaponParts: function() {
    // Create barrel
    const barrelGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.5);
    const barrelMaterial = new THREE.MeshStandardMaterial({color: 0x333333});
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.position.set(0, 0, -0.25);

    // Create body
    const bodyGeometry = new THREE.BoxGeometry(0.12, 0.15, 0.2);
    const bodyMaterial = new THREE.MeshStandardMaterial({color: 0x666666});
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.set(0, -0.05, 0);

    // Add parts to weapon group
    this.weaponGroup.add(barrel);
    this.weaponGroup.add(body);
  },

  createFallbackWeapon: function() {
    try {
      const fallbackWeapon = document.createElement('a-box');
      fallbackWeapon.setAttribute('color', '#FF5733');
      fallbackWeapon.setAttribute('height', '0.1');
      fallbackWeapon.setAttribute('width', '0.1');
      fallbackWeapon.setAttribute('depth', '0.3');
      fallbackWeapon.setAttribute('position', '0.4 -0.2 -0.5');
      this.el.appendChild(fallbackWeapon);
      this.weaponEntity = fallbackWeapon;
    } catch (fallbackError) {
      console.error('Could not create fallback weapon model:', fallbackError);
    }
  },

    createMuzzleFlash: function () {
      if (!this.weaponGroup) {
        console.warn('Cannot create muzzle flash: weapon group not initialized');
        return;
      }

      // Create muzzle flash
      const flashGeometry = new THREE.PlaneGeometry(0.2, 0.2);
      const flashMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });
      this.muzzleFlash = new THREE.Mesh(flashGeometry, flashMaterial);
      this.muzzleFlash.position.set(0, 0, -0.55);
      this.muzzleFlash.rotation.y = Math.PI / 2;
      this.muzzleFlash.visible = false;

      // Add muzzle flash to weapon group
      this.weaponGroup.add(this.muzzleFlash);
    },

    setupSound: function () {
      // Create sound entities for weapon
      this.el.setAttribute("sound__shoot", {
        src: "url(/sounds/laser-gun.mp3)",
        poolSize: 3,
        volume: 0.5,
        maxDistance: 100,
        refDistance: 10,
        rolloffFactor: 1
      });

      this.el.setAttribute("sound__empty", {
        src: "url(/sounds/empty-gun.mp3)",
        poolSize: 1,
        volume: 0.5
      });
    },

    setupEventListeners: function () {
      // Setup event listeners for firing
      this.onMouseDownHandler = this.onMouseDown.bind(this);
      this.onMouseUpHandler = this.onMouseUp.bind(this);

      document.addEventListener("mousedown", this.onMouseDownHandler);
      document.addEventListener("mouseup", this.onMouseUpHandler);

      // For mobile/touch devices
      document.addEventListener("touchstart", this.onMouseDownHandler);
      document.addEventListener("touchend", this.onMouseUpHandler);
    },

    onMouseDown: function (e) {
      if (e.button === 0 || e.type === "touchstart") {
        this.isFiring = true;
        if (!this.data.automatic) {
          this.fire();
        }
      }
    },

    onMouseUp: function (e) {
      if (e.button === 0 || e.type === "touchend") {
        this.isFiring = false;
      }
    },

    fire: function () {
      if (!this.canFire) return;

      // Add cooldown control
      const now = Date.now();
      if (now - this.lastFired < this.data.cooldown * 1000) {
        return;
      }
      this.lastFired = now;

      // Check if game is running
      const gameManager = document.querySelector('[game-manager]');
      if (!gameManager || !gameManager.components['game-manager'] || !gameManager.components['game-manager'].gameStarted) return;

      // Handle ammo
      if (this.currentAmmo <= 0 && !this.data.infiniteAmmo) {
        // Play empty gun sound (removed)
        return;
      }

      // Update ammo if not infinite
      if (!this.data.infiniteAmmo) {
        this.currentAmmo--;
        this.updateAmmoDisplay();
      }

      // Show muzzle flash
      this.showMuzzleFlash();

      // For jetbike: get direction from camera (third-person view)
      const camera = document.getElementById('camera');

      if (!camera) {
        console.error('Camera not found for weapon firing');
        return;
      }

      // Get the camera direction vector (forward direction)
      const direction = new THREE.Vector3(0, 0, -1);
      direction.applyQuaternion(camera.object3D.quaternion);
      direction.normalize();

      // Apply some randomness for weapon accuracy
      const accuracy = this.data.accuracy;
      const spread = (1 - accuracy) * 0.1;
      direction.x += (Math.random() - 0.5) * spread;
      direction.y += (Math.random() - 0.5) * spread;
      direction.z += (Math.random() - 0.5) * spread;
      direction.normalize();

      // Set the ray origin to the camera position
      this.raycaster.set(camera.object3D.getWorldPosition(new THREE.Vector3()), direction);

      // Set up offset rays for better hit detection
      for (let i = 0; i < this.offsetRays.length; i++) {
        const offsetDir = this.offsetRays[i];
        offsetDir.copy(direction);
        offsetDir.x += (Math.random() - 0.5) * spread * 2;
        offsetDir.y += (Math.random() - 0.5) * spread * 2;
        offsetDir.z += (Math.random() - 0.5) * spread * 2;
        offsetDir.normalize();
      }

      // Raycast to find what we hit
      this.checkForHits();
    },

    updateAmmoDisplay: function() {
      const ammoDisplay = document.getElementById("ammo-display");
      if (ammoDisplay) {
        ammoDisplay.textContent = this.currentAmmo + " / ∞";
      }
    },

    checkForHits: function () {
      // Get all potential targets
      const enemyEls = Array.from(document.querySelectorAll("[enemy-component]"));
      const allTargets = Array.from(document.querySelectorAll("a-entity, a-plane, a-box"));
      console.log("Found " + enemyEls.length + " potential enemy targets and " + allTargets.length + " total targets");

      // Convert to THREE.Object3D for raycasting
      const enemies = enemyEls.map(el => el.object3D);

      // First try direct hit
      let hit = false;
      let intersects = this.raycaster.intersectObjects(allTargets.map(el => el.object3D), true);

      if (intersects.length > 0) {
        console.log("Hit object:", intersects[0].object.toJSON());
        const hitObject = this.findAncestorWithEl(intersects[0].object);

        if (hitObject) {
          hit = this.processHit(hitObject, intersects[0].distance);
        }
      }

      // If no hit, try offset rays
      if (!hit) {
        const originalDirection = this.raycaster.ray.direction.clone();

        for (const offsetDir of this.offsetRays) {
          this.raycaster.ray.direction.copy(offsetDir);
          intersects = this.raycaster.intersectObjects(allTargets.map(el => el.object3D), true);

          if (intersects.length > 0) {
            console.log("Hit detected with offset ray");
            console.log("Hit object:", intersects[0].object.toJSON());
            const hitObject = this.findAncestorWithEl(intersects[0].object);

            if (hitObject) {
              hit = this.processHit(hitObject, intersects[0].distance);
              if (hit) break;
            }
          }
        }

        // Restore original direction
        this.raycaster.ray.direction.copy(originalDirection);
      }
    },

    findAncestorWithEl: function (object) {
      // Try to find the A-Frame entity associated with the THREE.js object
      let current = object;

      while (current) {
        if (current.el) {
          console.log("Found entity via object3D.el reference");
          return current.el;
        }
        current = current.parent;
      }

      return null;
    },

    processHit: function (hitEl, distance) {
      if (!hitEl) return false;

      // Check if we hit an enemy
      if (hitEl.components && hitEl.components["enemy-component"]) {
        console.log("Hit enemy:", hitEl.id || "unnamed enemy", "Distance:", distance.toFixed(2));

        // Apply damage to enemy
        hitEl.components["enemy-component"].takeDamage(this.data.damage);
        return true;
      } 
      // Check if we hit player (no friendly fire)
      else if (hitEl.components && hitEl.components["player-component"]) {
        console.log("Hit player (no damage):", hitEl.id || "player", "Distance:", distance.toFixed(2));
        return true;
      }
      // Environment hit
      else {
        console.log("Hit entity:", hitEl.id || "unknown", "Distance:", distance.toFixed(2));
        console.log("Hit environment at distance:", distance.toFixed(2));

        // Could create impact effect or bullet holes here
        return true;
      }
    },

    flashMuzzle: function () {
      if (!this.muzzleFlash) return;

      // Show muzzle flash
      this.muzzleFlash.material.opacity = 1;

      // Hide it after a short time
      setTimeout(() => {
        if (this.muzzleFlash) {
          this.muzzleFlash.material.opacity = 0;
        }
      }, 50);
    },

    showMuzzleFlash: function () {
    try {
      if (!this.muzzleFlash) {
        // Create muzzle flash if it doesn't exist yet
        this.createMuzzleFlash();
        if (!this.muzzleFlash) return;
      }

      // Make muzzle flash visible
      this.muzzleFlash.visible = true;

      // Clear any existing timeout to prevent issues
      if (this.muzzleFlashTimeout) {
        clearTimeout(this.muzzleFlashTimeout);
      }

      // Hide the muzzle flash after a short delay
      this.muzzleFlashTimeout = setTimeout(() => {
        if (this.muzzleFlash) {
          this.muzzleFlash.visible = false;
        }
      }, 50);
    } catch (error) {
      console.error('Error showing muzzle flash:', error);
    }
  },

    tick: function (time, delta) {
      // Handle automatic firing
      if (this.isFiring && this.data.automatic) {
        this.fire();
      }
    },

    remove: function () {
      // Clean up event listeners when component is removed
      document.removeEventListener("mousedown", this.onMouseDownHandler);
      document.removeEventListener("mouseup", this.onMouseUpHandler);
      document.removeEventListener("touchstart", this.onMouseDownHandler);
      document.removeEventListener("touchend", this.onMouseUpHandler);

      // Remove weapon model
      if (this.el) {
        this.el.removeObject3D("weapon");
      }

      // Clean up THREE objects
      if (this.weaponMesh) {
        if (this.weaponMesh.geometry) this.weaponMesh.geometry.dispose();
        if (this.weaponMesh.material) this.weaponMesh.material.dispose();
      }

      if (this.muzzleFlash) {
        if (this.muzzleFlash.geometry) this.muzzleFlash.geometry.dispose();
        if (this.muzzleFlash.material) this.muzzleFlash.material.dispose();
      }
      if (this.leftFlash) {
        if (this.leftFlash.geometry) this.leftFlash.geometry.dispose();
        if (this.leftFlash.material) this.leftFlash.material.dispose();
      }
      if (this.rightFlash) {
        if (this.rightFlash.geometry) this.rightFlash.geometry.dispose();
        if (this.rightFlash.material) this.rightFlash.material.dispose();
      }
    }
  });
}