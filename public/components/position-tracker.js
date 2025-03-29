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