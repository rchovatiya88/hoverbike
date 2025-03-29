
AFRAME.registerComponent('position-tracker', {
  schema: {
    target: {type: 'selector', default: '#player'},
    refreshRate: {type: 'number', default: 0.2} // Update frequency in seconds
  },
  
  init: function() {
    this.lastUpdate = 0;
  },
  
  tick: function(time, deltaTime) {
    // Only update periodically to avoid performance issues
    if ((time - this.lastUpdate) < (this.data.refreshRate * 1000)) {
      return;
    }
    
    this.lastUpdate = time;
    
    if (!this.data.target) return;
    
    // Get current player position
    var playerPosition = this.data.target.object3D.position;

    // Get current player velocity
    var playerVelocity = this.data.target.components['player-component'] ? 
      this.data.target.components['player-component'].velocity : null;
    
    var speed = playerVelocity ? Math.sqrt(
      playerVelocity.x * playerVelocity.x + 
      playerVelocity.y * playerVelocity.y + 
      playerVelocity.z * playerVelocity.z
    ).toFixed(2) : '0.00';

    // Update position tracker with altitude highlight for flying mode
    this.el.setAttribute('text', {
      value: 'X: ' + playerPosition.x.toFixed(2) + 
             '\nY: ' + playerPosition.y.toFixed(2) + ' ↑' +
             '\nZ: ' + playerPosition.z.toFixed(2) +
             '\nSpeed: ' + speed,
      width: 2,
      align: 'left'
    });
  }
});

// Get current player position
    var playerPosition = document.querySelector('[player-component]').object3D.position;

    // Get current player velocity
    var playerVelocity = document.querySelector('[player-component]').components['player-component'].velocity;
    var speed = playerVelocity ? Math.sqrt(
      playerVelocity.x * playerVelocity.x + 
      playerVelocity.y * playerVelocity.y + 
      playerVelocity.z * playerVelocity.z
    ).toFixed(2) : '0.00';

    // Update position tracker with altitude highlight for flying mode
    this.el.setAttribute('text', {
      value: 'X: ' + playerPosition.x.toFixed(2) + 
             '\nY: ' + playerPosition.y.toFixed(2) + ' ↑' +
             '\nZ: ' + playerPosition.z.toFixed(2) +
             '\nSpeed: ' + speed
    });
  }