
AFRAME.registerComponent('hitbox-component', {
  init: function () {
    // Initialize hitbox
    this.el.hitbox = {
      width: 1,
      height: 1,
      depth: 1
    };
    
    // Get dimensions from geometry if available
    if (this.el.getAttribute('geometry')) {
      const geometry = this.el.getAttribute('geometry');
      this.el.hitbox.width = geometry.width || 1;
      this.el.hitbox.height = geometry.height || 1;
      this.el.hitbox.depth = geometry.depth || 1;
    }

    // Allow this entity to take damage
    this.el.takeDamage = (amount, source) => {
      // Emit event so other components can handle damage
      this.el.emit('damage', { amount: amount, source: source });
    };

    // Method to check for collision with another entity
    this.el.collidesWith = (otherEntity) => {
      if (!otherEntity || !otherEntity.object3D) return false;
      
      // Get world positions
      const position = new THREE.Vector3();
      const otherPosition = new THREE.Vector3();
      
      this.el.object3D.getWorldPosition(position);
      otherEntity.object3D.getWorldPosition(otherPosition);
      
      // Get hitbox dimensions (or defaults)
      const hitbox = this.el.hitbox || { width: 1, height: 1, depth: 1 };
      const otherHitbox = otherEntity.hitbox || { width: 1, height: 1, depth: 1 };
      
      // Check for overlap in all three dimensions
      return (
        Math.abs(position.x - otherPosition.x) < (hitbox.width + otherHitbox.width) / 2 &&
        Math.abs(position.y - otherPosition.y) < (hitbox.height + otherHitbox.height) / 2 &&
        Math.abs(position.z - otherPosition.z) < (hitbox.depth + otherHitbox.depth) / 2
      );
    };
  }
});

/**
 * Hitbox Component for A-Frame
 * 
 * This component creates a dedicated hitbox for raycasting detection.
 * It improves hit detection reliability by creating a simplified collision
 * volume that's easier for raycasters to hit than complex or nested objects.
 */
AFRAME.registerComponent('hitbox', {
    schema: {
        width: { type: 'number', default: 1 },
        height: { type: 'number', default: 1 },
        depth: { type: 'number', default: 1 },
        offset: { type: 'vec3', default: { x: 0, y: 0, z: 0 } },
        debug: { type: 'boolean', default: false }
    },
    
    init: function() {
        try {
            // Create the hitbox entity
            this.createHitbox();
            
            // Store initial position for updates
            this.lastPosition = new THREE.Vector3();
            this.lastPosition.copy(this.el.object3D.position);
            
            // Track if entity has enemy component
            this.isEnemy = this.el.hasAttribute('enemy-component');
            
            // Register with entity registry
            if (window.HITBOX_REGISTRY === undefined) {
                window.HITBOX_REGISTRY = [];
            }
            window.HITBOX_REGISTRY.push(this);
            
            console.log('Hitbox initialized for:', this.el.id || 'unnamed entity');
        } catch (error) {
            console.error('Error initializing hitbox:', error);
        }
    },
    
    createHitbox: function() {
        try {
            // Create a hitbox primitive
            const hitboxEntity = document.createElement('a-entity');
            hitboxEntity.classList.add('hitbox');
            
            // Position the hitbox
            const position = `${this.data.offset.x} ${this.data.offset.y + this.data.height/2} ${this.data.offset.z}`;
            hitboxEntity.setAttribute('position', position);
            
            // Add a simple box geometry
            const hitboxMesh = document.createElement('a-box');
            hitboxMesh.setAttribute('width', this.data.width);
            hitboxMesh.setAttribute('height', this.data.height);
            hitboxMesh.setAttribute('depth', this.data.depth);
            hitboxMesh.setAttribute('opacity', this.data.debug ? 0.2 : 0);
            hitboxMesh.setAttribute('color', this.isEnemy ? '#ff0000' : '#00ff00');
            hitboxMesh.setAttribute('class', 'hitbox-mesh');
            
            // Add data attributes for ray detection
            hitboxMesh.setAttribute('data-hitbox-owner', this.el.id || 'unnamed');
            hitboxMesh.setAttribute('data-hitbox-type', this.isEnemy ? 'enemy' : 'object');
            
            // Store direct reference to owner entity in THREE.js userData
            // This will be accessible during raycasting
            hitboxMesh.addEventListener('loaded', () => {
                if (hitboxMesh.object3D) {
                    hitboxMesh.object3D.userData.ownerEntity = this.el;
                    hitboxMesh.object3D.userData.isEnemyHitbox = this.isEnemy;
                    console.log('Hitbox mesh loaded with owner reference:', this.el.id || 'unnamed entity');
                }
            });
            
            // Add a specific class for easier selection
            if (this.isEnemy) {
                hitboxMesh.classList.add('enemy-hitbox');
            }
            
            // Add to entity
            hitboxEntity.appendChild(hitboxMesh);
            this.el.appendChild(hitboxEntity);
            
            // Store reference to hitbox
            this.hitboxEntity = hitboxEntity;
            this.hitboxMesh = hitboxMesh;
        } catch (error) {
            console.error('Error creating hitbox:', error);
        }
    },
    
    update: function() {
        try {
            if (!this.hitboxMesh) return;
            
            // Update hitbox dimensions and visibility
            this.hitboxMesh.setAttribute('width', this.data.width);
            this.hitboxMesh.setAttribute('height', this.data.height);
            this.hitboxMesh.setAttribute('depth', this.data.depth);
            this.hitboxMesh.setAttribute('opacity', this.data.debug ? 0.2 : 0);
            
            // Update position
            const position = `${this.data.offset.x} ${this.data.offset.y + this.data.height/2} ${this.data.offset.z}`;
            this.hitboxEntity.setAttribute('position', position);
        } catch (error) {
            console.error('Error updating hitbox:', error);
        }
    },
    
    tick: function() {
        try {
            // Update hitbox visibility based on entity state
            if (this.isEnemy && this.el.components['enemy-component']) {
                const enemyComponent = this.el.components['enemy-component'];
                if (enemyComponent.isDead && this.hitboxMesh) {
                    this.hitboxMesh.setAttribute('visible', false);
                }
            }
        } catch (error) {
            console.error('Error in hitbox tick:', error);
        }
    },
    
    remove: function() {
        try {
            // Remove from registry
            if (window.HITBOX_REGISTRY) {
                const index = window.HITBOX_REGISTRY.indexOf(this);
                if (index !== -1) {
                    window.HITBOX_REGISTRY.splice(index, 1);
                }
            }
            
            // Clean up
            if (this.hitboxEntity && this.hitboxEntity.parentNode) {
                this.hitboxEntity.parentNode.removeChild(this.hitboxEntity);
            }
        } catch (error) {
            console.error('Error removing hitbox:', error);
        }
    }
});