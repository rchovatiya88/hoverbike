AFRAME.registerComponent('weapon-component', {
  schema: {
    damage: { type: 'number', default: 25 },
    cooldown: { type: 'number', default: 0.5 },
    automatic: { type: 'boolean', default: true },
    range: { type: 'number', default: 100 },
    clipSize: { type: 'number', default: 30 },
    reloadTime: { type: 'number', default: 2 },
    accuracy: { type: 'number', default: 0.98 } 
  },
  init: function() {
    this.lastShot = 0;
    this.isReloading = false;
    this.ammoInClip = this.data.clipSize;
    this.reloadTimer = null;
    this.raycaster = new THREE.Raycaster();
    this.createWeaponModel();
    this.setupEventListeners();
    this.updateAmmoDisplay();
    this.mouseDown = false;
    this.fireLoopId = null;
  },
  createWeaponModel: function() {
    const material = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const gunGroup = new THREE.Group();
    const barrelGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.4);
    const barrel = new THREE.Mesh(barrelGeometry, material);
    barrel.position.z = -0.2;
    gunGroup.add(barrel);
    const handleGeometry = new THREE.BoxGeometry(0.05, 0.12, 0.05);
    const handle = new THREE.Mesh(handleGeometry, material);
    handle.position.y = -0.08;
    gunGroup.add(handle);
    const bodyGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.2);
    const body = new THREE.Mesh(bodyGeometry, material);
    body.position.z = 0;
    gunGroup.add(body);
    this.el.setObject3D('mesh', gunGroup);
    this.el.setAttribute('animation__recoil', {
      property: 'position',
      from: '0.2 -0.2 -0.3',
      to: '0.2 -0.1 -0.2',
      dur: 50,
      autoplay: false
    });
    this.el.setAttribute('animation__recover', {
      property: 'position',
      from: '0.2 -0.1 -0.2',
      to: '0.2 -0.2 -0.3',
      dur: 100,
      autoplay: false
    });
  },
  setupEventListeners: function() {
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    document.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mouseup', this.onMouseUp);
  },
  onMouseDown: function(event) {
    if (!document.pointerLockElement) return;
    if (event.button !== 0) return;
    this.mouseDown = true;
    if (this.data.automatic) {
      this.startFiring();
    } else {
      this.shoot();
    }
  },
  onMouseUp: function(event) {
    if (event.button !== 0) return;
    this.mouseDown = false;
    if (this.data.automatic) {
      this.stopFiring();
    }
  },
  startFiring: function() {
    if (this.fireLoopId !== null) {
      clearInterval(this.fireLoopId);
    }
    this.shoot();
    this.fireLoopId = setInterval(() => {
      if (!this.mouseDown) {
        this.stopFiring();
        return;
      }
      this.shoot();
    }, this.data.cooldown * 1000);
  },
  stopFiring: function() {
    if (this.fireLoopId !== null) {
      clearInterval(this.fireLoopId);
      this.fireLoopId = null;
    }
  },
  updateAmmoDisplay: function() {
    const ammoDisplay = document.getElementById('ammo-display');
    if (ammoDisplay) {
      if (this.isReloading) {
        ammoDisplay.textContent = 'RELOADING...';
      } else {
        ammoDisplay.textContent = `${this.ammoInClip} / ∞`;
      }
    }
  },
  reload: function() {
    if (this.isReloading) return;
    if (this.ammoInClip === this.data.clipSize) return;
    this.isReloading = true;
    this.updateAmmoDisplay();
    this.reloadTimer = setTimeout(() => {
      this.ammoInClip = this.data.clipSize;
      this.isReloading = false;
      this.updateAmmoDisplay();
    }, this.data.reloadTime * 1000);
  },
  applyRecoil: function() {
    this.el.components.animation__recoil.beginAnimation();
    setTimeout(() => {
      this.el.components.animation__recover.beginAnimation();
    }, 50);
  },
  createMuzzleFlash: function() {
    const flash = document.createElement('a-entity');
    const worldPosition = new THREE.Vector3();
    this.el.object3D.getWorldPosition(worldPosition);
    const camera = document.querySelector('a-camera').object3D;
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);
    const position = new THREE.Vector3(worldPosition.x, worldPosition.y, worldPosition.z)
      .add(direction.multiplyScalar(0.4));
    flash.setAttribute('position', position);
    flash.setAttribute('particle-system', {
      preset: 'dust',
      particleCount: 10,
      color: '#ff0,#ff5',
      size: 0.1,
      duration: 0.1,
      direction: 'normal',
      velocity: 0.5
    });
    document.querySelector('a-scene').appendChild(flash);
  },
  createTracer: function(start, end) {
    const scene = document.querySelector('a-scene').object3D;
    const material = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const line = new THREE.Line(geometry, material);
    scene.add(line);
    setTimeout(() => {
      scene.remove(line);
      line.geometry.dispose();
      line.material.dispose();
    }, 100);
  },
  createHitEffect: function(position) {
    const hitEffect = document.createElement('a-entity');
    hitEffect.setAttribute('position', position);
    hitEffect.setAttribute('particle-system', {
      preset: 'dust',
      particleCount: 15,
      color: '#f00,#900',
      size: 0.05,
      duration: 0.3,
      direction: 'normal',
      velocity: 0.5
    });
    document.querySelector('a-scene').appendChild(hitEffect);
  },
  createImpactEffect: function(position, normal) {
    const impactEffect = document.createElement('a-entity');
    impactEffect.setAttribute('position', position);
    const orientationQuaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      normal
    );
    const orientationEuler = new THREE.Euler().setFromQuaternion(orientationQuaternion);
    const rotation = {
      x: THREE.MathUtils.radToDeg(orientationEuler.x),
      y: THREE.MathUtils.radToDeg(orientationEuler.y),
      z: THREE.MathUtils.radToDeg(orientationEuler.z)
    };
    impactEffect.setAttribute('rotation', rotation);
    impactEffect.setAttribute('particle-system', {
      preset: 'dust',
      particleCount: 10,
      color: '#888,#aaa',
      size: 0.03,
      duration: 0.5,
      direction: 'normal',
      velocity: 0.3
    });
    document.querySelector('a-scene').appendChild(impactEffect);
  },
  currentTime: 0,
  shoot: function() {
    const now = performance.now();
    if (this.isReloading || this.ammoInClip <= 0 || now - this.lastShot < this.data.cooldown * 1000) {
      if (this.ammoInClip <= 0) this.reload();
      return;
    }

    this.lastShot = now;
    this.ammoInClip--;
    this.updateAmmoDisplay();
    this.applyRecoil();
    this.createMuzzleFlash();

    const camera = document.querySelector('a-camera').object3D;
    const weaponPosition = new THREE.Vector3();
    this.el.object3D.getWorldPosition(weaponPosition);

    const accuracy = this.data.accuracy;
    const spread = 1.0 - accuracy;

    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);

    if (Math.abs(direction.y) > 0.8) {
      direction.y = Math.sign(direction.y) * 0.3;
      direction.normalize();
    }

    if (spread > 0) {
      direction.x += (Math.random() - 0.5) * spread * 0.05;
      direction.y += (Math.random() - 0.5) * spread * 0.05;
      direction.z += (Math.random() - 0.5) * spread * 0.005;
      direction.normalize();
    }

    this.raycaster.set(weaponPosition, direction);
    this.raycaster.far = this.data.range;

    const allTargets = [];
    const enemyElements = document.querySelectorAll('[enemy-component]');
    enemyElements.forEach(enemy => {
      if (enemy.object3D) {
        allTargets.push(enemy.object3D);
      }
    });

    const obstacles = document.querySelectorAll('.obstacle, [ground]');
    obstacles.forEach(obstacle => {
      if (obstacle.object3D) allTargets.push(obstacle.object3D);
    });

    const intersects = this.raycaster.intersectObjects(allTargets, true);

    let allRayIntersects = [];
    if (intersects.length > 0) {
      allRayIntersects = intersects;
    } else {
      const offsetAmount = 0.1;
      const offsets = [
        new THREE.Vector3(offsetAmount, 0, 0),
        new THREE.Vector3(-offsetAmount, 0, 0),
        new THREE.Vector3(0, offsetAmount, 0),
        new THREE.Vector3(0, -offsetAmount, 0)
      ];

      for (const offset of offsets) {
        const offsetDirection = direction.clone().add(offset).normalize();
        this.raycaster.set(weaponPosition, offsetDirection);
        const offsetIntersects = this.raycaster.intersectObjects(allTargets, true);
        if (offsetIntersects.length > 0) {
          allRayIntersects = offsetIntersects;
          break;
        }
      }
    }

    if (allRayIntersects.length > 0) {
      const closestHit = allRayIntersects[0];
      const hitPoint = closestHit.point;
      let hitEntity = null;
      let currentObj = closestHit.object;

      if (currentObj.userData && currentObj.userData.ownerEntity) {
        hitEntity = currentObj.userData.ownerEntity;
      } else if (currentObj.el && (
        currentObj.el.classList.contains('hitbox-mesh') ||
        currentObj.el.classList.contains('enemy-hitbox') ||
        currentObj.el.getAttribute('data-hitbox-type') === 'enemy'
      )) {
        const ownerId = currentObj.el.getAttribute('data-hitbox-owner');
        if (ownerId) {
          const ownerEntity = document.getElementById(ownerId);
          if (ownerEntity) {
            hitEntity = ownerEntity;
          }
        } else if (!hitEntity && currentObj.el.parentNode) {
          let parent = currentObj.el.parentNode;
          while (parent && !parent.hasAttribute('enemy-component')) {
            parent = parent.parentNode;
            if (!parent) break;
          }
          if (parent && parent.hasAttribute('enemy-component')) {
            hitEntity = parent;
          }
        }
      } else while (currentObj && !hitEntity) {
        if (currentObj.el) {
          hitEntity = currentObj.el;
          break;
        }
        if (!currentObj.parent) break;
        currentObj = currentObj.parent;
      }

      if (hitEntity && closestHit.distance <= this.data.range) {
        let enemyComponent = null;
        if (hitEntity.hasAttribute('enemy-component')) {
          enemyComponent = hitEntity.components['enemy-component'];
        } else if (currentObj.userData && currentObj.userData.isEnemyHitbox) {
          const ownerEntity = currentObj.userData.ownerEntity;
          if (ownerEntity && ownerEntity.components && ownerEntity.components['enemy-component']) {
            enemyComponent = ownerEntity.components['enemy-component'];
          }
        } else {
          let parent = hitEntity;
          let attempts = 0;
          while (parent && !enemyComponent && attempts < 3) {
            if (parent.components && parent.components['enemy-component']) {
              enemyComponent = parent.components['enemy-component'];
            }
            parent = parent.parentNode;
            attempts++;
          }
        }

        if (enemyComponent) {
          enemyComponent.takeDamage(this.data.damage, hitPoint);
          this.createHitEffect(hitPoint);
          this.playHitSound();
          this.showHitMarker();
        } else {
          this.createImpactEffect(hitPoint, closestHit.face.normal);
        }
      }
    } else {
      const endPoint = new THREE.Vector3().copy(weaponPosition).add(direction.multiplyScalar(this.data.range));
      this.createTracer(weaponPosition, endPoint);
    }

    this.el.emit('weapon-shot', { damage: this.data.damage });
    if (this.ammoInClip <= 0) this.reload();
  },

  playHitSound: function() {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, context.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.1, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start();
    oscillator.stop(context.currentTime + 0.1);
  },

  showHitMarker: function() {
    const crosshair = document.getElementById('crosshair');
    if (crosshair) {
      const originalColor = crosshair.style.color || 'white';
      crosshair.style.color = 'red';
      crosshair.style.fontSize = '24px';

      setTimeout(() => {
        crosshair.style.color = originalColor;
        crosshair.style.fontSize = '20px';
      }, 100);
    }
  },
  tick: function(time, delta) {
    if (this.ammoInClip < this.data.clipSize && !this.isReloading && document.pointerLockElement) {
      if (document.activeElement === document.body && (document.querySelector('r:active') || document.querySelector('R:active'))) {
        this.reload();
      }
    }
  },
  remove: function() {
    document.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mouseup', this.onMouseUp);
    if (this.reloadTimer) {
      clearTimeout(this.reloadTimer);
    }
    if (this.fireLoopId) {
      clearInterval(this.fireLoopId);
    }
  }
});