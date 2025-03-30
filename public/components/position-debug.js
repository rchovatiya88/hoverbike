
AFRAME.registerComponent('position-debug', {
  schema: {
    player: {type: 'selector', default: '#player'},
    camera: {type: 'selector', default: '#camera-rig'},
    refreshRate: {type: 'number', default: 0.1} // Update frequency in seconds
  },
  
  init: function() {
    this.lastUpdate = 0;
    this.playerPosEl = document.getElementById('player-pos');
    this.playerRotEl = document.getElementById('player-rot');
    this.cameraRotEl = document.getElementById('camera-rot');
  },
  
  tick: function(time, deltaTime) {
    // Only update periodically to avoid performance issues
    if ((time - this.lastUpdate) < (this.data.refreshRate * 1000)) {
      return;
    }
    
    this.lastUpdate = time;
    
    if (!this.data.player || !this.data.camera) return;
    
    // Get positions and rotations - use object3D for most accurate data
    const playerPos = this.data.player.object3D.position;
    const playerRot = this.data.player.object3D.rotation;
    const cameraRot = this.data.camera.object3D.rotation;
    
    // Update debug display
    this.playerPosEl.textContent = `X: ${playerPos.x.toFixed(2)}, Y: ${playerPos.y.toFixed(2)}, Z: ${playerPos.z.toFixed(2)}`;
    this.playerRotEl.textContent = `X: ${(playerRot.x * (180/Math.PI)).toFixed(2)}, Y: ${(playerRot.y * (180/Math.PI)).toFixed(2)}, Z: ${(playerRot.z * (180/Math.PI)).toFixed(2)}`;
    this.cameraRotEl.textContent = `X: ${(cameraRot.x * (180/Math.PI)).toFixed(2)}, Y: ${(cameraRot.y * (180/Math.PI)).toFixed(2)}, Z: ${(cameraRot.z * (180/Math.PI)).toFixed(2)}`;
  }
});
