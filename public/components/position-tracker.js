
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

    // Get current player velocity and component
    var playerComponent = document.querySelector('[player-component]').components['player-component'];
    var playerVelocity = playerComponent ? playerComponent.velocity : null;
    
    // Calculate speed and display with different units based on value
    var speed = 0;
    var speedText = '0 km/h';
    if (playerVelocity) {
      speed = Math.sqrt(
        playerVelocity.x * playerVelocity.x + 
        playerVelocity.y * playerVelocity.y + 
        playerVelocity.z * playerVelocity.z
      );
      
      // Convert to km/h for display (arbitrary scaling factor)
      var speedKmh = (speed * 20).toFixed(0);
      speedText = speedKmh + ' km/h';
    }
    
    // Calculate vertical speed indicator
    var verticalSpeed = playerVelocity ? playerVelocity.y.toFixed(2) : '0.00';
    var verticalIndicator = '';
    if (parseFloat(verticalSpeed) > 0.1) {
      verticalIndicator = ' ↑';
    } else if (parseFloat(verticalSpeed) < -0.1) {
      verticalIndicator = ' ↓';
    }
    
    // Change color based on altitude
    var altitudeColor = '#fff';
    var altitude = playerPosition.y;
    if (altitude > 10) {
      altitudeColor = '#5df';
    } else if (altitude < 3) {
      altitudeColor = '#fd5';
    }
    
    // Format altitude with appropriate indicator
    var altitudeText = playerPosition.y.toFixed(1) + 'm' + verticalIndicator;

    // Update position tracker with enhanced flight information
    this.el.setAttribute('text', {
      value: 'POS: ' + playerPosition.x.toFixed(0) + ', ' + 
             playerPosition.z.toFixed(0) + 
             '\nALT: ' + altitudeText +
             '\nSPEED: ' + speedText,
      color: altitudeColor
    });
  }