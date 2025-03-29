
AFRAME.registerComponent('camera-test', {
  init: function() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    window.addEventListener('keydown', this.handleKeyDown);
    
    this.testPositions = [
      { position: '0 4.5 12', rotation: '0 0 0', name: "Face North" },
      { position: '0 4.5 12', rotation: '0 180 0', name: "Face South" },
      { position: '0 4.5 12', rotation: '0 90 0', name: "Face East" },
      { position: '0 4.5 12', rotation: '0 -90 0', name: "Face West" }
    ];
    
    console.log("Camera test component initialized. Press 1-4 to test different camera positions.");
  },
  
  handleKeyDown: function(e) {
    const key = e.key;
    
    // Test positions with number keys 1-4
    if (key >= '1' && key <= '4') {
      const index = parseInt(key) - 1;
      if (index < this.testPositions.length) {
        const test = this.testPositions[index];
        const cameraRig = document.querySelector('#camera-rig');
        
        cameraRig.setAttribute('position', test.position);
        cameraRig.setAttribute('rotation', test.rotation);
        
        console.log(`Camera test: ${test.name}`);
        
        // Show test notification
        const gameMessage = document.getElementById('game-message');
        gameMessage.style.display = 'block';
        gameMessage.innerHTML = `Camera Test: ${test.name}<br><button id="close-test">Close</button>`;
        document.getElementById('close-test').addEventListener('click', function() {
          gameMessage.style.display = 'none';
        });
      }
    }
  },
  
  remove: function() {
    window.removeEventListener('keydown', this.handleKeyDown);
  }
});
