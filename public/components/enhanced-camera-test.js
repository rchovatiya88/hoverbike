/* global AFRAME, THREE */

AFRAME.registerComponent('enhanced-camera-test', {
  schema: {
    enabled: { type: 'boolean', default: true },
    showDebugUI: { type: 'boolean', default: true }
  },
  
  init: function() {
    // Bind handlers
    this.handleKeyDown = this.handleKeyDown.bind(this);
    
    // Wait for scene to be ready before adding event listeners
    this.el.sceneEl.addEventListener('loaded', () => {
      // Add keyboard event listener
      window.addEventListener('keydown', this.handleKeyDown);
      console.log('Enhanced camera test component initialized');
    });
    
    // Create debug GUI if it doesn't exist
    this.createDebugUI();
    
    // Test positions array - different camera and player configurations
    this.testPositions = [
      { 
        name: "North Wall (Front)",
        description: "Player facing north wall (blue) from center",
        playerPos: '0 1.5 0', 
        playerRot: '0 0 0',
        cameraPos: '0 4.5 12', 
        cameraRot: '0 180 0',
        cameraOffset: 'Behind player',
        key: '1'
      },
      { 
        name: "South Wall (Back)",
        description: "Player facing south wall (red) from center", 
        playerPos: '0 1.5 0', 
        playerRot: '0 180 0',
        cameraPos: '0 4.5 -12', 
        cameraRot: '0 0 0',
        cameraOffset: 'Behind player',
        key: '2'
      },
      { 
        name: "East Wall (Right)",
        description: "Player facing east wall (green) from center", 
        playerPos: '0 1.5 0', 
        playerRot: '0 -90 0',
        cameraPos: '12 4.5 0', 
        cameraRot: '0 90 0',
        cameraOffset: 'Behind player',
        key: '3'
      },
      { 
        name: "West Wall (Left)",
        description: "Player facing west wall (yellow) from center", 
        playerPos: '0 1.5 0', 
        playerRot: '0 90 0',
        cameraPos: '-12 4.5 0', 
        cameraRot: '0 -90 0',
        cameraOffset: 'Behind player',
        key: '4'
      },
      { 
        name: "North Corner Test",
        description: "Player in north corner looking diagonally", 
        playerPos: '-20 1.5 -20', 
        playerRot: '0 45 0',
        cameraPos: '-26 4.5 -26', 
        cameraRot: '0 45 0',
        cameraOffset: 'Behind player at angle',
        key: '5'
      },
      { 
        name: "High Altitude Test",
        description: "Player at high altitude looking down", 
        playerPos: '0 20 0', 
        playerRot: '30 0 0',
        cameraPos: '0 28 12', 
        cameraRot: '30 0 0',
        cameraOffset: 'Above and behind player',
        key: '6'
      },
      { 
        name: "Low Flight Test",
        description: "Player just above ground", 
        playerPos: '0 0.8 0', 
        playerRot: '0 0 0',
        cameraPos: '0 2.5 12', 
        cameraRot: '-5 0 0',
        cameraOffset: 'Low behind player',
        key: '7'
      },
      { 
        name: "Camera Circle Test",
        description: "Camera circles around player (animated)",
        playerPos: '0 1.5 0', 
        playerRot: '0 0 0',
        cameraPos: '0 4.5 12', 
        cameraRot: '0 0 0',
        cameraOffset: 'Orbiting player',
        key: '8',
        animate: true,
        animationType: 'circle'
      }
    ];
    
    // Initialize animation parameters
    this.animating = false;
    this.animationStartTime = 0;
    this.animationType = null;
    this.animationDuration = 5000; // 5 seconds for a full animation cycle
    
    console.log("Enhanced camera test component initialized. Press 1-8 to test different camera positions.");
  },
  
  createDebugUI: function() {
    if (!this.data.showDebugUI) return;
    
    let debugOverlay = document.getElementById('camera-test-overlay');
    
    if (!debugOverlay) {
      debugOverlay = document.createElement('div');
      debugOverlay.id = 'camera-test-overlay';
      debugOverlay.style.cssText = `
        position: absolute;
        top: 200px;
        left: 20px;
        background-color: rgba(0,0,0,0.7);
        color: white;
        padding: 10px;
        border-radius: 5px;
        font-family: monospace;
        z-index: 1000;
        border: 2px solid #42aaf5;
        max-width: 300px;
      `;
      
      debugOverlay.innerHTML = `
        <div><strong>Camera Test Controls:</strong></div>
        <div style="margin-top: 5px; margin-bottom: 5px;">Press keys 1-8 to test different camera positions</div>
        <div>Current Test: <span id="current-test">None</span></div>
        <div>Player Position: <span id="test-player-pos">N/A</span></div>
        <div>Camera Position: <span id="test-camera-pos">N/A</span></div>
        <div>Camera Offset: <span id="test-camera-offset">N/A</span></div>
        <div style="margin-top: 10px;">
          <button id="toggle-camera-follow">Toggle Camera Follow</button>
        </div>
      `;
      
      document.body.appendChild(debugOverlay);
      
      // Add event listener for the toggle button
      document.getElementById('toggle-camera-follow').addEventListener('click', () => {
        this.toggleCameraFollow();
      });
    }
  },
  
  toggleCameraFollow: function() {
    const cameraRig = document.querySelector('#camera-rig');
    const thirdPersonComponent = cameraRig.components['third-person-camera'];
    
    if (thirdPersonComponent) {
      // Toggle the component's enabled state
      const currentState = thirdPersonComponent.data.enabled !== false;
      thirdPersonComponent.data.enabled = !currentState;
      
      // Update UI
      document.getElementById('toggle-camera-follow').textContent = 
        thirdPersonComponent.data.enabled ? 'Disable Camera Follow' : 'Enable Camera Follow';
      
      this.showNotification(
        thirdPersonComponent.data.enabled ? 'Camera Following Enabled' : 'Camera Following Disabled',
        thirdPersonComponent.data.enabled ? 'Camera will automatically follow the player' : 'Camera position is fixed'
      );
    }
  },
  
  updateDebugUI: function(testConfig) {
    if (!this.data.showDebugUI) return;
    
    const currentTest = document.getElementById('current-test');
    const playerPos = document.getElementById('test-player-pos');
    const cameraPos = document.getElementById('test-camera-pos');
    const cameraOffset = document.getElementById('test-camera-offset');
    
    if (currentTest) currentTest.textContent = testConfig ? testConfig.name : 'None';
    if (playerPos) playerPos.textContent = testConfig ? testConfig.playerPos : 'N/A';
    if (cameraPos) cameraPos.textContent = testConfig ? testConfig.cameraPos : 'N/A';
    if (cameraOffset) cameraOffset.textContent = testConfig ? testConfig.cameraOffset : 'N/A';
  },
  
  handleKeyDown: function(e) {
    const key = e.key;
    
    // Find test position that matches the pressed key
    const testConfig = this.testPositions.find(test => test.key === key);
    
    if (testConfig) {
      this.applyTestPosition(testConfig);
      
      // If this is an animated test, start the animation
      if (testConfig.animate) {
        this.startAnimation(testConfig.animationType);
      } else {
        this.stopAnimation();
      }
    }
    
    // Reset position with 'R' key
    if (key === 'r' || key === 'R') {
      this.resetPosition();
      this.stopAnimation();
    }
    
    // Special test for north wall with 'N' key
    if (key === 'n' || key === 'N') {
      this.northWallTest();
      this.stopAnimation();
    }
  },
  
  applyTestPosition: function(testConfig) {
    // Don't apply test position if scene isn't loaded
    if (!this.el.sceneEl.hasLoaded) {
      console.warn('Scene not fully loaded, cannot apply test position');
      return;
    }
    
    const cameraRig = document.querySelector('#camera-rig');
    const player = document.querySelector('#player');
    
    if (!cameraRig || !player) {
      console.warn('Camera rig or player not found');
      return;
    }
    
    // Make sure third-person-camera component is temporarily disabled
    // to prevent it from overriding our test positions
    if (cameraRig.components['third-person-camera']) {
      cameraRig.components['third-person-camera'].data.enabled = false;
    }
    
    // Apply positions and rotations
    if (testConfig.playerPos) {
      player.setAttribute('position', testConfig.playerPos);
    }
    
    if (testConfig.playerRot) {
      player.setAttribute('rotation', testConfig.playerRot);
    }
    
    if (testConfig.cameraPos) {
      cameraRig.setAttribute('position', testConfig.cameraPos);
    }
    
    if (testConfig.cameraRot) {
      cameraRig.setAttribute('rotation', testConfig.cameraRot);
    }
    
    // Update debug UI
    this.updateDebugUI(testConfig);
    
    // Show test notification
    this.showNotification(
      `Camera Test: ${testConfig.name}`,
      testConfig.description || 'Testing camera position and orientation'
    );
    
    console.log(`Camera test applied: ${testConfig.name}`);
  },
  
  resetPosition: function() {
    const cameraRig = document.querySelector('#camera-rig');
    const player = document.querySelector('#player');
    
    // Reset to default positions
    player.setAttribute('position', '0 1.5 0');
    player.setAttribute('rotation', '0 0 0');
    
    // Re-enable third-person camera
    if (cameraRig.components['third-person-camera']) {
      cameraRig.components['third-person-camera'].data.enabled = true;
    }
    
    this.showNotification('Position Reset', 'Player and camera returned to starting position');
    this.updateDebugUI(null);
  },
  
  northWallTest: function() {
    const player = document.querySelector('#player');
    const cameraRig = document.querySelector('#camera-rig');
    
    // Disable third-person camera
    if (cameraRig.components['third-person-camera']) {
      cameraRig.components['third-person-camera'].data.enabled = false;
    }
    
    // Position player in front of north wall
    player.setAttribute('position', '0 1.5 -15');
    player.setAttribute('rotation', '0 0 0');
    
    // Position camera behind player
    cameraRig.setAttribute('position', '0 4.5 -5');
    cameraRig.setAttribute('rotation', '0 180 0');
    
    this.showNotification('North Wall Test', 'Player positioned close to north wall (blue)');
    
    // Update debug UI with custom values for this test
    const testConfig = {
      name: "North Wall Close-up",
      playerPos: '0 1.5 -15',
      playerRot: '0 0 0',
      cameraPos: '0 4.5 -5',
      cameraRot: '0 180 0',
      cameraOffset: 'Behind player, near wall'
    };
    
    this.updateDebugUI(testConfig);
  },
  
  startAnimation: function(type) {
    this.animating = true;
    this.animationStartTime = performance.now();
    this.animationType = type;
    
    // Show notification
    this.showNotification(
      'Animation Started', 
      `Camera is now animating in ${type} pattern. Press R to stop.`
    );
  },
  
  stopAnimation: function() {
    if (this.animating) {
      this.animating = false;
      console.log('Animation stopped');
    }
  },
  
  updateAnimation: function(time) {
    if (!this.animating) return;
    
    const player = document.querySelector('#player');
    const cameraRig = document.querySelector('#camera-rig');
    
    // Calculate animation progress (0 to 1)
    const elapsed = time - this.animationStartTime;
    const progress = (elapsed % this.animationDuration) / this.animationDuration;
    
    switch (this.animationType) {
      case 'circle':
        // Orbit camera around player
        const angle = progress * Math.PI * 2; // 0 to 2π
        const radius = 12; // Distance from player
        
        // Calculate new camera position in a circle around player
        const x = Math.sin(angle) * radius;
        const z = Math.cos(angle) * radius;
        
        // Get player position
        const playerPos = player.object3D.position;
        
        // Set camera position relative to player
        cameraRig.setAttribute('position', {
          x: playerPos.x + x,
          y: playerPos.y + 3, // Slightly above player
          z: playerPos.z + z
        });
        
        // Make camera look at player
        cameraRig.object3D.lookAt(playerPos);
        break;
    }
  },
  
  showNotification: function(title, message) {
    const gameMessage = document.getElementById('game-message');
    if (gameMessage) {
      gameMessage.style.display = 'block';
      gameMessage.innerHTML = `
        <strong>Camera Test: ${title}</strong>
        <br>${message}
        <br>
        <button id="close-test">Close</button>
      `;
      
      document.getElementById('close-test').addEventListener('click', function() {
        gameMessage.style.display = 'none';
      });
    }
  },
  
  tick: function(time) {
    // Update animation if active
    if (this.animating) {
      this.updateAnimation(time);
    }
  }
});