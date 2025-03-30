/* global AFRAME, THREE */

AFRAME.registerComponent('enhanced-position-debug', {
  schema: {
    player: {type: 'selector', default: '#player'},
    camera: {type: 'selector', default: '#camera-rig'},
    refreshRate: {type: 'number', default: 0.1}, // Update frequency in seconds
    showTrajectory: {type: 'boolean', default: true}, // Show movement trajectory
    showBoundaries: {type: 'boolean', default: true} // Show environment boundaries
  },
  
  init: function() {
    this.lastUpdate = 0;
    this.lastPlayerPos = new THREE.Vector3();
    this.playerHistory = []; // Store recent positions for trajectory
    this.maxHistoryPoints = 50; // Maximum number of points to store
    
    // Create or get debug UI elements
    this.setupDebugUI();
    
    // Create visual trajectory if enabled
    if (this.data.showTrajectory) {
      this.setupTrajectory();
    }
    
    // Create boundary indicators if enabled
    if (this.data.showBoundaries) {
      this.setupBoundaryIndicators();
    }
    
    // Add distance display
    this.setupDistanceUI();
    
    console.log("Enhanced position debug component initialized");
  },
  
  setupDebugUI: function() {
    // Get references to existing debug UI elements or create new ones
    this.debugElements = {
      playerPos: document.getElementById('player-pos') || this.createDebugElement('player-pos'),
      playerRot: document.getElementById('player-rot') || this.createDebugElement('player-rot'),
      cameraPos: document.getElementById('camera-pos') || this.createDebugElement('camera-pos'),
      cameraRot: document.getElementById('camera-rot') || this.createDebugElement('camera-rot'),
      playerVel: this.createDebugElement('player-vel'),
      relativePos: this.createDebugElement('relative-pos'),
      distToGround: this.createDebugElement('dist-to-ground'),
      distToWalls: this.createDebugElement('dist-to-walls')
    };
    
    // Ensure we have a debug overlay
    let debugOverlay = document.getElementById('enhanced-debug-overlay');
    
    if (!debugOverlay) {
      debugOverlay = document.createElement('div');
      debugOverlay.id = 'enhanced-debug-overlay';
      debugOverlay.style.cssText = `
        position: absolute;
        top: 60px;
        left: 20px;
        background-color: rgba(0,0,0,0.7);
        color: white;
        padding: 10px;
        border-radius: 5px;
        font-family: monospace;
        z-index: 1000;
        border: 2px solid #42aaf5;
      `;
      
      debugOverlay.innerHTML = `
        <div><strong>Enhanced Debug Information:</strong></div>
        <div>Player Position: <span id="player-pos">N/A</span></div>
        <div>Player Rotation: <span id="player-rot">N/A</span></div>
        <div>Player Velocity: <span id="player-vel">N/A</span></div>
        <div>Camera Position: <span id="camera-pos">N/A</span></div>
        <div>Camera Rotation: <span id="camera-rot">N/A</span></div>
        <div>Camera Relative Position: <span id="relative-pos">N/A</span></div>
        <div>Distance to Ground: <span id="dist-to-ground">N/A</span></div>
        <div>Distance to Walls: <span id="dist-to-walls">N/A</span></div>
        <div style="margin-top: 10px; border-top: 1px solid white; padding-top: 5px;">
          <div><strong>Wall Orientation Guide:</strong></div>
          <div>North Wall: Blue (Z=-25)</div>
          <div>South Wall: Red (Z=25)</div>
          <div>East Wall: Green (X=50)</div>
          <div>West Wall: Yellow (X=-50)</div>
        </div>
        <div style="margin-top: 10px;">
          <button id="toggle-trajectory">Toggle Trajectory</button>
          <button id="toggle-debug-ui">Hide Debug</button>
        </div>
      `;
      
      document.body.appendChild(debugOverlay);
      
      // Update references to elements we just created
      this.debugElements = {
        playerPos: document.getElementById('player-pos'),
        playerRot: document.getElementById('player-rot'),
        cameraPos: document.getElementById('camera-pos'),
        cameraRot: document.getElementById('camera-rot'),
        playerVel: document.getElementById('player-vel'),
        relativePos: document.getElementById('relative-pos'),
        distToGround: document.getElementById('dist-to-ground'),
        distToWalls: document.getElementById('dist-to-walls')
      };
      
      // Add toggle buttons event listeners
      document.getElementById('toggle-trajectory').addEventListener('click', () => {
        this.toggleTrajectory();
      });
      
      document.getElementById('toggle-debug-ui').addEventListener('click', () => {
        this.toggleDebugUI();
      });
    }
  },
  
  createDebugElement: function(id) {
    // Helper to create a debug element if it doesn't exist
    let element = document.getElementById(id);
    if (!element) {
      element = document.createElement('span');
      element.id = id;
    }
    return element;
  },
  
  setupTrajectory: function() {
    // Create a line to visualize player trajectory
    const material = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      linewidth: 2,
      opacity: 0.7,
      transparent: true
    });
    
    const geometry = new THREE.BufferGeometry();
    this.trajectoryLine = new THREE.Line(geometry, material);
    
    // Add to scene
    this.el.sceneEl.object3D.add(this.trajectoryLine);
    this.trajectoryVisible = true;
  },
  
  updateTrajectory: function() {
    if (!this.trajectoryLine || !this.trajectoryVisible) return;
    
    // Add current position to history if it's significantly different
    const playerPos = this.data.player.object3D.position;
    const lastPos = this.playerHistory.length > 0 ? 
      this.playerHistory[this.playerHistory.length - 1] : 
      new THREE.Vector3().copy(playerPos);
    
    if (playerPos.distanceTo(lastPos) > 0.2) {
      this.playerHistory.push(new THREE.Vector3().copy(playerPos));
      
      // Limit history size
      if (this.playerHistory.length > this.maxHistoryPoints) {
        this.playerHistory.shift();
      }
      
      // Update line geometry
      const positions = new Float32Array(this.playerHistory.length * 3);
      
      for (let i = 0; i < this.playerHistory.length; i++) {
        const point = this.playerHistory[i];
        positions[i * 3] = point.x;
        positions[i * 3 + 1] = point.y;
        positions[i * 3 + 2] = point.z;
      }
      
      this.trajectoryLine.geometry.setAttribute(
        'position', 
        new THREE.BufferAttribute(positions, 3)
      );
      this.trajectoryLine.geometry.computeBoundingSphere();
    }
  },
  
  toggleTrajectory: function() {
    if (this.trajectoryLine) {
      this.trajectoryVisible = !this.trajectoryVisible;
      this.trajectoryLine.visible = this.trajectoryVisible;
      
      // Update button text
      const button = document.getElementById('toggle-trajectory');
      if (button) {
        button.textContent = this.trajectoryVisible ? 
          'Hide Trajectory' : 'Show Trajectory';
      }
    }
  },
  
  toggleDebugUI: function() {
    const debugOverlay = document.getElementById('enhanced-debug-overlay');
    if (debugOverlay) {
      const isVisible = debugOverlay.style.display !== 'none';
      debugOverlay.style.display = isVisible ? 'none' : 'block';
      
      // Update button text
      const button = document.getElementById('toggle-debug-ui');
      if (button) {
        button.textContent = isVisible ? 'Show Debug' : 'Hide Debug';
      }
    }
  },
  
  setupBoundaryIndicators: function() {
    // Create a helper object to show boundaries
    this.boundaryHelpers = new THREE.Group();
    
    // Add to scene
    this.el.sceneEl.object3D.add(this.boundaryHelpers);
    
    // Create boundary indicators (could be expanded with more visual helpers)
    // For now, we'll just use the existing walls in the scene
  },
  
  setupDistanceUI: function() {
    // Create raycasters for measuring distances - but do it after a short delay
    // to ensure the scene is loaded
    setTimeout(() => {
      try {
        this.groundRaycaster = new THREE.Raycaster();
        this.wallRaycasters = {
          north: new THREE.Raycaster(),
          south: new THREE.Raycaster(),
          east: new THREE.Raycaster(),
          west: new THREE.Raycaster()
        };
        console.log('Distance raycasters initialized');
      } catch(e) {
        console.warn('Error initializing raycasters:', e);
      }
    }, 1000); // 1 second delay to ensure scene is loaded
  },
  
  measureDistances: function() {
    if (!this.data.player || !this.groundRaycaster) return;
    
    const playerPos = this.data.player.object3D.position.clone();
    
    // Measure ground distance
    this.groundRaycaster.set(playerPos, new THREE.Vector3(0, -1, 0));
    let groundIntersects = [];
    try {
      groundIntersects = this.groundRaycaster.intersectObject(this.el.sceneEl.object3D, true);
    } catch(e) {
      console.warn('Error in ground raycasting:', e);
    }
    
    let groundDist = 'N/A';
    if (groundIntersects.length > 0) {
      groundDist = groundIntersects[0].distance.toFixed(2) + 'm';
    }
    
    // Update UI
    if (this.debugElements.distToGround) {
      this.debugElements.distToGround.textContent = groundDist;
    }
    
    // Measure wall distances
    const wallDirections = {
      north: new THREE.Vector3(0, 0, -1),
      south: new THREE.Vector3(0, 0, 1),
      east: new THREE.Vector3(1, 0, 0),
      west: new THREE.Vector3(-1, 0, 0)
    };
    
    const wallDistances = {};
    
    for (const [wall, direction] of Object.entries(wallDirections)) {
      if (!this.wallRaycasters[wall]) continue;
      
      this.wallRaycasters[wall].set(playerPos, direction);
      let intersects = [];
      
      try {
        intersects = this.wallRaycasters[wall].intersectObject(this.el.sceneEl.object3D, true);
        if (intersects && intersects.length > 0) {
          wallDistances[wall] = intersects[0].distance.toFixed(2) + 'm';
        } else {
          wallDistances[wall] = 'N/A';
        }
      } catch(e) {
        console.warn(`Error in ${wall} wall raycasting:`, e);
        wallDistances[wall] = 'Error';
      }
    }
    
    // Update UI
    if (this.debugElements.distToWalls) {
      this.debugElements.distToWalls.textContent = 
        `N: ${wallDistances.north} S: ${wallDistances.south} E: ${wallDistances.east} W: ${wallDistances.west}`;
    }
  },
  
  tick: function(time) {
    // Only update periodically to avoid performance issues
    if ((time - this.lastUpdate) < (this.data.refreshRate * 1000)) {
      return;
    }
    
    this.lastUpdate = time;
    
    if (!this.data.player || !this.data.camera) return;
    
    // Only proceed if the scene is fully loaded
    if (!this.el.sceneEl.hasLoaded) {
      console.log('Scene not yet loaded, skipping debug update');
      return;
    }
    
    // Get positions and rotations - use object3D for most accurate data
    const playerPos = this.data.player.object3D.position;
    const playerRot = this.data.player.object3D.rotation;
    const cameraPos = this.data.camera.object3D.position;
    const cameraRot = this.data.camera.object3D.rotation;
    
    // Get player velocity if available
    let playerVel = 'N/A';
    if (this.data.player.components['player-component'] && 
        this.data.player.components['player-component'].velocity) {
      const vel = this.data.player.components['player-component'].velocity;
      playerVel = `X: ${vel.x.toFixed(2)}, Y: ${vel.y.toFixed(2)}, Z: ${vel.z.toFixed(2)}`;
    }
    
    // Calculate camera's relative position to player
    const relativePos = new THREE.Vector3().subVectors(cameraPos, playerPos);
    
    // Update debug display
    if (this.debugElements.playerPos) {
      this.debugElements.playerPos.textContent = 
        `X: ${playerPos.x.toFixed(2)}, Y: ${playerPos.y.toFixed(2)}, Z: ${playerPos.z.toFixed(2)}`;
    }
    
    if (this.debugElements.playerRot) {
      this.debugElements.playerRot.textContent = 
        `X: ${(playerRot.x * (180/Math.PI)).toFixed(2)}, Y: ${(playerRot.y * (180/Math.PI)).toFixed(2)}, Z: ${(playerRot.z * (180/Math.PI)).toFixed(2)}`;
    }
    
    if (this.debugElements.cameraPos) {
      this.debugElements.cameraPos.textContent = 
        `X: ${cameraPos.x.toFixed(2)}, Y: ${cameraPos.y.toFixed(2)}, Z: ${cameraPos.z.toFixed(2)}`;
    }
    
    if (this.debugElements.cameraRot) {
      this.debugElements.cameraRot.textContent = 
        `X: ${(cameraRot.x * (180/Math.PI)).toFixed(2)}, Y: ${(cameraRot.y * (180/Math.PI)).toFixed(2)}, Z: ${(cameraRot.z * (180/Math.PI)).toFixed(2)}`;
    }
    
    if (this.debugElements.playerVel) {
      this.debugElements.playerVel.textContent = playerVel;
    }
    
    if (this.debugElements.relativePos) {
      this.debugElements.relativePos.textContent = 
        `X: ${relativePos.x.toFixed(2)}, Y: ${relativePos.y.toFixed(2)}, Z: ${relativePos.z.toFixed(2)}`;
    }
    
    // Measure distances
    this.measureDistances();
    
    // Update trajectory visualization if enabled
    if (this.data.showTrajectory) {
      this.updateTrajectory();
    }
  },
  
  remove: function() {
    // Clean up when component is removed
    if (this.trajectoryLine) {
      this.el.sceneEl.object3D.remove(this.trajectoryLine);
    }
    
    if (this.boundaryHelpers) {
      this.el.sceneEl.object3D.remove(this.boundaryHelpers);
    }
  }
});