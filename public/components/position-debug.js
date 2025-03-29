
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
    
    // Get positions and rotations
    const playerPos = this.data.player.getAttribute('position');
    const playerRot = this.data.player.getAttribute('rotation');
    const cameraRot = this.data.camera.getAttribute('rotation');
    
    // Update debug display
    this.playerPosEl.textContent = `X: ${playerPos.x.toFixed(2)}, Y: ${playerPos.y.toFixed(2)}, Z: ${playerPos.z.toFixed(2)}`;
    this.playerRotEl.textContent = `X: ${playerRot.x.toFixed(2)}, Y: ${playerRot.y.toFixed(2)}, Z: ${playerRot.z.toFixed(2)}`;
    this.cameraRotEl.textContent = `X: ${cameraRot.x.toFixed(2)}, Y: ${cameraRot.y.toFixed(2)}, Z: ${cameraRot.z.toFixed(2)}`;
  }
});
