/* global AFRAME, THREE */

AFRAME.registerComponent("weapon-component", {
  schema: {
    damage: { type: "number", default: 10 },
    cooldown: { type: "number", default: 0.5 },
    automatic: { type: "boolean", default: false },
    range: { type: "number", default: 100 },
    accuracy: { type: "number", default: 0.9 },
    ammo: { type: "number", default: -1 }, // -1 for infinite
  },

  init: function () {
    this.isFiring = false;
    this.lastFired = 0;
    this.createWeaponModel();
    this.setupEventListeners();
    this.setupSound();
    this.muzzleFlash = null;
    this.createMuzzleFlash();

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

  createWeaponModel: function () {
    // Create a simple weapon model using THREE.js
    const weaponGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.5);
    const weaponMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    this.weaponMesh = new THREE.Mesh(weaponGeometry, weaponMaterial);

    // Create a group to hold the weapon mesh
    this.weaponGroup = new THREE.Group();
    this.weaponGroup.add(this.weaponMesh);

    // Position the weapon mesh within the group
    this.weaponMesh.position.set(0, 0, -0.25);

    // Set the weapon model as an object3D on the entity
    this.el.setObject3D("weapon", this.weaponGroup);

    // Find weapon mounts on the player model
    const leftMount = document.getElementById("weapon-mount-left");
    const rightMount = document.getElementById("weapon-mount-right");

    if (leftMount && rightMount) {
      // Create left weapon
      const leftWeaponGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.5);
      const leftWeaponMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
      const leftWeaponMesh = new THREE.Mesh(leftWeaponGeometry, leftWeaponMaterial);

      // Create a group for left weapon
      const leftWeaponGroup = new THREE.Group();
      leftWeaponGroup.add(leftWeaponMesh);
      leftWeaponMesh.position.set(0, 0, -0.25);
      leftMount.setObject3D("weapon", leftWeaponGroup);

      // Create right weapon
      const rightWeaponGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.5);
      const rightWeaponMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
      const rightWeaponMesh = new THREE.Mesh(rightWeaponGeometry, rightWeaponMaterial);

      // Create a group for right weapon
      const rightWeaponGroup = new THREE.Group();
      rightWeaponGroup.add(rightWeaponMesh);
      rightWeaponMesh.position.set(0, 0, -0.25);
      rightMount.setObject3D("weapon", rightWeaponGroup);
    }
  },

  createMuzzleFlash: function () {
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
    const now = Date.now();
    if (now - this.lastFired < this.data.cooldown * 1000) return;

    // Check if we have ammo
    if (this.data.ammo === 0) {
      this.el.components.sound__empty.playSound();
      return;
    }

    // Update last fired time
    this.lastFired = now;

    // Decrement ammo if not infinite
    if (this.data.ammo > 0) {
      this.data.ammo--;
      // Update ammo display
      document.getElementById("ammo-display").textContent = 
        this.data.ammo + " / ∞";
    }

    // Play shooting sound
    this.el.components.sound__shoot.playSound();

    // Get camera and player position/direction for raycasting
    const camera = document.getElementById("camera").object3D;
    const player = document.getElementById("player").object3D;

    // Set the raycaster to use the camera's position and direction
    camera.getWorldPosition(this.raycaster.ray.origin);
    camera.getWorldDirection(this.direction);
    console.log("Firing weapon - Direction:", this.direction);

    // Apply some randomness for weapon accuracy
    const accuracy = this.data.accuracy;
    const spread = (1 - accuracy) * 0.1;
    this.direction.x += (Math.random() - 0.5) * spread;
    this.direction.y += (Math.random() - 0.5) * spread;
    this.direction.z += (Math.random() - 0.5) * spread;
    this.direction.normalize();

    this.raycaster.ray.direction.copy(this.direction);

    // Set up offset rays for better hit detection
    for (let i = 0; i < this.offsetRays.length; i++) {
      const offsetDir = this.offsetRays[i];
      offsetDir.copy(this.direction);
      offsetDir.x += (Math.random() - 0.5) * spread * 2;
      offsetDir.y += (Math.random() - 0.5) * spread * 2;
      offsetDir.z += (Math.random() - 0.5) * spread * 2;
      offsetDir.normalize();
    }

    // Raycast to find what we hit
    this.checkForHits();

    // Flash muzzle effect
    this.flashMuzzle();
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
    this.el.removeObject3D("weapon");
  }
});