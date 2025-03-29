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
      this.gameStarted = false;
      this.enemies = [];
      this.level = this.data.level;
      this.enemiesAlive = 0;

      // Update UI
      this.updateScoreUI();

      // Make the registerEnemy method available
      this.registerEnemy = this.registerEnemy.bind(this);

      // Listen for enemy destroyed events
      this.el.addEventListener('enemy-destroyed', this.onEnemyDestroyed);
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
      const levelElement = document.getElementById('level-value');
      const scoreElement = document.getElementById('score-value');
      const enemiesElement = document.getElementById('enemies-value');

      if (levelElement) levelElement.textContent = this.level;
      if (scoreElement) scoreElement.textContent = this.score;
      if (enemiesElement) enemiesElement.textContent = this.enemiesAlive;
    },
    // Sound playback functionality removed to fix encoding errors
    playSound: function (soundName) {
      console.log(`Sound playback disabled: ${soundName}`);
      // Sound functionality removed to prevent encoding errors
    },
    updateScoreUI: function() {
      document.getElementById('level-value').textContent = this.level;
      document.getElementById('score-value').textContent = this.score;
      document.getElementById('enemies-value').textContent = this.enemiesAlive;
    },

    // Add enemy registration function
    registerEnemy: function(enemy) {
      if (!this.enemies) {
        this.enemies = [];
      }
      this.enemies.push(enemy);
      this.enemiesAlive++;
      this.updateScoreUI();
    }
  });
}