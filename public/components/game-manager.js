// Prevent duplicate registration
if (!AFRAME.components['game-manager']) {
  AFRAME.registerComponent('game-manager', {
    schema: {
      enemyCount: { type: 'number', default: 5 },
      level: { type: 'number', default: 1 },
      spawnRadius: { type: 'number', default: 15 }
    },

    init: function () {
      this.enemies = [];
      this.score = 0;
      this.gameStarted = false;
      this.levelComplete = false;

      // UI Elements
      this.levelValueEl = document.getElementById('level-value');
      this.scoreValueEl = document.getElementById('score-value');
      this.enemiesValueEl = document.getElementById('enemies-value');

      // Bind methods
      this.startGame = this.startGame.bind(this);
      this.spawnEnemies = this.spawnEnemies.bind(this);
      this.onEnemyDestroyed = this.onEnemyDestroyed.bind(this);
      this.updateUI = this.updateUI.bind(this);
      this.nextLevel = this.nextLevel.bind(this);

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
      const enemyCount = this.data.enemyCount + (this.data.level - 1) * 2;
      const spawnRadius = this.data.spawnRadius;

      for (let i = 0; i < enemyCount; i++) {
        // Create enemy entity
        const enemy = document.createElement('a-entity');

        // Random position around the player, at varying heights
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * spawnRadius + spawnRadius/2;
        const height = Math.random() * 5 + 3; // Random height between 3 and 8 units

        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        // Set enemy attributes
        enemy.setAttribute('position', `${x} ${height} ${z}`);
        enemy.setAttribute('enemy-component', {
          health: 50 + (this.data.level - 1) * 25,
          speed: 3 + (this.data.level - 1) * 0.5,
          damage: 10 + (this.data.level - 1) * 5
        });
        enemy.setAttribute('geometry', 'primitive: box; width: 1; height: 1; depth: 1');
        enemy.setAttribute('material', 'color: red');
        enemy.setAttribute('hitbox-component', '');

        // Add enemy to scene
        this.el.sceneEl.appendChild(enemy);
        this.enemies.push(enemy);
      }

      // Update UI
      this.enemiesValueEl.textContent = this.enemies.length;
    },

    onEnemyDestroyed: function (event) {
      // Remove from enemies array
      const enemyEl = event.detail.enemy;
      const index = this.enemies.indexOf(enemyEl);
      if (index > -1) {
        this.enemies.splice(index, 1);
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
      this.levelValueEl.textContent = this.data.level;
      this.scoreValueEl.textContent = this.score;
      this.enemiesValueEl.textContent = this.enemies.length;
    }
  });
}

// Prevent duplicate registration
if (!AFRAME.components['game-manager']) {
    AFRAME.registerComponent('game-manager', {
        schema: {
            enemyCount: { type: 'number', default: 10 },
            level: { type: 'number', default: 1 },
            spawnRadius: { type: 'number', default: 20 },
            enemySpawnInterval: { type: 'number', default: 2000 },
            maxActiveEnemies: { type: 'number', default: 15 },
            gameStartDelay: { type: 'number', default: 2000 }
        },
        init: function() {
            try {
                this.score = 0;
                this.level = this.data.level;
                this.enemiesRemaining = this.data.enemyCount * this.level;
                this.activeEnemies = [];
                this.activeEnemiesCount = 0;
                this.gameOver = false;
                this.levelInProgress = false;
                this.gameStarted = false;
                this.maxSpawnAttempts = 10;
                this.entityManager = new YUKA.EntityManager();
                this.el.addEventListener('player-died', this.onPlayerDied.bind(this));
                document.getElementById('level-value').textContent = this.level;
                document.getElementById('score-value').textContent = this.score;
                document.getElementById('enemies-value').textContent = this.enemiesRemaining;
            } catch (error) {
                console.error('Error initializing game manager:', error);
            }
        },
        startGame: function() {
            try {
                if (this.gameStarted) return;
                this.gameStarted = true;
                this.showMessage(`Get ready!`, 2000);
                setTimeout(() => {
                    this.startLevel();
                }, 2000);
            } catch (error) {
                console.error('Error starting game:', error);
            }
        },
        startLevel: function() {
            try {
                if (this.gameOver) return;
                this.levelInProgress = true;
                console.log(`Starting level ${this.level}`);
                document.getElementById('level-value').textContent = this.level;
                this.enemiesRemaining = this.data.enemyCount * this.level;
                document.getElementById('enemies-value').textContent = this.enemiesRemaining;
                this.showMessage(`Level ${this.level}`, 3000);
                this.startSpawningEnemies();
            } catch (error) {
                console.error('Error starting level:', error);
            }
        },
        startSpawningEnemies: function() {
            try {
                if (this.spawnTimer) {
                    clearInterval(this.spawnTimer);
                }
                const spawnRate = Math.max(500, this.data.enemySpawnInterval / this.level);
                this.spawnTimer = setInterval(() => {
                    if (this.gameOver) {
                        clearInterval(this.spawnTimer);
                        return;
                    }
                    if (this.activeEnemiesCount < this.data.maxActiveEnemies && this.enemiesRemaining > 0) {
                        this.spawnEnemy();
                        this.enemiesRemaining--;
                        document.getElementById('enemies-value').textContent = this.enemiesRemaining;
                    } else if (this.enemiesRemaining === 0 && this.activeEnemiesCount === 0 && this.levelInProgress) {
                        this.completeLevel();
                    }
                }, spawnRate);
            } catch (error) {
                console.error('Error starting enemy spawning:', error);
            }
        },
        registerEnemy: function(enemy) {
            try {
                this.activeEnemies.push(enemy);
                this.activeEnemiesCount++;
            } catch (error) {
                console.error('Error registering enemy:', error);
            }
        },
        unregisterEnemy: function(enemy) {
            try {
                const index = this.activeEnemies.indexOf(enemy);
                if (index !== -1) {
                    this.activeEnemies.splice(index, 1);
                    this.activeEnemiesCount--;
                }
                if (this.enemiesRemaining === 0 && this.activeEnemiesCount === 0 && this.levelInProgress) {
                    this.completeLevel();
                }
            } catch (error) {
                console.error('Error unregistering enemy:', error);
            }
        },
        findValidSpawnPosition: function() {
            try {
                const playerPos = document.getElementById('player').object3D.position;
                const minDistanceFromPlayer = 10;
                for (let attempt = 0; attempt < this.maxSpawnAttempts; attempt++) {
                    const angle = Math.random() * Math.PI * 2;
                    const radius = this.data.spawnRadius * (0.5 + Math.random() * 0.5);
                    const x = Math.cos(angle) * radius;
                    const z = Math.sin(angle) * radius;
                    const y = Math.random() * 8 + 2; // Random height between 2 and 10
                    const distToPlayer = new THREE.Vector3(x - playerPos.x, y - playerPos.y, z - playerPos.z).length();
                    if (distToPlayer >= minDistanceFromPlayer) {
                        const obstacles = document.querySelectorAll('.obstacle');
                        let validPosition = true;
                        for (let i = 0; i < obstacles.length; i++) {
                            const obstacle = obstacles[i];
                            const obstaclePos = obstacle.getAttribute('position');
                            const obstacleWidth = obstacle.getAttribute('width') || 1;
                            const obstacleHeight = obstacle.getAttribute('height') || 1;
                            const obstacleDepth = obstacle.getAttribute('depth') || 1;

                            // Calculate 3D distance to obstacle
                            const distToObstacle = new THREE.Vector3(
                                x - obstaclePos.x, 
                                y - obstaclePos.y, 
                                z - obstaclePos.z
                            ).length();

                            // Calculate obstacle's bounding sphere radius
                            const obstacleRadius = Math.sqrt(
                                (obstacleWidth/2) * (obstacleWidth/2) + 
                                (obstacleHeight/2) * (obstacleHeight/2) + 
                                (obstacleDepth/2) * (obstacleDepth/2)
                            );

                            if (distToObstacle < obstacleRadius + 1.5) {
                                validPosition = false;
                                break;
                            }
                        }
                        if (validPosition) {
                            return { x, y, z };
                        }
                    }
                }
                const angle = Math.random() * Math.PI * 2;
                const y = Math.random() * 8 + 2; // Random height between 2 and 10
                return { x: Math.cos(angle) * this.data.spawnRadius, y, z: Math.sin(angle) * this.data.spawnRadius };
            } catch (error) {
                console.error('Error finding valid spawn position:', error);
                return { x: 0, y: 5, z: -10 };
            }
        },
        spawnEnemy: function() {
            try {
                if (this.gameOver) return;
                const position = this.findValidSpawnPosition();
                const enemy = document.createElement('a-entity');
                enemy.setAttribute('position', `${position.x} ${position.y} ${position.z}`);

                // Randomly select enemy type (normal, fast, tank, sniper)
                const enemyTypes = ['normal', 'fast', 'tank', 'sniper'];
                const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];

                // Base multipliers affected by level
                const levelSpeedMult = 1 + (this.level * 0.1);
                const levelHealthMult = 1 + (this.level * 0.2);
                const levelAttackMult = 1 + (this.level * 0.15);

                // Enemy type specific attributes
                let health, speed, attackPower, attackRate, color, weaponDamage, weaponRange, weaponAccuracy;

                switch(randomType) {
                    case 'fast':
                        health = 70 * levelHealthMult;
                        speed = 3.5 * levelSpeedMult;
                        attackPower = 8 * levelAttackMult;
                        attackRate = Math.max(0.3, 0.8 - (this.level * 0.05));
                        color = 'blue';
                        weaponDamage = 10 * levelAttackMult;
                        weaponRange = 30;
                        weaponAccuracy = 0.6;
                        break;

                    case 'tank':
                        health = 200 * levelHealthMult;
                        speed = 1.5 * levelSpeedMult;
                        attackPower = 15 * levelAttackMult;
                        attackRate = Math.max(0.8, 1.2 - (this.level * 0.05));
                        color = 'purple';
                        weaponDamage = 20 * levelAttackMult;
                        weaponRange = 40;
                        weaponAccuracy = 0.7;
                        break;

                    case 'sniper':
                        health = 80 * levelHealthMult;
                        speed = 1.8 * levelSpeedMult;
                        attackPower = 5 * levelAttackMult;
                        attackRate = Math.max(1.0, 1.5 - (this.level * 0.05));
                        color = 'green';
                        weaponDamage = 30 * levelAttackMult;
                        weaponRange = 70;
                        weaponAccuracy = 0.9;
                        break;

                    default: // normal enemy
                        health = 100 * levelHealthMult;
                        speed = 2 * levelSpeedMult;
                        attackPower = 10 * levelAttackMult;
                        attackRate = Math.max(0.5, 1 - (this.level * 0.05));
                        color = 'red';
                        weaponDamage = 15 * levelAttackMult;
                        weaponRange = 50;
                        weaponAccuracy = 0.7;
                }

                enemy.setAttribute('enemy-component', {
                    health: health,
                    speed: speed,
                    attackPower: attackPower,
                    attackRate: attackRate,
                    weaponDamage: weaponDamage,
                    weaponRange: weaponRange,
                    weaponAccuracy: weaponAccuracy,
                    enemyType: randomType,
                    enemyColor: color
                });

                // Add hitbox component for improved hit detection
                enemy.setAttribute('hitbox', {
                    width: 1.2,
                    height: 1.8,
                    depth: 1.2,
                    offset: { x: 0, y: 0, z: 0 },
                    debug: false  // Set to true to see hitboxes during development
                });

                this.el.appendChild(enemy);
            } catch (error) {
                console.error('Error spawning enemy:', error);
            }
        },
        enemyKilled: function(enemy) {
            try {
                const basePoints = 10;
                const levelMultiplier = this.level;
                const pointsGained = basePoints * levelMultiplier;
                this.score += pointsGained;
                document.getElementById('score-value').textContent = this.score;
                const position = enemy.el.getAttribute('position');
                this.showPointsGained(pointsGained, position);
            } catch (error) {
                console.error('Error handling enemy killed:', error);
            }
        },
        showPointsGained: function(points, position) {
            try {
                const pointsEl = document.createElement('a-text');
                pointsEl.setAttribute('value', `+${points}`);
                pointsEl.setAttribute('color', 'yellow');
                pointsEl.setAttribute('position', `${position.x} ${position.y + 2} ${position.z}`);
                pointsEl.setAttribute('align', 'center');
                pointsEl.setAttribute('scale', '1.5 1.5 1.5');
                pointsEl.setAttribute('look-at', '[camera]');
                pointsEl.setAttribute('animation__float', { property: 'position', to: `${position.x} ${position.y + 4} ${position.z}`, dur: 1500, easing: 'easeOutQuad' });
                pointsEl.setAttribute('animation__fade', { property: 'opacity', from: '1', to: '0', dur: 1500, easing: 'easeInQuad' });
                this.el.appendChild(pointsEl);
                setTimeout(() => {
                    if (pointsEl.parentNode) {
                        pointsEl.parentNode.removeChild(pointsEl);
                    }
                }, 1500);
            } catch (error) {
                console.error('Error showing points gained:', error);
            }
        },
        completeLevel: function() {
            try {
                if (!this.levelInProgress || this.gameOver) return;
                this.levelInProgress = false;
                console.log(`Level ${this.level} complete!`);
                clearInterval(this.spawnTimer);
                const levelBonus = 100 * this.level;
                this.score += levelBonus;
                document.getElementById('score-value').textContent = this.score;
                this.showMessage(`Level ${this.level} Complete!<br>+${levelBonus} bonus points`, 3000);
                this.level++;
                setTimeout(() => {
                    if (!this.gameOver) {
                        this.startLevel();
                    }
                }, 5000);
            } catch (error) {
                console.error('Error completing level:', error);
            }
        },
        onPlayerDied: function() {
            try {
                if (this.gameOver) return;
                this.gameOver = true;
                this.levelInProgress = false;
                console.log('Game over!');
                if (this.spawnTimer) {
                    clearInterval(this.spawnTimer);
                }
                this.showMessage(`Game Over!<br>Final Score: ${this.score}<br><br>Click to restart`, 0);
                const restartListener = (event) => {
                    document.removeEventListener('click', restartListener);
                    window.location.reload();
                };
                setTimeout(() => {
                    document.addEventListener('click', restartListener);
                }, 2000);
            } catch (error) {
                console.error('Error handling player death:', error);
            }
        },
        showMessage: function(text, duration) {
            try {
                const gameMessage = document.getElementById('game-message');
                if (gameMessage) {
                    gameMessage.innerHTML = text;
                    gameMessage.style.display = 'block';
                    if (duration > 0) {
                        setTimeout(() => {
                            gameMessage.style.display = 'none';
                        }, duration);
                    }
                }
            } catch (error) {
                console.error('Error showing message:', error);
            }
        },
        tick: function(time, delta) {
            try {
                const dt = delta / 1000;
                this.entityManager.update(dt);
                if (this.levelInProgress) {
                    if (this.enemiesRemaining === 0 && this.activeEnemiesCount === 0) {
                        this.completeLevel();
                    }
                }
            } catch (error) {
                console.error('Error in game manager tick:', error);
            }
        },
        remove: function() {
            try {
                if (this.spawnTimer) {
                    clearInterval(this.spawnTimer);
                }
            } catch (error) {
                console.error('Error removing game manager:', error);
            }
        }
    });
}