
AFRAME.registerComponent('camera-test', {
  init: function() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    window.addEventListener('keydown', this.handleKeyDown);
    
    // Test positions focused on making sure player is facing the north wall
    this.testPositions = [
      { position: '0 4.5 12', rotation: '0 0 0', name: "Face North Wall", playerPos: '0 1.5 0', playerRot: '0 0 0' },
      { position: '0 4.5 -12', rotation: '0 180 0', name: "Face South Wall", playerPos: '0 1.5 0', playerRot: '0 180 0' },
      { position: '12 4.5 0', rotation: '0 -90 0', name: "Face East Wall", playerPos: '0 1.5 0', playerRot: '0 -90 0' },
      { position: '-12 4.5 0', rotation: '0 90 0', name: "Face West Wall", playerPos: '0 1.5 0', playerRot: '0 90 0' }
    ];
    
    console.log("Camera test component initialized. Press 1-4 to test different camera positions.");
    console.log("Press N to specifically test north wall orientation.");
  },
  
  handleKeyDown: function(e) {
    const key = e.key;
    
    // Test positions with number keys 1-4
    if (key >= '1' && key <= '4') {
      const index = parseInt(key) - 1;
      if (index < this.testPositions.length) {
        this.applyTestPosition(index);
      }
    }
    
    // Special test for north wall
    if (key === 'n' || key === 'N') {
      // Position player in front of north wall and orient camera correctly
      const player = document.querySelector('#player');
      const cameraRig = document.querySelector('#camera-rig');
      
      player.setAttribute('position', '0 1.5 -15');  // Position close to north wall
      player.setAttribute('rotation', '0 0 0');      // Face north wall
      
      cameraRig.setAttribute('position', '0 4.5 -5');
      cameraRig.setAttribute('rotation', '0 0 0');
      
      console.log("North wall test activated: Player positioned facing north wall");
      
      this.showTestNotification("North Wall Test", "Player positioned facing north wall");
    }
  },
  
  applyTestPosition: function(index) {
    const test = this.testPositions[index];
    const cameraRig = document.querySelector('#camera-rig');
    const player = document.querySelector('#player');
    
    cameraRig.setAttribute('position', test.position);
    cameraRig.setAttribute('rotation', test.rotation);
    
    if (test.playerPos) {
      player.setAttribute('position', test.playerPos);
    }
    
    if (test.playerRot) {
      player.setAttribute('rotation', test.playerRot);
    }
    
    console.log(`Camera test: ${test.name}`);
    this.showTestNotification(test.name, `Camera positioned to ${test.name}`);
  },
  
  showTestNotification: function(title, message) {
    const gameMessage = document.getElementById('game-message');
    gameMessage.style.display = 'block';
    gameMessage.innerHTML = `<strong>Camera Test: ${title}</strong><br>${message}<br><button id="close-test">Close</button>`;
    document.getElementById('close-test').addEventListener('click', function() {
      gameMessage.style.display = 'none';
    });
  }
});
