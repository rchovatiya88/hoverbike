
/**
 * Position tracker component for tracking player position relative to walls
 */
AFRAME.registerComponent('position-tracker', {
  schema: {
    target: { type: 'selector', default: '#player' },
    showDebug: { type: 'boolean', default: true }
  },

  init: function() {
    this.playerPosition = new THREE.Vector3();
    
    // Create debug text if enabled
    if (this.data.showDebug) {
      this.debugEntity = document.createElement('a-entity');
      this.debugEntity.setAttribute('text', {
        value: 'Position: 0, 0, 0',
        align: 'center',
        width: 6,
        color: 'white',
        anchor: 'center'
      });
      this.debugEntity.setAttribute('position', '0 5 0');
      this.debugEntity.setAttribute('rotation', '0 0 0'); 
      this.debugEntity.setAttribute('billboard', '');
      this.el.sceneEl.appendChild(this.debugEntity);
    }
    
    console.log('Position tracker initialized');
  },

  tick: function() {
    if (!this.data.target) return;
    
    // Get player position
    this.data.target.object3D.getWorldPosition(this.playerPosition);
    
    // Calculate normalized X position between walls (-1 to 1)
    // Assuming walls are at -25 and 25 on X axis
    const normalizedX = this.playerPosition.x / 25;
    
    // Calculate Z position (forward/backward)
    const zPos = this.playerPosition.z;
    
    // Update debug text if enabled
    if (this.data.showDebug && this.debugEntity) {
      const xPercent = Math.round((normalizedX + 1) * 50); // Convert to 0-100%
      this.debugEntity.setAttribute('text', {
        value: `X: ${this.playerPosition.x.toFixed(1)} (${xPercent}%)\nZ: ${zPos.toFixed(1)}\nHeight: ${this.playerPosition.y.toFixed(1)}`,
      });
      this.debugEntity.object3D.position.copy(this.playerPosition);
      this.debugEntity.object3D.position.y += 2.5; // Position above player
    }
    
    // You can emit events based on position if needed
    // For example, when player is close to a wall
    if (Math.abs(normalizedX) > 0.9) {
      this.el.emit('near-wall', { side: normalizedX > 0 ? 'right' : 'left' });
    }
  }
});

// Billboard component to make text always face camera
AFRAME.registerComponent('billboard', {
  tick: function () {
    var camera = this.el.sceneEl.camera;
    if (!camera) return;
    
    // Make the entity face the camera
    this.el.object3D.lookAt(camera.position);
  }
});
