// Prevent duplicate registration
if (!AFRAME.components['game-manager']) {
  AFRAME.registerComponent('game-manager', {
    schema: {
      enemyCount: { type: 'number', default: 5 },
      level: { type: 'number', default: 1 },
      spawnRadius: { type: 'number', default: 15 },
      enemySpawnInterval: { type: 'number', default: 2000 },
      maxActiveEnemies: { type: 'number', default: 15 },
      gameStartDelay: { type: 'number', default: 2000 }
    },

    init: function () {
      this.score = 0;
      this.level = this.data.level;
      this.enemies = [];
      this.enemiesAlive = 0;
      this.spawnPoints = document.querySelectorAll('.spawn-point');

      // Initialize UI elements, create them if they don't exist
      this.setupUI();

      // Load weapon and enemy presets
      this.weaponPresets = {
        laser: { damage: 25, cooldown: 0.5, automatic: true }
      };

      this.enemyPresets = {
        standard: { health: 100, speed: 3, damage: 10 }
      };

      // Register event listeners
      this.el.addEventListener('enemy-killed', this.onEnemyKilled.bind(this));
      this.el.addEventListener('level-completed', this.onLevelCompleted.bind(this));
      this.el.addEventListener('game-over', this.onGameOver.bind(this));
    },

    setupUI: function() {
      // Get UI elements or create them if they don't exist
      let uiContainer = document.getElementById('game-ui');
      if (!uiContainer) {
        uiContainer = document.createElement('div');
        uiContainer.id = 'game-ui';
        uiContainer.style.position = 'absolute';
        uiContainer.style.top = '10px';
        uiContainer.style.left = '10px';
        uiContainer.style.color = 'white';
        uiContainer.style.fontFamily = 'Arial, sans-serif';
        uiContainer.style.zIndex = '100';
        document.body.appendChild(uiContainer);

        // Create level display
        const levelDiv = document.createElement('div');
        levelDiv.innerHTML = 'Level: <span id="level-value">1</span>';
        uiContainer.appendChild(levelDiv);

        // Create score display
        const scoreDiv = document.createElement('div');
        scoreDiv.innerHTML = 'Score: <span id="score-value">0</span>';
        uiContainer.appendChild(scoreDiv);

        // Create enemies display
        const enemiesDiv = document.createElement('div');
        enemiesDiv.innerHTML = 'Enemies: <span id="enemies-value">0</span>';
        uiContainer.appendChild(enemiesDiv);

        // Create message display
        const messageDiv = document.createElement('div');
        messageDiv.id = 'message';
        messageDiv.style.marginTop = '10px';
        uiContainer.appendChild(messageDiv);
      }

      // Store references to UI elements
      this.levelValueEl = document.getElementById('level-value');
      this.scoreValueEl = document.getElementById('score-value');
      this.enemiesValueEl = document.getElementById('enemies-value');
      this.messageEl = document.getElementById('message');
    },

    startGame: function () {
      console.log('Game started');
      this.gameStarted = true;
      this.spawnEnemies();
      this.updateUI();
    },

    spawnEnemies: function () {
      const enemyCount = this.data.enemyCount * this.level;
      const radius = this.data.spawnRadius;
      this.enemies = []; // Reset enemy array

      for (let i = 0; i < enemyCount; i++) {
        // Create enemy entity
        const enemy = document.createElement('a-entity');

        // Calculate random position within spawn radius
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * radius;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;

        // Add randomized height for flying enemies
        const y = 0.75 + (Math.random() * 3); // Between 0.75 and 3.75 units high

        // Set entity ID for debugging
        enemy.setAttribute('id', `enemy-${i}`);

        // Apply mixin for appearance
        enemy.setAttribute('mixin', 'enemy-mixin');

        // Set enemy position and component
        enemy.setAttribute('position', `${x} ${y} ${z}`);
        enemy.setAttribute('enemy-component', {
          health: 50,
          speed: 2 + Math.random(),
          points: 10,
          hitboxScale: 1.2
        });

        // Add enemy to scene
        this.el.sceneEl.appendChild(enemy);

        // Register the enemy with the game manager
        this.registerEnemy(enemy);
      }

      this.enemiesAlive = enemyCount;
      this.updateScoreUI();
    },

    onEnemyDestroyed: function (event) {
      // Remove from enemies array
      const enemyEl = event.detail.enemy;
      const index = this.enemies.indexOf(enemyEl);
      if (index > -1) {
        this.enemies.splice(index, 1);
        this.enemiesAlive--;
      }

      // Update score
      this.score += 100 * this.data.level;
      this.updateUI();

      // Check if level complete
      if (this.enemies.length === 0 && this.gameStarted && !this.levelComplete) {
        this.levelComplete = true;
        setTimeout(this.nextLevel, 3000);
      }
    },

    nextLevel: function () {
      this.data.level++;
      this.levelComplete = false;

      // Display level message
      const gameMessage = document.getElementById('game-message');
      gameMessage.innerHTML = `Level ${this.data.level} Starting!`;
      gameMessage.style.display = 'block';

      setTimeout(() => {
        gameMessage.style.display = 'none';
        this.spawnEnemies();
        this.updateUI();
      }, 2000);
    },

    updateUI: function () {
      // Update UI elements with null checks
      if (this.levelValueEl) this.levelValueEl.textContent = this.level;
      if (this.scoreValueEl) this.scoreValueEl.textContent = this.score;
      if (this.enemiesValueEl) this.enemiesValueEl.textContent = this.enemiesAlive;
    },
    // Sound playback functionality removed to fix encoding errors
    playSound: function (soundName) {
      console.log(`Sound playback disabled: ${soundName}`);
      // Sound functionality removed to prevent encoding errors
    },
    updateScoreUI: function() {
      if (this.levelValueEl) this.levelValueEl.textContent = this.level;
      if (this.scoreValueEl) this.scoreValueEl.textContent = this.score;
      if (this.enemiesValueEl) this.enemiesValueEl.textContent = this.enemiesAlive;
    },

    // Add enemy registration function
    registerEnemy: function(enemy) {
      if (!this.enemies) {
        this.enemies = [];
      }
      this.enemies.push(enemy);
      this.enemiesAlive++;
      this.updateScoreUI();
    },

    onEnemyKilled: function(evt) {
      console.log('Enemy killed!');
    },

    onLevelCompleted: function(evt) {
      console.log('Level completed!');
    },

    onGameOver: function(evt) {
      console.log('Game over!');
    }
  });
}