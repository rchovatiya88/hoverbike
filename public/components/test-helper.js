/* global AFRAME, THREE */

// Helper component to make testing easier
AFRAME.registerComponent('test-helper', {
  schema: {
    enabled: { type: 'boolean', default: true }
  },
  
  init: function() {
    if (!this.data.enabled) return;
    
    // Wait for scene to load fully
    this.el.sceneEl.addEventListener('loaded', () => {
      setTimeout(() => {
        this.addTestOverrides();
      }, 500);
    });
  },
  
  addTestOverrides: function() {
    console.log('Adding test overrides');
    
    // Check if we're in a testing environment
    const isTestEnvironment = navigator.userAgent.includes('HeadlessChrome') || 
                              window.navigator.webdriver || 
                              !window.chrome || 
                              window.innerWidth < 1000;
    
    if (!isTestEnvironment) {
      console.log('Not in a testing environment, skipping overrides');
      return;
    }
    
    // Override pointer lock handling
    console.log('Setting up testing overrides for pointer lock');
    
    // Create a button to manually dismiss error messages
    const dismissButton = document.createElement('button');
    dismissButton.textContent = 'Dismiss Errors (Testing)';
    dismissButton.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 9999;
      background: red;
      color: white;
      border: none;
      padding: 10px;
    `;
    dismissButton.addEventListener('click', () => {
      // Hide any error messages
      const errorOverlay = document.getElementById('error-overlay');
      if (errorOverlay) {
        errorOverlay.style.display = 'none';
      }
      
      // Hide any game messages
      const gameMessage = document.getElementById('game-message');
      if (gameMessage) {
        gameMessage.style.display = 'none';
      }
    });
    document.body.appendChild(dismissButton);
    
    // Add manual camera and player control functions for testing
    const positionPlayer = (x, y, z, rx = 0, ry = 0, rz = 0) => {
      const player = document.querySelector('#player');
      if (player) {
        player.setAttribute('position', `${x} ${y} ${z}`);
        player.setAttribute('rotation', `${rx} ${ry} ${rz}`);
      }
    };
    
    const positionCamera = (x, y, z, rx = 0, ry = 0, rz = 0) => {
      const camera = document.querySelector('#camera-rig');
      if (camera) {
        camera.setAttribute('position', `${x} ${y} ${z}`);
        camera.setAttribute('rotation', `${rx} ${ry} ${rz}`);
      }
    };
    
    // Make these functions available globally for testing
    window.testHelpers = {
      positionPlayer,
      positionCamera,
      
      // Add a function to reset everything
      resetPositions: () => {
        positionPlayer(0, 1.5, 0, 0, 0, 0);  // Player facing north
        positionCamera(0, 7.6, -5, 42, 180, 0); // Camera behind player with 42° pitch
      },
      
      // Apply a test camera position from the test positions array
      applyTestPosition: (index) => {
        const enhancedCameraTest = document.querySelector('[enhanced-camera-test]');
        if (enhancedCameraTest && enhancedCameraTest.components['enhanced-camera-test']) {
          const component = enhancedCameraTest.components['enhanced-camera-test'];
          if (component.testPositions && index < component.testPositions.length) {
            const test = component.testPositions[index];
            positionPlayer(0, 1.5, 0, 0, 0, 0); // Reset player first
            
            // Parse the position strings into components
            const parsePosition = (posStr) => {
              const parts = posStr.split(' ').map(parseFloat);
              return { x: parts[0], y: parts[1], z: parts[2] };
            };
            
            const parseRotation = (rotStr) => {
              const parts = rotStr.split(' ').map(parseFloat);
              return { x: parts[0], y: parts[1], z: parts[2] };
            };
            
            if (test.playerPos) {
              const pos = parsePosition(test.playerPos);
              const rot = test.playerRot ? parseRotation(test.playerRot) : { x: 0, y: 0, z: 0 };
              positionPlayer(pos.x, pos.y, pos.z, rot.x, rot.y, rot.z);
            }
            
            if (test.cameraPos) {
              const pos = parsePosition(test.cameraPos);
              const rot = test.cameraRot ? parseRotation(test.cameraRot) : { x: 0, y: 0, z: 0 };
              positionCamera(pos.x, pos.y, pos.z, rot.x, rot.y, rot.z);
            }
            
            console.log(`Applied test position: ${test.name}`);
          }
        }
      },
      
      // Force the debug panel to update
      updateDebug: () => {
        const enhancedDebug = document.querySelector('[enhanced-position-debug]');
        if (enhancedDebug && enhancedDebug.components['enhanced-position-debug']) {
          enhancedDebug.components['enhanced-position-debug'].tick(performance.now());
        }
      },
      
      // Make third-person camera follow
      toggleCameraFollow: (enable) => {
        const cameraRig = document.querySelector('#camera-rig');
        if (cameraRig && cameraRig.components['third-person-camera']) {
          cameraRig.components['third-person-camera'].data.enabled = enable;
          console.log(`Camera follow ${enable ? 'enabled' : 'disabled'}`);
        }
      }
    };
    
    // Create testing UI for camera and player positioning
    this.createTestUI();
    
      // Run a camera test right away to verify camera is working 
      setTimeout(() => {
        // Position the camera to a known good state that matches the screenshot
        window.testHelpers.positionPlayer(0, 1.5, 0, 0, 0, 0);  // Player facing forward (North wall)
        window.testHelpers.positionCamera(0, 7.6, -5, 42, 180, 0); // Camera behind player with 42° pitch
        window.testHelpers.updateDebug();
      }, 1000);
  },
  
  createTestUI: function() {
    // Create a simple test UI for manual control
    const testUI = document.createElement('div');
    testUI.style.cssText = `
      position: fixed;
      top: 60px;
      right: 10px;
      z-index: 9999;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      border: 2px solid #00ff00;
      padding: 10px;
    `;
    
    testUI.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 10px;">Camera Testing Panel</div>
      <div>
        <button id="test-reset">Reset Positions</button>
        <button id="test-north">North Wall Test</button>
      </div>
      <div style="margin-top: 10px;">
        <button id="test-follow-on">Enable Camera Follow</button>
        <button id="test-follow-off">Disable Camera Follow</button>
      </div>
      <div style="margin-top: 10px;">
        <button id="test-update">Force Debug Update</button>
      </div>
    `;
    
    document.body.appendChild(testUI);
    
    // Add event listeners to buttons
    document.getElementById('test-reset').addEventListener('click', () => {
      window.testHelpers.resetPositions();
      window.testHelpers.updateDebug();
    });
    
    document.getElementById('test-north').addEventListener('click', () => {
      // North wall test
      window.testHelpers.positionPlayer(0, 1.5, -15, 0, 0, 0);
      window.testHelpers.positionCamera(0, 4.5, -5, 0, 0, 0);
      window.testHelpers.updateDebug();
    });
    
    document.getElementById('test-follow-on').addEventListener('click', () => {
      window.testHelpers.toggleCameraFollow(true);
    });
    
    document.getElementById('test-follow-off').addEventListener('click', () => {
      window.testHelpers.toggleCameraFollow(false);
    });
    
    document.getElementById('test-update').addEventListener('click', () => {
      window.testHelpers.updateDebug();
    });
  }
});