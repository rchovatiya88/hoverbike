
// Utility Functions for A-Frame Game

// Convert degrees to radians
function degToRad(degrees) {
  return degrees * (Math.PI / 180);
}

// Convert radians to degrees
function radToDeg(radians) {
  return radians * (180 / Math.PI);
}

// Get random number within range
function getRandomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

// Get random integer within range
function getRandomIntInRange(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Calculate distance between two A-Frame entities
function getDistance(entity1, entity2) {
  const pos1 = entity1.object3D.position;
  const pos2 = entity2.object3D.position;
  
  return Math.sqrt(
    Math.pow(pos1.x - pos2.x, 2) +
    Math.pow(pos1.y - pos2.y, 2) +
    Math.pow(pos1.z - pos2.z, 2)
  );
}

// Get normalized direction vector from one entity to another
function getDirectionVector(fromEntity, toEntity) {
  const fromPos = fromEntity.object3D.position;
  const toPos = toEntity.object3D.position;
  
  const direction = new THREE.Vector3(
    toPos.x - fromPos.x,
    toPos.y - fromPos.y,
    toPos.z - fromPos.z
  );
  
  return direction.normalize();
}

// Create particle effect at position
function createParticles(scene, position, color, count, lifespan) {
  for (let i = 0; i < count; i++) {
    const particle = document.createElement('a-entity');
    
    // Random direction
    const angle1 = Math.random() * Math.PI * 2;
    const angle2 = Math.random() * Math.PI * 2;
    const speed = Math.random() * 2 + 1;
    
    const velocity = new THREE.Vector3(
      Math.cos(angle1) * Math.cos(angle2) * speed,
      Math.sin(angle2) * speed,
      Math.sin(angle1) * Math.cos(angle2) * speed
    );
    
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
        particle.removeEventListener('ticks', tick);
      }
    };
    
    particle.addEventListener('ticks', tick);
    
    // Ensure cleanup
    setTimeout(() => {
      if (particle.parentNode) {
        scene.removeChild(particle);
      }
    }, lifespan);
  }
}

(function() {
    if (!AFRAME.components['particle-system']) {
        AFRAME.registerComponent('particle-system', {
            schema: {
                preset: { type: 'string', default: 'dust' },
                particleCount: { type: 'number', default: 20 },
                color: { type: 'string', default: '#fff' },
                size: { type: 'number', default: 0.1 },
                duration: { type: 'number', default: 1 },
                direction: { type: 'string', default: 'random' },
                velocity: { type: 'number', default: 1 },
                directionVector: { type: 'vec3', default: { x: 0, y: 0, z: 0 } },
                spread: { type: 'number', default: 1 }
            },
            init: function() {
                try {
                    const system = this.createParticles();
                    this.el.setObject3D('particle-system', system);
                    setTimeout(() => {
                        if (this.el && this.el.parentNode) {
                            this.el.parentNode.removeChild(this.el);
                        }
                    }, this.data.duration * 1000 + 100);
                } catch (error) {
                    console.error('Error initializing particle system:', error);
                }
            },
            createParticles: function() {
                const group = new THREE.Group();
                const count = this.data.particleCount;
                const size = typeof this.data.size === 'number' ? this.data.size : parseFloat(this.data.size);
                
                // Handle color as either a single color or a comma-separated list
                let colors = [];
                if (typeof this.data.color === 'string') {
                    if (this.data.color.includes(',')) {
                        colors = this.data.color.split(',').map(c => c.trim());
                    } else {
                        colors = [this.data.color.trim()];
                    }
                } else {
                    colors = ['#fff']; // Default fallback
                }
                
                const directionVector = new THREE.Vector3(this.data.directionVector.x, this.data.directionVector.y, this.data.directionVector.z);
                const spread = this.data.spread;
                for (let i = 0; i < count; i++) {
                    const geometry = new THREE.SphereGeometry(size * Math.random() * 0.5, 4, 4);
                    const color = colors[Math.floor(Math.random() * colors.length)];
                    const material = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: Math.random() * 0.5 + 0.5 });
                    const particle = new THREE.Mesh(geometry, material);
                    particle.position.set((Math.random() - 0.5) * size * 2, (Math.random() - 0.5) * size * 2, (Math.random() - 0.5) * size * 2);
                    let vx, vy, vz;
                    if (this.data.direction === 'random') {
                        vx = directionVector.x + (Math.random() - 0.5) * this.data.velocity;
                        vy = directionVector.y + (Math.random() - 0.5) * this.data.velocity;
                        vz = directionVector.z + (Math.random() - 0.5) * this.data.velocity;
                    } else if (this.data.direction === 'normal') {
                        vx = directionVector.x + (Math.random() - 0.5) * this.data.velocity * 0.3;
                        vy = directionVector.y + (Math.random() - 0.5) * this.data.velocity * 0.3;
                        vz = directionVector.z + Math.random() * this.data.velocity;
                    }
                    vx += (Math.random() - 0.5) * spread;
                    vy += (Math.random() - 0.5) * spread;
                    vz += (Math.random() - 0.5) * spread;
                    particle.userData.velocity = new THREE.Vector3(vx, vy, vz);
                    particle.userData.initialOpacity = material.opacity;
                    particle.userData.initialScale = particle.scale.x;
                    group.add(particle);
                }
                const duration = this.data.duration;
                const startTime = performance.now();
                const animateParticles = () => {
                    try {
                        const elapsedTime = (performance.now() - startTime) / 1000;
                        const progress = Math.min(elapsedTime / duration, 1);
                        group.children.forEach(particle => {
                            particle.position.x += particle.userData.velocity.x * 0.016;
                            particle.position.y += particle.userData.velocity.y * 0.016;
                            particle.position.z += particle.userData.velocity.z * 0.016;
                            particle.material.opacity = particle.userData.initialOpacity * (1 - progress);
                            const scale = particle.userData.initialScale * (1 - progress * 0.5);
                            particle.scale.set(scale, scale, scale);
                        });
                        if (progress < 1 && this.el && this.el.parentNode) {
                            requestAnimationFrame(animateParticles);
                        }
                    } catch (error) {
                        console.error('Error animating particles:', error);
                    }
                };
                requestAnimationFrame(animateParticles);
                return group;
            },
            remove: function() {
                try {
                    if (this.el) {
                        this.el.removeObject3D('particle-system');
                    }
                } catch (error) {
                    console.error('Error removing particle system:', error);
                }
            }
        });
    }
    window.GAME_UTILS = {
        randomVector: function(min, max) {
            return new THREE.Vector3(
                min.x + Math.random() * (max.x - min.x),
                min.y + Math.random() * (max.y - min.y),
                min.z + Math.random() * (max.z - min.z)
            );
        },
        distanceBetween: function(entity1, entity2) {
            if (!entity1 || !entity2 || !entity1.object3D || !entity2.object3D) {
                return Infinity;
            }
            const pos1 = entity1.object3D.position;
            const pos2 = entity2.object3D.position;
            return pos1.distanceTo(pos2);
        },
        formatNumber: function(num) {
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        },
        isInView: function(camera, object, fov) {
            if (!camera || !object) return false;
            const cameraPos = camera.object3D.position;
            const objPos = object.object3D.position;
            const dirToObj = new THREE.Vector3().subVectors(objPos, cameraPos).normalize();
            const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.object3D.quaternion).normalize();
            const dot = dirToObj.dot(camForward);
            return dot > Math.cos(fov * Math.PI / 180);
        }
    };
})();