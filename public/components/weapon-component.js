/* global AFRAME, THREE */

AFRAME.registerComponent('weapon-component', {
  schema: {
    damage: { type: 'number', default: 10 },
    cooldown: { type: 'number', default: 0.5 },
    range: { type: 'number', default: 100 },
    automatic: { type: 'boolean', default: false },
    ammo: { type: 'number', default: 30 },
    maxAmmo: { type: 'number', default: 30 },
    infiniteAmmo: { type: 'boolean', default: true },
    reloadTime: { type: 'number', default: 2.0 },
    muzzleFlashDuration: { type: 'number', default: 0.05 },
    bulletSpeed: { type: 'number', default: 100 },
    weaponColor: { type: 'color', default: '#444444' },
    muzzleColor: { type: 'color', default: '#FFFF00' }
  },

  init: function() {
    this.isShooting = false;
    this.lastShot = 0;
    this.isReloading = false;
    this.reloadTimeout = null;
    this.mouse = { x: 0, y: 0 };

    // Mouse event listeners
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);

    // Create weapon model with THREE.js objects
    this.createWeaponModel();

    // Initialize muzzle flash
    this.initMuzzleFlash();

    // Initialize bullet visualization
    this.bulletPool = [];
    this.initBulletPool(10);

    // Update UI
    this.updateAmmoDisplay();

    // Add event listeners
    document.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mouseup', this.onMouseUp);
  },

  createWeaponModel: function() {
    try {
      // Create main weapon group
      this.weaponGroup = new THREE.Group();

      // Create weapon parts using THREE.js objects
      const barrelLength = 1.5;
      const barrelRadius = 0.05;

      // Barrel geometry
      const barrelGeometry = new THREE.CylinderGeometry(barrelRadius, barrelRadius, barrelLength, 16);
      const barrelMaterial = new THREE.MeshStandardMaterial({ 
        color: this.data.weaponColor,
        metalness: 0.7,
        roughness: 0.3 
      });

      // Create barrel mesh and position it
      const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.z = -barrelLength / 2;

      // Create handle
      const handleGeometry = new THREE.BoxGeometry(0.1, 0.3, 0.1);
      const handle = new THREE.Mesh(handleGeometry, barrelMaterial);
      handle.position.y = -0.2;

      // Add parts to the weapon group
      this.weaponGroup.add(barrel);
      this.weaponGroup.add(handle);

      // Mount weapons to the mount points
      const leftMount = document.getElementById('weapon-mount-left');
      const rightMount = document.getElementById('weapon-mount-right');

      if (leftMount) {
        const leftWeapon = this.weaponGroup.clone();
        leftMount.object3D.add(leftWeapon);
        this.leftWeapon = leftWeapon;
      }

      if (rightMount) {
        const rightWeapon = this.weaponGroup.clone();
        rightMount.object3D.add(rightWeapon);
        this.rightWeapon = rightWeapon;
      }

      console.log('Weapon model created successfully');
    } catch (error) {
      console.error('Error creating weapon model:', error);
    }
  },

  initMuzzleFlash: function() {
    // Create muzzle flash geometry
    const muzzleGeometry = new THREE.ConeGeometry(0.1, 0.3, 16);
    const muzzleMaterial = new THREE.MeshBasicMaterial({ 
      color: this.data.muzzleColor,
      transparent: true,
      opacity: 0.8
    });

    // Create left muzzle flash
    if (this.leftWeapon) {
      this.leftMuzzleFlash = new THREE.Mesh(muzzleGeometry, muzzleMaterial);
      this.leftMuzzleFlash.rotation.x = -Math.PI / 2;
      this.leftMuzzleFlash.position.z = -1.0;
      this.leftMuzzleFlash.visible = false;
      this.leftWeapon.add(this.leftMuzzleFlash);
    }

    // Create right muzzle flash
    if (this.rightWeapon) {
      this.rightMuzzleFlash = new THREE.Mesh(muzzleGeometry, muzzleMaterial);
      this.rightMuzzleFlash.rotation.x = -Math.PI / 2;
      this.rightMuzzleFlash.position.z = -1.0;
      this.rightMuzzleFlash.visible = false;
      this.rightWeapon.add(this.rightMuzzleFlash);
    }
  },

  initBulletPool: function(count) {
    const bulletGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });

    for (let i = 0; i < count; i++) {
      const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
      bullet.visible = false;
      bullet.alive = false;
      this.el.sceneEl.object3D.add(bullet);
      this.bulletPool.push({
        mesh: bullet,
        direction: new THREE.Vector3(),
        speed: 0,
        time: 0
      });
    }
  },

  fireBullet: function() {
    if (this.isReloading || this.data.ammo <= 0 && !this.data.infiniteAmmo) return;

    // Check cooldown
    const now = performance.now();
    if (now - this.lastShot < this.data.cooldown * 1000) return;
    this.lastShot = now;

    // Handle ammo
    if (!this.data.infiniteAmmo) {
      this.data.ammo--;
      this.updateAmmoDisplay();

      if (this.data.ammo <= 0) {
        this.reload();
        return;
      }
    }

    // Show muzzle flash
    if (this.leftMuzzleFlash) this.leftMuzzleFlash.visible = true;
    if (this.rightMuzzleFlash) this.rightMuzzleFlash.visible = true;

    // Hide muzzle flash after duration
    setTimeout(() => {
      if (this.leftMuzzleFlash) this.leftMuzzleFlash.visible = false;
      if (this.rightMuzzleFlash) this.rightMuzzleFlash.visible = false;
    }, this.data.muzzleFlashDuration * 1000);

    // Fire bullet visual (use bullet from pool)
    this.spawnBullet();

    // Raycast for hit detection
    this.checkHit();
  },

  spawnBullet: function() {
    // Find an available bullet in the pool
    for (const bullet of this.bulletPool) {
      if (!bullet.alive) {
        // Position bullet at muzzle
        const weaponWorldPos = new THREE.Vector3();
        if (this.leftWeapon) {
          this.leftWeapon.getWorldPosition(weaponWorldPos);
        } else if (this.rightWeapon) {
          this.rightWeapon.getWorldPosition(weaponWorldPos);
        } else {
          this.el.object3D.getWorldPosition(weaponWorldPos);
        }

        // Get direction from camera
        const direction = new THREE.Vector3(0, 0, -1);
        const cameraObj = document.querySelector('[camera]').object3D;
        direction.applyQuaternion(cameraObj.quaternion);

        // Set bullet properties
        bullet.mesh.position.copy(weaponWorldPos);
        bullet.direction.copy(direction);
        bullet.speed = this.data.bulletSpeed;
        bullet.time = performance.now();
        bullet.alive = true;
        bullet.mesh.visible = true;

        break;
      }
    }
  },

  updateBullets: function(time, delta) {
    const deltaSeconds = delta / 1000;

    for (const bullet of this.bulletPool) {
      if (bullet.alive) {
        // Move bullet
        const movement = bullet.direction.clone().multiplyScalar(bullet.speed * deltaSeconds);
        bullet.mesh.position.add(movement);

        // Check if bullet should be removed (after 2 seconds or max range)
        const bulletAge = (time - bullet.time) / 1000;
        if (bulletAge > 2.0) {
          bullet.alive = false;
          bullet.mesh.visible = false;
        }
      }
    }
  },

  checkHit: function() {
    // Raycast from camera for accuracy
    const camera = document.querySelector('[camera]');
    const direction = new THREE.Vector3(0, 0, -1);
    const cameraObj = camera.object3D;
    const cameraPosition = new THREE.Vector3();
    cameraObj.getWorldPosition(cameraPosition);
    direction.applyQuaternion(cameraObj.quaternion);

    const raycaster = new THREE.Raycaster(cameraPosition, direction, 0, this.data.range);
    const enemies = Array.from(document.querySelectorAll('[enemy-component]'));
    const enemyObjects = enemies.map(enemy => enemy.object3D);

    const hits = raycaster.intersectObjects(enemyObjects, true);

    if (hits.length > 0) {
      const hitEntity = this.findAncestorWithComponent(hits[0].object, 'enemy-component');
      if (hitEntity) {
        // Emit hit event with damage
        hitEntity.emit('hit', { damage: this.data.damage });
        console.log('Hit enemy:', hitEntity.id);
      }
    }
  },

  findAncestorWithComponent: function(object3D, componentName) {
    let current = object3D;

    while (current) {
      if (current.el && current.el.components && current.el.components[componentName]) {
        return current.el;
      }
      current = current.parent;
    }

    return null;
  },

  reload: function() {
    if (this.isReloading || this.data.ammo === this.data.maxAmmo) return;

    this.isReloading = true;
    console.log('Reloading...');

    this.reloadTimeout = setTimeout(() => {
      this.data.ammo = this.data.maxAmmo;
      this.isReloading = false;
      this.updateAmmoDisplay();
      console.log('Reload complete');
    }, this.data.reloadTime * 1000);
  },

  updateAmmoDisplay: function() {
    const ammoDisplay = document.getElementById('ammo-display');
    if (ammoDisplay) {
      ammoDisplay.textContent = this.data.infiniteAmmo ? 
        `∞ / ∞` : 
        `${this.data.ammo} / ${this.data.maxAmmo}`;
    }
  },

  onMouseDown: function(event) {
    if (document.pointerLockElement) {
      this.isShooting = true;
      this.fireBullet();
    }
  },

  onMouseUp: function(event) {
    this.isShooting = false;
  },

  tick: function(time, delta) {
    // Handle automatic fire
    if (this.isShooting && this.data.automatic) {
      this.fireBullet();
    }

    // Update bullet positions
    this.updateBullets(time, delta);
  },

  remove: function() {
    // Clean up event listeners
    document.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mouseup', this.onMouseUp);

    // Clear any pending timeouts
    if (this.reloadTimeout) {
      clearTimeout(this.reloadTimeout);
    }

    // Remove bullet meshes
    for (const bullet of this.bulletPool) {
      if (bullet.mesh && bullet.mesh.parent) {
        bullet.mesh.parent.remove(bullet.mesh);
      }
    }
  }
});