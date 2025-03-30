/* global AFRAME, THREE */

AFRAME.registerComponent('control-mode-tester', {
  schema: {
    player: { type: 'selector', default: '#player' },
    camera: { type: 'selector', default: '#camera-rig' },
    enabled: { type: 'boolean', default: true }
  },
  
  init: function() {
    if (!this.data.enabled) return;
    
    // Wait for scene to be loaded
    this.el.sceneEl.addEventListener('loaded', () => {
      setTimeout(() => {
        this.initControlModes();
      }, 1000);
    });
  },
  
  initControlModes: function() {
    
    // Control mode definitions
    this.controlModes = {
      standard: {
        name: 'Standard',
        description: 'Default third-person control, camera follows behind player',
        cameraProperties: {
          distance: 12,
          height: 4.5,
          lookAtHeight: 1.5,
          damping: 0.3
        },
        playerProperties: {
          speed: 5,
          boostSpeed: 10,
          damping: 0.9
        }
      },
      close: {
        name: 'Close Follow',
        description: 'Camera follows closely behind player',
        cameraProperties: {
          distance: 6,
          height: 2.5,
          lookAtHeight: 1.0,
          damping: 0.5
        },
        playerProperties: {
          speed: 4,
          boostSpeed: 8,
          damping: 0.9
        }
      },
      cinematic: {
        name: 'Cinematic',
        description: 'Wider angle, slower camera movement',
        cameraProperties: {
          distance: 15,
          height: 6,
          lookAtHeight: 1.5,
          damping: 0.1
        },
        playerProperties: {
          speed: 5,
          boostSpeed: 12,
          damping: 0.95
        }
      },
      racing: {
        name: 'Racing',
        description: 'Lower camera angle, faster movement',
        cameraProperties: {
          distance: 10,
          height: 2,
          lookAtHeight: 0.5,
          damping: 0.4
        },
        playerProperties: {
          speed: 6,
          boostSpeed: 15,
          damping: 0.8
        }
      },
      topDown: {
        name: 'Top-Down',
        description: 'Bird\'s eye view of player',
        cameraProperties: {
          distance: 0,
          height: 20,
          lookAtHeight: 0,
          damping: 0.3
        },
        playerProperties: {
          speed: 5,
          boostSpeed: 10,
          damping: 0.9
        }
      },
      firstPerson: {
        name: 'First-Person',
        description: 'Camera positioned at player\'s head',
        cameraProperties: {
          distance: 0.1,
          height: 0.5,
          lookAtHeight: 0.5,
          damping: 1.0
        },
        playerProperties: {
          speed: 5,
          boostSpeed: 10,
          damping: 0.9
        }
      }
    };
    
    // Create UI for selecting control modes
    this.createControlUI();
    
    // Bind key handlers
    this.onKeyDown = this.onKeyDown.bind(this);
    window.addEventListener('keydown', this.onKeyDown);
    
    console.log('Control mode tester initialized. Press F1-F6 to test different control modes.');
  },
  
  onKeyDown: function(e) {
    // F1-F6 keys to switch control modes
    const functionKeys = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'];
    const index = functionKeys.indexOf(e.key);
    
    if (index >= 0) {
      const modeNames = Object.keys(this.controlModes);
      if (index < modeNames.length) {
        this.applyControlMode(modeNames[index]);
      }
    }
    
    // M key to toggle control mode UI
    if (e.key === 'm' || e.key === 'M') {
      this.toggleControlUI();
    }
  },
  
  createControlUI: function() {
    // Create UI for selecting control modes
    const controlUI = document.createElement('div');
    controlUI.id = 'control-mode-ui';
    controlUI.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 20px;
      background-color: rgba(0,0,0,0.7);
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-family: sans-serif;
      z-index: 1000;
      border: 2px solid #42aaf5;
      display: none;
    `;
    
    // Create header
    const header = document.createElement('div');
    header.innerHTML = '<strong>Control Modes (Press M to toggle)</strong>';
    header.style.marginBottom = '10px';
    controlUI.appendChild(header);
    
    // Create buttons for each control mode
    const modeNames = Object.keys(this.controlModes);
    for (let i = 0; i < modeNames.length; i++) {
      const mode = modeNames[i];
      const modeData = this.controlModes[mode];
      
      const button = document.createElement('button');
      button.textContent = `${modeData.name} (F${i+1})`;
      button.style.cssText = `
        display: block;
        margin: 5px 0;
        padding: 5px 10px;
        background-color: #4287f5;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        width: 100%;
        text-align: left;
      `;
      
      button.addEventListener('click', () => {
        this.applyControlMode(mode);
      });
      
      controlUI.appendChild(button);
      
      // Add description
      const description = document.createElement('div');
      description.textContent = modeData.description;
      description.style.cssText = `
        font-size: 0.8em;
        margin-bottom: 10px;
        color: #ccc;
      `;
      controlUI.appendChild(description);
    }
    
    document.body.appendChild(controlUI);
  },
  
  toggleControlUI: function() {
    const controlUI = document.getElementById('control-mode-ui');
    if (controlUI) {
      controlUI.style.display = controlUI.style.display === 'none' ? 'block' : 'none';
    }
  },
  
  applyControlMode: function(modeName) {
    if (!this.controlModes[modeName]) return;
    
    // Don't apply mode if scene isn't loaded
    if (!this.el.sceneEl.hasLoaded) {
      console.warn('Scene not fully loaded, cannot apply control mode');
      return;
    }
    
    const mode = this.controlModes[modeName];
    const cameraRig = this.data.camera;
    const player = this.data.player;
    
    if (!cameraRig || !player) {
      console.warn('Camera rig or player not found');
      return;
    }
    
    // Apply camera settings
    if (cameraRig && cameraRig.components['third-person-camera']) {
      const thirdPersonComponent = cameraRig.components['third-person-camera'];
      
      // Ensure component is enabled
      thirdPersonComponent.data.enabled = true;
      
      // Apply camera properties
      for (const [key, value] of Object.entries(mode.cameraProperties)) {
        thirdPersonComponent.data[key] = value;
      }
      
      console.log(`Applied camera settings for ${mode.name} mode`);
    }
    
    // Apply player settings
    if (player && player.components['player-component']) {
      const playerComponent = player.components['player-component'];
      
      // Apply player properties
      for (const [key, value] of Object.entries(mode.playerProperties)) {
        playerComponent.data[key] = value;
      }
      
      console.log(`Applied player settings for ${mode.name} mode`);
    }
    
    // Show notification
    this.showNotification(
      `Control Mode: ${mode.name}`,
      mode.description
    );
    
    // Special case for first-person mode
    if (modeName === 'firstPerson') {
      this.setupFirstPersonMode();
    }
    
    // Update UI to show active mode
    this.updateActiveMode(modeName);
  },
  
  updateActiveMode: function(modeName) {
    const controlUI = document.getElementById('control-mode-ui');
    if (!controlUI) return;
    
    // Reset all buttons
    const buttons = controlUI.querySelectorAll('button');
    buttons.forEach(button => {
      button.style.backgroundColor = '#4287f5';
    });
    
    // Highlight active mode
    const modeIndex = Object.keys(this.controlModes).indexOf(modeName);
    if (modeIndex >= 0 && buttons[modeIndex]) {
      buttons[modeIndex].style.backgroundColor = '#42f587';
    }
  },
  
  setupFirstPersonMode: function() {
    const cameraRig = this.data.camera;
    const player = this.data.player;
    
    if (!cameraRig || !player) return;
    
    // Position camera rig directly on player model
    const playerPos = player.object3D.position;
    
    // Set camera position to be just ahead of player model for first-person perspective
    cameraRig.setAttribute('position', {
      x: playerPos.x,
      y: playerPos.y + 1.0, // eye level
      z: playerPos.z - 0.5  // slightly forward to avoid clipping with player model
    });
    
    // Make player model slightly transparent in first-person mode
    // to avoid blocking the camera view
    this.setPlayerModelTransparency(0.5);
  },
  
  setPlayerModelTransparency: function(opacity) {
    const player = this.data.player;
    if (!player) return;
    
    // Loop through all meshes in the player model and set opacity
    player.object3D.traverse(node => {
      if (node.isMesh && node.material) {
        // Handle both single materials and material arrays
        if (Array.isArray(node.material)) {
          node.material.forEach(mat => {
            mat.transparent = opacity < 1.0;
            mat.opacity = opacity;
          });
        } else {
          node.material.transparent = opacity < 1.0;
          node.material.opacity = opacity;
        }
      }
    });
  },
  
  showNotification: function(title, message) {
    const gameMessage = document.getElementById('game-message');
    if (gameMessage) {
      gameMessage.style.display = 'block';
      gameMessage.innerHTML = `
        <strong>${title}</strong>
        <br>${message}
        <br>
        <button id="close-notification">Close</button>
      `;
      
      document.getElementById('close-notification').addEventListener('click', function() {
        gameMessage.style.display = 'none';
      });
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        if (gameMessage.style.display === 'block') {
          gameMessage.style.display = 'none';
        }
      }, 3000);
    }
  },
  
  remove: function() {
    // Clean up event listeners
    window.removeEventListener('keydown', this.onKeyDown);
    
    // Remove UI
    const controlUI = document.getElementById('control-mode-ui');
    if (controlUI) {
      controlUI.remove();
    }
    
    // Reset player model transparency
    this.setPlayerModelTransparency(1.0);
  }
});