AFRAME.registerComponent('weapon-component', {
    schema: {
        damage: { type: 'number', default: 25 }, // 25 damage = 4 hits to kill a 100 HP enemy
        cooldown: { type: 'number', default: 0.5 },
        range: { type: 'number', default: 100 },
        clipSize: { type: 'number', default: 30 },
        reloadTime: { type: 'number', default: 2 },
        automatic: { type: 'boolean', default: true },
        accuracy: { type: 'number', default: 0.98 } // High accuracy for better hit detection
    },
    init: function() {
        try {
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
        } catch (error) {
            console.error('Error initializing weapon component:', error);
        }
    },
    createWeaponModel: function() {
        try {
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
        } catch (error) {
            console.error('Error creating weapon model:', error);
        }
    },
    setupEventListeners: function() {
        try {
            this.onMouseDown = this.onMouseDown.bind(this);
            this.onMouseUp = this.onMouseUp.bind(this);
            document.addEventListener('mousedown', this.onMouseDown);
            document.addEventListener('mouseup', this.onMouseUp);
        } catch (error) {
            console.error('Error setting up event listeners:', error);
        }
    },
    onMouseDown: function(event) {
        try {
            if (!document.pointerLockElement) return;
            if (event.button !== 0) return;
            this.mouseDown = true;
            if (this.data.automatic) {
                this.startFiring();
            } else {
                this.shoot();
            }
        } catch (error) {
            console.error('Error on mouse down:', error);
        }
    },
    onMouseUp: function(event) {
        try {
            if (event.button !== 0) return;
            this.mouseDown = false;
            if (this.data.automatic) {
                this.stopFiring();
            }
        } catch (error) {
            console.error('Error on mouse up:', error);
        }
    },
    startFiring: function() {
        try {
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
        } catch (error) {
            console.error('Error starting automatic fire:', error);
        }
    },
    stopFiring: function() {
        try {
            if (this.fireLoopId !== null) {
                clearInterval(this.fireLoopId);
                this.fireLoopId = null;
            }
        } catch (error) {
            console.error('Error stopping automatic fire:', error);
        }
    },
    updateAmmoDisplay: function() {
        try {
            const ammoDisplay = document.getElementById('ammo-display');
            if (ammoDisplay) {
                if (this.isReloading) {
                    ammoDisplay.textContent = 'RELOADING...';
                } else {
                    ammoDisplay.textContent = `${this.ammoInClip} / ∞`;
                }
            }
        } catch (error) {
            console.error('Error updating ammo display:', error);
        }
    },
    reload: function() {
        try {
            if (this.isReloading) return;
            if (this.ammoInClip === this.data.clipSize) return;
            this.isReloading = true;
            this.updateAmmoDisplay();
            console.log('Reloading...');
            this.reloadTimer = setTimeout(() => {
                this.ammoInClip = this.data.clipSize;
                this.isReloading = false;
                this.updateAmmoDisplay();
                console.log('Reload complete.');
            }, this.data.reloadTime * 1000);
        } catch (error) {
            console.error('Error reloading weapon:', error);
        }
    },
    applyRecoil: function() {
        try {
            this.el.components.animation__recoil.beginAnimation();
            setTimeout(() => {
                this.el.components.animation__recover.beginAnimation();
            }, 50);
        } catch (error) {
            console.error('Error applying recoil:', error);
        }
    },
    createMuzzleFlash: function() {
        try {
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
        } catch (error) {
            console.error('Error creating muzzle flash:', error);
        }
    },
    createTracer: function(start, end) {
        try {
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
        } catch (error) {
            console.error('Error creating tracer:', error);
        }
    },
    createHitEffect: function(position) {
        try {
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
        } catch (error) {
            console.error('Error creating hit effect:', error);
        }
    },
    createImpactEffect: function(position, normal) {
        try {
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
        } catch (error) {
            console.error('Error creating impact effect:', error);
        }
    },
    shoot: function() {
        try {
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
            
            // Use weapon position as raycaster origin instead of camera position for better accuracy
            const camera = document.querySelector('a-camera').object3D;
            const weaponPosition = new THREE.Vector3();
            this.el.object3D.getWorldPosition(weaponPosition);
            
            // Add slight randomization based on accuracy parameter
            const accuracy = this.data.accuracy; // 1.0 = perfect accuracy, lower values = more spread
            const spread = 1.0 - accuracy;
            
            // Create base direction - ensure we're shooting straight forward
            const direction = new THREE.Vector3(0, 0, -1);
            direction.applyQuaternion(camera.quaternion);
            
            // Adjust direction to be more horizontal if it's too vertical
            if (Math.abs(direction.y) > 0.8) {
                console.log('Adjusting too vertical aim to be more horizontal');
                direction.y = Math.sign(direction.y) * 0.3; // Limit vertical component
                direction.normalize(); // Re-normalize after adjustment
            }
            
            // Add randomized spread based on accuracy - use smaller values for more precision
            if (spread > 0) {
                direction.x += (Math.random() - 0.5) * spread * 0.05; // Reduced spread
                direction.y += (Math.random() - 0.5) * spread * 0.05; // Reduced spread
                direction.z += (Math.random() - 0.5) * spread * 0.005; // Minimal spread in forward direction
                direction.normalize(); // Ensure it's still a unit vector
            }
            
            // Set raycaster with weapon position and direction
            this.raycaster.set(weaponPosition, direction);
            this.raycaster.far = this.data.range; // Explicitly set maximum range
            
            console.log('Firing weapon - Direction:', direction);
            
            // Collect all hittable targets
            const allTargets = [];
            
            // Get enemies using multiple methods for redundancy
            let enemies = [];
            
            // Method 1: Direct selector
            const enemyElements = document.querySelectorAll('[enemy-component]');
            enemyElements.forEach(enemy => {
                if (enemy.object3D) {
                    allTargets.push(enemy.object3D);
                    enemies.push(enemy);
                }
            });
            
            // Method 2: Get entities with hitbox component marked as enemies
            const hitboxElements = document.querySelectorAll('.hitbox-mesh[data-hitbox-type="enemy"]');
            hitboxElements.forEach(hitbox => {
                if (hitbox.object3D) {
                    allTargets.push(hitbox.object3D);
                }
            });
            
            // Method 3: Use registry if available
            if (window.HITBOX_REGISTRY) {
                window.HITBOX_REGISTRY.forEach(hitboxComponent => {
                    if (hitboxComponent.isEnemy && hitboxComponent.hitboxMesh) {
                        const hitboxObject = hitboxComponent.hitboxMesh.object3D;
                        if (hitboxObject) {
                            allTargets.push(hitboxObject);
                        }
                    }
                });
            }
            
            // Log enemy count for debugging
            console.log(`Found ${enemies.length} potential enemy targets and ${allTargets.length} total targets`);
            
            const obstacles = document.querySelectorAll('.obstacle, [ground]');
            obstacles.forEach(obstacle => {
                if (obstacle.object3D) allTargets.push(obstacle.object3D);
            });
            
            // Perform multiple raycasts with slight variations for more forgiving hit detection
            // Center ray
            const intersects = this.raycaster.intersectObjects(allTargets, true);
            
            // Extra rays with slight variations if the main ray missed
            let allRayIntersects = [];
            if (intersects.length > 0) {
                allRayIntersects = intersects;
            } else {
                // Try additional rays with small offsets if main ray missed
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
                        console.log('Hit detected with offset ray');
                        break;
                    }
                }
            }
            
            if (allRayIntersects.length > 0) {
                const closestHit = allRayIntersects[0];
                const hitPoint = closestHit.point;
                let hitEntity = null;
                let currentObj = closestHit.object;
                
                // Debug info for hit object
                console.log('Hit object:', currentObj);
                
                // Check if this is a hitbox mesh via userData
                if (currentObj.userData && currentObj.userData.ownerEntity) {
                    console.log('Direct hitbox reference found! Owner:', currentObj.userData.ownerEntity.id || 'unnamed');
                    hitEntity = currentObj.userData.ownerEntity;
                } 
                // Check if this is a hitbox via class or attributes
                else if (currentObj.el && (
                    currentObj.el.classList.contains('hitbox-mesh') ||
                    currentObj.el.classList.contains('enemy-hitbox') ||
                    currentObj.el.getAttribute('data-hitbox-type') === 'enemy'
                )) {
                    // Get owner ID from data attribute
                    const ownerId = currentObj.el.getAttribute('data-hitbox-owner');
                    console.log('Hitbox detected by class/attribute. Owner ID:', ownerId);
                    
                    // Try to find the owner entity
                    if (ownerId) {
                        const ownerEntity = document.getElementById(ownerId);
                        if (ownerEntity) {
                            hitEntity = ownerEntity;
                            console.log('Found owner entity by ID');
                        }
                    }
                    
                    // If we couldn't find the owner, use the direct parent
                    if (!hitEntity && currentObj.el.parentNode) {
                        let parent = currentObj.el.parentNode;
                        while (parent && !parent.hasAttribute('enemy-component')) {
                            parent = parent.parentNode;
                            if (!parent) break;
                        }
                        
                        if (parent && parent.hasAttribute('enemy-component')) {
                            hitEntity = parent;
                            console.log('Found owner entity by walking up DOM');
                        }
                    }
                }
                // Traditional walk up the parent chain to find the entity
                else while (currentObj && !hitEntity) {
                    if (currentObj.el) {
                        hitEntity = currentObj.el;
                        console.log('Found entity via object3D.el reference');
                        break;
                    }
                    if (!currentObj.parent) break;
                    currentObj = currentObj.parent;
                }
                
                // Enhanced hit detection
                if (hitEntity && closestHit.distance <= this.data.range) {
                    console.log('Hit entity:', hitEntity.id || 'unknown', 'Distance:', closestHit.distance.toFixed(2));
                    
                    // Check for enemy component directly
                    let enemyComponent = null;
                    if (hitEntity.hasAttribute('enemy-component')) {
                        enemyComponent = hitEntity.components['enemy-component'];
                    }
                    // Check if we hit a hitbox with a parent that has enemy-component
                    else if (currentObj.userData && currentObj.userData.isEnemyHitbox) {
                        console.log('Hit enemy via hitbox userData');
                        const ownerEntity = currentObj.userData.ownerEntity;
                        if (ownerEntity && ownerEntity.components && ownerEntity.components['enemy-component']) {
                            enemyComponent = ownerEntity.components['enemy-component'];
                        }
                    }
                    // Check parent nodes for enemy component
                    else {
                        let parent = hitEntity;
                        let attempts = 0;
                        while (parent && !enemyComponent && attempts < 3) {
                            if (parent.components && parent.components['enemy-component']) {
                                enemyComponent = parent.components['enemy-component'];
                                console.log('Found enemy component by traversing parents');
                            }
                            parent = parent.parentNode;
                            attempts++;
                        }
                    }
                    
                    // Apply damage if we found an enemy component
                    if (enemyComponent) {
                        console.log('HIT ENEMY - Applying damage:', this.data.damage);
                        try {
                            // Hit an enemy - pass hit position for effects
                            enemyComponent.takeDamage(this.data.damage, hitPoint);
                            this.createHitEffect(hitPoint);
                            // Add hit sound
                            this.playHitSound();
                            // Add screen hit marker (crosshair flash)
                            this.showHitMarker();
                        } catch (error) {
                            console.error('Error applying damage to enemy:', error);
                        }
                    } else {
                        // Hit an obstacle or environment
                        console.log('Hit environment at distance:', closestHit.distance.toFixed(2));
                        this.createImpactEffect(hitPoint, closestHit.face.normal);
                    }
                } else {
                    console.log('Hit outside of range or no entity');
                }
                
                this.createTracer(weaponPosition, hitPoint);
            } else {
                console.log('No hit detected');
                const endPoint = new THREE.Vector3().copy(weaponPosition).add(direction.multiplyScalar(this.data.range));
                this.createTracer(weaponPosition, endPoint);
            }
            
            this.el.emit('weapon-shot', { damage: this.data.damage });
            if (this.ammoInClip <= 0) this.reload();
        } catch (error) {
            console.error('Error shooting weapon:', error);
        }
    },
    
    playHitSound: function() {
        try {
            // Create a simple hit sound using the Web Audio API
            const context = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = context.createOscillator();
            const gainNode = context.createGain();
            
            // Configure sound
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(600, context.currentTime); // Higher pitch for hit
            oscillator.frequency.exponentialRampToValueAtTime(200, context.currentTime + 0.1); // Quick drop in pitch
            
            // Configure volume
            gainNode.gain.setValueAtTime(0.1, context.currentTime); // Low volume
            gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1); // Quick fade out
            
            // Connect nodes
            oscillator.connect(gainNode);
            gainNode.connect(context.destination);
            
            // Play the sound
            oscillator.start();
            oscillator.stop(context.currentTime + 0.1); // Stop after 100ms
        } catch (error) {
            console.error('Error playing hit sound:', error);
        }
    },
    
    showHitMarker: function() {
        try {
            // Flash the crosshair in red to indicate a hit
            const crosshair = document.getElementById('crosshair');
            if (crosshair) {
                const originalColor = crosshair.style.color || 'white';
                crosshair.style.color = 'red';
                crosshair.style.fontSize = '24px'; // Make it slightly larger
                
                // Reset after a short delay
                setTimeout(() => {
                    crosshair.style.color = originalColor;
                    crosshair.style.fontSize = '20px';
                }, 100);
            }
        } catch (error) {
            console.error('Error showing hit marker:', error);
        }
    },
    tick: function(time, delta) {
        // Check for 'R' key press to reload
        if (this.ammoInClip < this.data.clipSize && !this.isReloading && document.pointerLockElement) {
            if (document.activeElement === document.body && (document.querySelector('r:active') || document.querySelector('R:active'))) {
                this.reload();
            }
        }
    },
    remove: function() {
        try {
            document.removeEventListener('mousedown', this.onMouseDown);
            document.removeEventListener('mouseup', this.onMouseUp);
            if (this.reloadTimer) {
                clearTimeout(this.reloadTimer);
            }
            if (this.fireLoopId) {
                clearInterval(this.fireLoopId);
            }
        } catch (error) {
            console.error('Error removing weapon component:', error);
        }
    }
});