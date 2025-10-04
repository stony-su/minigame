// Game Core Engine
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false; // Pixelated rendering
        
        // Game state
        this.gameState = 'playing'; // playing, paused, gameOver
        this.money = 400;
        this.wave = 1;
        this.time = 0;
        this.lastTime = 0;
        this.center = { x: this.canvas.width / 2, y: this.canvas.height / 2 };
        this.speedMultiplier = 1; // Speed control (1x, 2x, 4x)
        this.speedLevels = [1, 2, 4];
        
        // Upgrade system
        this.upgrades = {
            damage: { level: 0, cost: 150, multiplier: 1.5 },
            attackSpeed: { level: 0, cost: 200, multiplier: 0.8 },
            range: { level: 0, cost: 175, multiplier: 1.3 }
        };
        
        // Unit placement state
        this.placementMode = false;
        this.placementUnitType = null;
        this.placementUnitClass = null;
        this.placementUnitCost = 0;
        this.mouseX = 0;
        this.mouseY = 0;
        
        // Unit selection state
        this.selectedUnit = null;
        
        // Game objects
        this.units = [];
        this.monsters = [];
        this.projectiles = [];
        this.particles = [];
        
        // Spawn timers
        this.monsterSpawnTimer = 0;
        this.monsterSpawnRate = 2000; // milliseconds
        this.minSpawnRate = 10; // Minimum spawn rate (very fast spawning)
        this.hpScalingPhase = 0; // Tracks how many times we've reset spawn rate for HP scaling
        
        // Initialize with 3 warriors
        this.initializeStartingUnits();
        
        // Event listeners
        this.setupEventListeners();
        
        // Initialize UI
        this.updateSpeedUI();
        
        // Start game loop
        this.gameLoop();
    }
    
    initializeStartingUnits() {
        for (let i = 0; i < 3; i++) {
            const angle = (i * Math.PI * 2) / 3;
            const distance = 80;
            const x = this.center.x + Math.cos(angle) * distance;
            const y = this.center.y + Math.sin(angle) * distance;
            this.units.push(new Warrior(x, y));
        }
    }
    
    setupEventListeners() {
        // Canvas click for unit placement
        this.canvas.addEventListener('click', (e) => {
            if (this.gameState !== 'playing') return;
            
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            this.handleCanvasClick(x, y);
        });
        
        // Mouse move for placement preview
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });
        
        // Shop buttons
        document.getElementById('buy-warrior').addEventListener('click', () => this.buyUnit('warrior'));
        document.getElementById('buy-ranger').addEventListener('click', () => this.buyUnit('ranger'));
        document.getElementById('buy-wizard').addEventListener('click', () => this.buyUnit('wizard'));
        
        // Upgrade buttons
        document.getElementById('upgrade-damage').addEventListener('click', () => this.buyUpgrade('damage'));
        document.getElementById('upgrade-attack-speed').addEventListener('click', () => this.buyUpgrade('attackSpeed'));
        document.getElementById('upgrade-range').addEventListener('click', () => this.buyUpgrade('range'));
        
        // Control buttons
        document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('resume-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('restart-btn').addEventListener('click', () => this.restart());
        document.getElementById('restart-pause-btn').addEventListener('click', () => this.restart());
        document.getElementById('speed-btn').addEventListener('click', () => this.toggleSpeed());
        document.getElementById('close-evolution').addEventListener('click', () => this.closeEvolutionPanel());
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.togglePause();
            }
            if (e.code === 'KeyR' && this.gameState === 'gameOver') {
                this.restart();
            }
            if (e.code === 'Escape' && this.placementMode) {
                this.cancelPlacement();
            }
            // Unit hotkeys
            if (e.code === 'KeyZ' && this.gameState === 'playing') {
                this.buyUnit('warrior');
            }
            if (e.code === 'KeyX' && this.gameState === 'playing') {
                this.buyUnit('ranger');
            }
            if (e.code === 'KeyC' && this.gameState === 'playing') {
                this.buyUnit('wizard');
            }
        });
    }
    
    handleCanvasClick(x, y) {
        if (this.placementMode) {
            // Check if placement is valid (not too close to center, within bounds)
            if (this.isValidPlacement(x, y)) {
                // Place the unit
                const newUnit = new this.placementUnitClass(x, y);
                
                // Apply current upgrades to new unit
                newUnit.applyDamageUpgrade(this.upgrades.damage.level, this.upgrades.damage.multiplier);
                newUnit.applyAttackSpeedUpgrade(this.upgrades.attackSpeed.level, this.upgrades.attackSpeed.multiplier);
                newUnit.applyRangeUpgrade(this.upgrades.range.level, this.upgrades.range.multiplier);
                
                this.units.push(newUnit);
                this.money -= this.placementUnitCost;
                this.updateUI();
                this.exitPlacementMode();
            }
        } else {
            // Check if clicking on a unit
            this.selectedUnit = null;
            for (let unit of this.units) {
                const distance = Math.sqrt((x - unit.x) ** 2 + (y - unit.y) ** 2);
                if (distance <= unit.size) {
                    this.selectedUnit = unit;
                    // Open evolution panel if unit can evolve
                    if (unit.canEvolve && !unit.evolved) {
                        this.openEvolutionPanel(unit);
                    }
                    break;
                }
            }
            this.updateUI();
        }
    }
    
    buyUnit(type) {
        let cost = 0;
        let UnitClass = null;
        
        switch (type) {
            case 'warrior':
                cost = 50;
                UnitClass = Warrior;
                break;
            case 'ranger':
                cost = 75;
                UnitClass = Ranger;
                break;
            case 'wizard':
                cost = 100;
                UnitClass = Wizard;
                break;
        }
        
        if (this.money >= cost && UnitClass) {
            // Enter placement mode
            this.enterPlacementMode(type, UnitClass, cost);
        }
    }
    
    enterPlacementMode(type, UnitClass, cost) {
        this.placementMode = true;
        this.placementUnitType = type;
        this.placementUnitClass = UnitClass;
        this.placementUnitCost = cost;
        this.canvas.style.cursor = 'crosshair';
    }
    
    exitPlacementMode() {
        this.placementMode = false;
        this.placementUnitType = null;
        this.placementUnitClass = null;
        this.placementUnitCost = 0;
        this.canvas.style.cursor = 'default';
    }
    
    buyUpgrade(type) {
        const upgrade = this.upgrades[type];
        if (this.money >= upgrade.cost) {
            this.money -= upgrade.cost;
            upgrade.level++;
            
            // Increase cost for next level (exponential scaling)
            upgrade.cost = Math.floor(upgrade.cost * 1.5);
            
            // Apply upgrades to existing units
            this.applyUpgradesToExistingUnits(type);
            
            this.updateUI();
        }
    }
    
    applyUpgradesToExistingUnits(upgradeType) {
        this.units.forEach(unit => {
            switch (upgradeType) {
                case 'damage':
                    unit.applyDamageUpgrade(this.upgrades.damage.level, this.upgrades.damage.multiplier);
                    break;
                case 'attackSpeed':
                    unit.applyAttackSpeedUpgrade(this.upgrades.attackSpeed.level, this.upgrades.attackSpeed.multiplier);
                    break;
                case 'range':
                    unit.applyRangeUpgrade(this.upgrades.range.level, this.upgrades.range.multiplier);
                    break;
            }
        });
    }
    
    getUpgradeMultiplier(type) {
        const upgrade = this.upgrades[type];
        return Math.pow(upgrade.multiplier, upgrade.level);
    }
    
    cancelPlacement() {
        this.exitPlacementMode();
    }
    
    isValidPlacement(x, y) {
        // Check minimum distance from center
        const distanceFromCenter = Math.sqrt((x - this.center.x) ** 2 + (y - this.center.y) ** 2);
        if (distanceFromCenter < 50) {
            return false;
        }
        
        // Check not too close to other units
        for (let unit of this.units) {
            const distance = Math.sqrt((x - unit.x) ** 2 + (y - unit.y) ** 2);
            if (distance < 25) {
                return false;
            }
        }
        
        // Check within canvas bounds
        const margin = 20;
        if (x < margin || x > this.canvas.width - margin || 
            y < margin || y > this.canvas.height - margin) {
            return false;
        }
        
        return true;
    }
    
    toggleSpeed() {
        const currentIndex = this.speedLevels.indexOf(this.speedMultiplier);
        const nextIndex = (currentIndex + 1) % this.speedLevels.length;
        this.speedMultiplier = this.speedLevels[nextIndex];
        this.updateSpeedUI();
    }
    
    updateSpeedUI() {
        const speedBtn = document.getElementById('speed-btn');
        if (speedBtn) {
            speedBtn.textContent = `Speed: ${this.speedMultiplier}x`;
        }
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            document.getElementById('pause-menu').classList.remove('hidden');
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            document.getElementById('pause-menu').classList.add('hidden');
        }
    }
    
    restart() {
        // Reset game state
        this.gameState = 'playing';
        this.money = 400;
        this.wave = 1;
        this.time = 0;
        this.monsterSpawnTimer = 0;
        this.hpScalingPhase = 0;
        
        // Reset upgrades
        this.upgrades = {
            damage: { level: 0, cost: 150, multiplier: 1.5 },
            attackSpeed: { level: 0, cost: 200, multiplier: 0.8 },
            range: { level: 0, cost: 175, multiplier: 1.3 }
        };
        
        // Reset placement mode
        this.exitPlacementMode();
        
        // Clear arrays
        this.units = [];
        this.monsters = [];
        this.projectiles = [];
        this.particles = [];
        
        // Hide modals
        document.getElementById('game-over').classList.add('hidden');
        document.getElementById('pause-menu').classList.add('hidden');
        document.getElementById('evolution-panel').classList.add('hidden');
        
        // Reinitialize
        this.initializeStartingUnits();
        this.updateUI();
    }
    
    openEvolutionPanel(unit) {
        if (this.gameState !== 'playing') return;
        
        const panel = document.getElementById('evolution-panel');
        const unitName = document.getElementById('evolution-unit-name');
        const unitType = document.getElementById('evolution-unit-type');
        const pathsContainer = document.getElementById('evolution-paths');
        
        unitName.textContent = unit.type.charAt(0).toUpperCase() + unit.type.slice(1);
        unitType.textContent = `Level 1 • Health: ${unit.health}/${unit.maxHealth}`;
        
        // Clear previous paths
        pathsContainer.innerHTML = '';
        
        // Add evolution options
        unit.evolutionPaths.forEach(path => {
            const pathDiv = document.createElement('div');
            pathDiv.className = 'evolution-path';
            
            const canAfford = this.money >= path.cost;
            pathDiv.innerHTML = `
                <button class="evolution-btn ${canAfford ? '' : 'disabled'}" 
                        ${canAfford ? `onclick="game.evolveUnit('${path.name}')"` : 'disabled'}>
                    <div class="evolution-name">${path.name}</div>
                    <div class="evolution-cost">Cost: ${path.cost}</div>
                    <div class="evolution-desc">${path.description}</div>
                </button>
            `;
            
            pathsContainer.appendChild(pathDiv);
        });
        
        panel.classList.remove('hidden');
    }
    
    closeEvolutionPanel() {
        document.getElementById('evolution-panel').classList.add('hidden');
    }
    
    evolveUnit(evolutionName) {
        if (!this.selectedUnit || !this.selectedUnit.canEvolve) return;
        
        const evolutionPath = this.selectedUnit.evolutionPaths.find(path => path.name === evolutionName);
        if (!evolutionPath || this.money < evolutionPath.cost) return;
        
        // Deduct cost
        this.money -= evolutionPath.cost;
        
        // Store unit position and upgrades
        const x = this.selectedUnit.x;
        const y = this.selectedUnit.y;
        const damageLevel = this.selectedUnit.damageUpgradeLevel;
        const speedLevel = this.selectedUnit.attackSpeedUpgradeLevel;
        const rangeLevel = this.selectedUnit.rangeUpgradeLevel;
        
        // Create evolved unit
        let evolvedUnit;
        switch (evolutionName) {
            case 'Guardian':
                evolvedUnit = new Guardian(x, y);
                break;
            case 'Berserker':
                evolvedUnit = new Berserker(x, y);
                break;
            case 'Sniper':
                evolvedUnit = new Sniper(x, y);
                break;
            case 'Hunter':
                evolvedUnit = new Hunter(x, y);
                break;
            case 'Archmage':
                evolvedUnit = new Archmage(x, y);
                break;
            case 'Elementalist':
                evolvedUnit = new Elementalist(x, y);
                break;
            default:
                return;
        }
        
        // Apply existing upgrades
        evolvedUnit.applyDamageUpgrade(damageLevel, this.upgrades.damage.multiplier);
        evolvedUnit.applyAttackSpeedUpgrade(speedLevel, this.upgrades.attackSpeed.multiplier);
        evolvedUnit.applyRangeUpgrade(rangeLevel, this.upgrades.range.multiplier);
        
        // Replace unit in array
        const unitIndex = this.units.indexOf(this.selectedUnit);
        if (unitIndex !== -1) {
            this.units[unitIndex] = evolvedUnit;
        }
        
        // Create evolution particles
        for (let i = 0; i < 15; i++) {
            this.particles.push(new Particle(
                x + (Math.random() - 0.5) * 40,
                y + (Math.random() - 0.5) * 40,
                '#f39c12',
                1000
            ));
        }
        
        this.selectedUnit = evolvedUnit;
        this.closeEvolutionPanel();
        this.updateUI();
    }
    
    spawnMonster() {
        const side = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
        let x, y;
        
        switch (side) {
            case 0: // top
                x = Math.random() * this.canvas.width;
                y = -20;
                break;
            case 1: // right
                x = this.canvas.width + 20;
                y = Math.random() * this.canvas.height;
                break;
            case 2: // bottom
                x = Math.random() * this.canvas.width;
                y = this.canvas.height + 20;
                break;
            case 3: // left
                x = -20;
                y = Math.random() * this.canvas.height;
                break;
        }
        
        // Create monster with scaling difficulty
        let monsterType = 'basic';
        const rand = Math.random();
        
        if (this.wave >= 3 && rand < 0.15) {
            monsterType = 'fast';
        } else if (this.wave >= 2 && rand < 0.25) {
            monsterType = 'strong';
        }
        
        this.monsters.push(new Monster(x, y, monsterType, this.wave, this.hpScalingPhase));
    }
    
    update(deltaTime) {
        if (this.gameState !== 'playing') return;
        
        // Apply speed multiplier
        const adjustedDeltaTime = deltaTime * this.speedMultiplier;
        
        this.time += adjustedDeltaTime;

        // Spawn monsters
        this.monsterSpawnTimer += adjustedDeltaTime;
        let currentSpawnRate;
        
        if (this.wave <= 10) {
            // Linear decrease for waves 1-10
            currentSpawnRate = Math.max(500, this.monsterSpawnRate - (this.wave - 1) * 100);
        } else {
            // Exponential decrease after wave 10
            const exponentialFactor = Math.pow(0.85, this.wave - 10);
            currentSpawnRate = Math.max(this.minSpawnRate, 500 * exponentialFactor);
            
            // If we've hit minimum spawn rate, increase HP scaling and reset spawn rate
            if (currentSpawnRate <= this.minSpawnRate && this.monsterSpawnTimer >= this.minSpawnRate) {
                this.hpScalingPhase++;
                // Reset spawn rate to a higher value to create waves of difficulty
                currentSpawnRate = 300;
            }
        }
        
        if (this.monsterSpawnTimer >= currentSpawnRate) {
            this.spawnMonster();
            this.monsterSpawnTimer = 0;
        }
        
        // Update units
        this.units.forEach(unit => unit.update(adjustedDeltaTime, this.monsters, this.projectiles));
        
        // Update monsters
        this.monsters.forEach(monster => monster.update(adjustedDeltaTime, this.center));
        
        // Update projectiles
        this.projectiles.forEach(projectile => projectile.update(adjustedDeltaTime));
        
        // Update particles
        this.particles.forEach(particle => particle.update(adjustedDeltaTime));
        
        // Check collisions
        this.checkCollisions();
        
        // Remove dead entities
        this.units = this.units.filter(unit => unit.health > 0);
        this.monsters = this.monsters.filter(monster => monster.health > 0);
        this.projectiles = this.projectiles.filter(projectile => !projectile.dead);
        this.particles = this.particles.filter(particle => !particle.dead);
        
        // Check wave progression - advance automatically every 30 seconds
        const waveTime = 30000; // 30 seconds per wave
        const currentWaveStartTime = (this.wave - 1) * waveTime;
        if (this.time > currentWaveStartTime + waveTime) {
            this.wave++;
            this.monsterSpawnRate = Math.max(300, this.monsterSpawnRate - 50); // Faster spawning each wave
            this.updateUI();
            
            // Show wave notification
            this.showWaveNotification();
        }
        
        // Check if monsters reached center (game over condition)
        this.monsters.forEach(monster => {
            if (this.checkDistance(monster, this.center) < 20) {
                // Monster reached center - remove some units or end game
                if (this.units.length > 0) {
                    // Remove a random unit as penalty
                    const randomIndex = Math.floor(Math.random() * this.units.length);
                    this.units.splice(randomIndex, 1);
                    
                    // Remove the monster that reached center
                    monster.health = 0;
                    
                    // Create explosion effect
                    for (let i = 0; i < 10; i++) {
                        this.particles.push(new Particle(
                            this.center.x + (Math.random() - 0.5) * 40,
                            this.center.y + (Math.random() - 0.5) * 40,
                            '#ff6b35',
                            800
                        ));
                    }
                }
            }
        });
        
        // Check game over
        if (this.units.length === 0) {
            this.gameOver();
        }
        
        this.updateUI();
    }
    
    checkCollisions() {
        // Unit vs Monster collisions
        this.units.forEach(unit => {
            this.monsters.forEach(monster => {
                if (this.checkDistance(unit, monster) < unit.size + monster.size) {
                    unit.takeDamage(monster.damage);
                    monster.takeDamage(unit.meleeDamage);
                    
                    // Knockback
                    const angle = Math.atan2(monster.y - unit.y, monster.x - unit.x);
                    monster.x += Math.cos(angle) * 10;
                    monster.y += Math.sin(angle) * 10;
                }
            });
        });
        
        // Projectile vs Monster collisions
        this.projectiles.forEach(projectile => {
            this.monsters.forEach(monster => {
                if (this.checkDistance(projectile, monster) < projectile.size + monster.size) {
                    if (projectile instanceof MagicProjectile) {
                        // Splash damage for magic projectiles
                        this.monsters.forEach(splashMonster => {
                            if (this.checkDistance(projectile, splashMonster) <= projectile.splashRadius) {
                                const distance = this.checkDistance(projectile, splashMonster);
                                const damageMultiplier = 1 - (distance / projectile.splashRadius) * 0.5;
                                splashMonster.takeDamage(projectile.damage * damageMultiplier);
                            }
                        });
                        
                        // Create splash effect
                        for (let i = 0; i < 8; i++) {
                            this.particles.push(new Particle(
                                projectile.x + (Math.random() - 0.5) * 20,
                                projectile.y + (Math.random() - 0.5) * 20,
                                '#9b59b6',
                                400
                            ));
                        }
                    } else {
                        monster.takeDamage(projectile.damage);
                        // Create hit particle
                        this.particles.push(new Particle(monster.x, monster.y, '#ff6b35', 300));
                    }
                    
                    projectile.dead = true;
                }
            });
        });
        
        // Check for dead monsters and award money
        this.monsters.forEach(monster => {
            if (monster.health <= 0 && !monster.rewardGiven) {
                this.money += monster.reward;
                monster.rewardGiven = true;
                
                // Create money particle
                this.particles.push(new Particle(monster.x, monster.y, '#f39c12', 500));
                
                // Add extra particles for special monsters
                if (monster.type === 'strong') {
                    for (let i = 0; i < 5; i++) {
                        this.particles.push(new Particle(
                            monster.x + (Math.random() - 0.5) * 20,
                            monster.y + (Math.random() - 0.5) * 20,
                            '#e74c3c',
                            600
                        ));
                    }
                }
            }
        });
    }
    
    checkDistance(obj1, obj2) {
        const dx = obj1.x - obj2.x;
        const dy = obj1.y - obj2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        document.getElementById('final-wave').textContent = this.wave;
        document.getElementById('game-over').classList.remove('hidden');
    }
    
    showWaveNotification() {
        // Create temporary wave notification
        const notification = document.createElement('div');
        notification.style.position = 'absolute';
        notification.style.top = '50%';
        notification.style.left = '50%';
        notification.style.transform = 'translate(-50%, -50%)';
        notification.style.color = '#4ecdc4';
        notification.style.fontSize = '24px';
        notification.style.fontFamily = '"Press Start 2P", monospace';
        notification.style.textShadow = '2px 2px 0px #000';
        notification.style.zIndex = '1000';
        notification.style.pointerEvents = 'none';
        notification.textContent = `Wave ${this.wave}`;
        
        document.body.appendChild(notification);
        
        // Animate and remove
        setTimeout(() => {
            notification.style.transition = 'opacity 1s';
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 1000);
        }, 2000);
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid (optional)
        this.drawGrid();
        
        // Draw center indicator
        this.drawCenter();
        
        // Render game objects
        this.units.forEach(unit => {
            unit.render(this.ctx);
            // Highlight selected unit
            if (this.selectedUnit === unit) {
                this.ctx.strokeStyle = '#4ecdc4';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([5, 5]);
                this.ctx.beginPath();
                this.ctx.arc(unit.x, unit.y, unit.size + 5, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
            // Show evolution indicator for units that can evolve
            if (unit.canEvolve && !unit.evolved) {
                const sparkleSize = 2 + Math.sin(this.time * 0.01) * 1;
                this.ctx.fillStyle = '#f39c12';
                this.ctx.beginPath();
                this.ctx.arc(unit.x + unit.size / 2 + 3, unit.y - unit.size / 2 - 3, sparkleSize, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
        this.monsters.forEach(monster => monster.render(this.ctx));
        this.projectiles.forEach(projectile => projectile.render(this.ctx));
        this.particles.forEach(particle => particle.render(this.ctx));
        
        // Draw placement preview
        if (this.placementMode) {
            this.drawPlacementPreview();
        }
        
        // Draw UI overlay
        this.drawGameUI();
    }
    
    drawGrid() {
        this.ctx.strokeStyle = '#1a1a2e';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x < this.canvas.width; x += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y < this.canvas.height; y += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }
    
    drawCenter() {
        const pulseSize = 5 + Math.sin(this.time * 0.005) * 3;
        
        this.ctx.fillStyle = '#4ecdc4';
        this.ctx.beginPath();
        this.ctx.arc(this.center.x, this.center.y, pulseSize, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#45b7b8';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(this.center.x, this.center.y, 30, 0, Math.PI * 2);
        this.ctx.stroke();
    }
    
    drawGameUI() {
        // Wave indicator with background
        this.ctx.fillStyle = 'rgba(15, 15, 35, 0.8)';
        this.ctx.fillRect(10, 10, 150, 60);
        this.ctx.strokeStyle = '#4ecdc4';
        this.ctx.strokeRect(10, 10, 150, 60);
        
        this.ctx.fillStyle = '#ff6b35';
        this.ctx.font = '16px "Press Start 2P"';
        this.ctx.fillText(`Wave ${this.wave}`, 20, 30);
        
        // Timer
        const seconds = Math.floor(this.time / 1000);
        const minutes = Math.floor(seconds / 60);
        const timeStr = `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
        this.ctx.fillStyle = '#4ecdc4';
        this.ctx.font = '12px "Press Start 2P"';
        this.ctx.fillText(timeStr, 20, 50);
        
        // Next wave countdown
        const waveTime = 30000; // 30 seconds per wave
        const currentWaveStartTime = (this.wave - 1) * waveTime;
        const timeInCurrentWave = this.time - currentWaveStartTime;
        const timeLeftInWave = Math.max(0, waveTime - timeInCurrentWave);
        
        if (timeLeftInWave > 0) {
            this.ctx.fillStyle = '#f39c12';
            this.ctx.font = '10px "Press Start 2P"';
            this.ctx.fillText(`Next wave: ${Math.ceil(timeLeftInWave / 1000)}s`, 20, 65);
        }
        
        // Game instructions (first wave only)
        if (this.wave === 1 && this.time < 10000) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(this.canvas.width / 2 - 200, this.canvas.height - 100, 400, 80);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '10px "Press Start 2P"';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Defend the center!', this.canvas.width / 2, this.canvas.height - 75);
            this.ctx.fillText('Buy units with money from defeated monsters', this.canvas.width / 2, this.canvas.height - 55);
            this.ctx.fillText('Warriors tank, Rangers shoot, Wizards splash', this.canvas.width / 2, this.canvas.height - 35);
            this.ctx.textAlign = 'left';
        }
        
        // Placement mode instructions
        if (this.placementMode) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(this.canvas.width / 2 - 150, 10, 300, 30);
            
            this.ctx.fillStyle = '#4ecdc4';
            this.ctx.font = '10px "Press Start 2P"';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`Click to place ${this.placementUnitType} | ESC to cancel`, this.canvas.width / 2, 30);
            this.ctx.textAlign = 'left';
        }
    }
    
    drawPlacementPreview() {
        if (!this.placementUnitClass) return;
        
        const isValid = this.isValidPlacement(this.mouseX, this.mouseY);
        
        // Create temporary unit for preview
        const tempUnit = new this.placementUnitClass(this.mouseX, this.mouseY);
        
        // Apply current upgrades to preview unit to show accurate range
        tempUnit.applyDamageUpgrade(this.upgrades.damage.level, this.upgrades.damage.multiplier);
        tempUnit.applyAttackSpeedUpgrade(this.upgrades.attackSpeed.level, this.upgrades.attackSpeed.multiplier);
        tempUnit.applyRangeUpgrade(this.upgrades.range.level, this.upgrades.range.multiplier);
        
        // Draw preview with transparency
        this.ctx.globalAlpha = 0.7;
        
        // Change color based on validity
        if (isValid) {
            tempUnit.render(this.ctx);
        } else {
            // Draw red preview for invalid placement
            this.ctx.fillStyle = '#e74c3c';
            this.ctx.fillRect(this.mouseX - tempUnit.size / 2, this.mouseY - tempUnit.size / 2, tempUnit.size, tempUnit.size);
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(this.mouseX - tempUnit.size / 2, this.mouseY - tempUnit.size / 2, tempUnit.size, tempUnit.size);
        }
        
        // Draw range indicator (now uses upgraded range)
        this.ctx.strokeStyle = isValid ? '#4ecdc4' : '#e74c3c';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.arc(this.mouseX, this.mouseY, tempUnit.range, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        this.ctx.globalAlpha = 1;
    }
    
    updateUI() {
        document.getElementById('money').textContent = this.money;
        document.getElementById('wave').textContent = this.wave;
        document.getElementById('unit-count').textContent = this.units.length;
        document.getElementById('monster-count').textContent = this.monsters.length;
        
        // Update shop button states
        document.getElementById('buy-warrior').disabled = this.money < 50;
        document.getElementById('buy-ranger').disabled = this.money < 75;
        document.getElementById('buy-wizard').disabled = this.money < 100;
        
        // Update upgrade UI
        document.getElementById('damage-upgrade-cost').textContent = this.upgrades.damage.cost;
        document.getElementById('damage-upgrade-level').textContent = this.upgrades.damage.level;
        document.getElementById('speed-upgrade-cost').textContent = this.upgrades.attackSpeed.cost;
        document.getElementById('speed-upgrade-level').textContent = this.upgrades.attackSpeed.level;
        document.getElementById('range-upgrade-cost').textContent = this.upgrades.range.cost;
        document.getElementById('range-upgrade-level').textContent = this.upgrades.range.level;
        
        // Update upgrade button states
        document.getElementById('upgrade-damage').disabled = this.money < this.upgrades.damage.cost;
        document.getElementById('upgrade-attack-speed').disabled = this.money < this.upgrades.attackSpeed.cost;
        document.getElementById('upgrade-range').disabled = this.money < this.upgrades.range.cost;
    }
    
    gameLoop() {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.render();
        
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Base Entity Class
class Entity {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 10;
        this.health = 100;
        this.maxHealth = 100;
        this.dead = false;
    }
    
    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.dead = true;
        }
    }
    
    update(deltaTime) {
        // Override in subclasses
    }
    
    render(ctx) {
        // Override in subclasses
    }
    
    drawHealthBar(ctx) {
        // Show health bar if monster has taken damage (accounting for floating point precision)
        const healthPercent = this.health / this.maxHealth;
        if (healthPercent >= 0.999) return; // Only hide if essentially at full health
        
        const barWidth = this.size * 2;
        const barHeight = 4;
        const x = this.x - barWidth / 2;
        const y = this.y - this.size - 10;
        
        // Background
        ctx.fillStyle = '#333';
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Health - ensure we can see the bar even for very high HP monsters
        const displayHealthPercent = Math.max(0, Math.min(1, healthPercent));
        ctx.fillStyle = displayHealthPercent > 0.5 ? '#4ecdc4' : '#e74c3c';
        ctx.fillRect(x, y, barWidth * displayHealthPercent, barHeight);
    }
}

// Particle class for effects
class Particle {
    constructor(x, y, color, lifetime) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.lifetime = lifetime;
        this.age = 0;
        this.dead = false;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.size = Math.random() * 4 + 2;
    }
    
    update(deltaTime) {
        this.age += deltaTime;
        this.x += this.vx;
        this.y += this.vy;
        
        if (this.age >= this.lifetime) {
            this.dead = true;
        }
    }
    
    render(ctx) {
        const alpha = 1 - (this.age / this.lifetime);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        ctx.globalAlpha = 1;
    }
}

// Monster Classes
class Monster extends Entity {
    constructor(x, y, type, wave, hpScalingPhase = 0) {
        super(x, y);
        this.speed = 30;
        this.damage = 10;
        this.reward = 10;
        this.color = '#ff6b35';
        this.type = type;
        this.rewardGiven = false;
        this.vx = 0;
        this.vy = 0;
        
        // Scale with wave and HP scaling phase
        this.applyWaveScaling(wave, hpScalingPhase);
        this.applyTypeModifiers(type);
    }
    
    applyWaveScaling(wave, hpScalingPhase = 0) {
        const scale = 1 + (wave - 1) * 0.3;
        
        // Apply reasonable HP scaling for each HP phase (after spawn rate minimums)
        // Cap hpScalingPhase at 10 to prevent astronomical values
        const cappedHpScalingPhase = Math.min(hpScalingPhase, 10);
        const hpScale = scale * (1 + cappedHpScalingPhase * 5); // Linear 5x multiplier per phase instead of exponential
        
        this.health *= hpScale;
        this.maxHealth = this.health;
        this.damage = Math.floor(this.damage * scale);
        
        // Cap reward scaling at wave 13
        const rewardWave = Math.min(wave, 10);
        this.reward = Math.floor(this.reward * (1 + (rewardWave - 1) * 0.2) * (1 + hpScalingPhase * 2)); // More reward for HP scaled monsters, capped at wave 13
        
        // Reset speed for HP scaling phases to prevent impossibly fast monsters
        if (hpScalingPhase > 0) {
            // Keep base speed for HP scaled monsters
            this.speed = 30 * (1 + Math.min(wave - 1, 10) * 0.1); // Cap speed scaling at wave 10
        } else {
            this.speed *= (1 + (wave - 1) * 0.1);
        }
    }
    
    applyTypeModifiers(type) {
        switch (type) {
            case 'basic':
                // Default stats
                break;
            case 'strong':
                this.health *= 2;
                this.maxHealth = this.health;
                this.damage *= 1.5;
                this.reward *= 2;
                this.speed *= 0.8;
                this.size = 14;
                this.color = '#e74c3c';
                break;
            case 'fast':
                this.health *= 0.7;
                this.maxHealth = this.health;
                this.speed *= 2;
                this.reward *= 1.2;
                this.size = 8;
                this.color = '#f39c12';
                break;
        }
    }
    
    update(deltaTime, center) {
        // Move towards center
        const dx = center.x - this.x;
        const dy = center.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            this.vx = (dx / distance) * this.speed;
            this.vy = (dy / distance) * this.speed;
        }
        
        this.x += this.vx * deltaTime / 1000;
        this.y += this.vy * deltaTime / 1000;
    }
    
    render(ctx) {
        // Draw monster body with pixelated style
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        
        // Draw monster border
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        
        // Add pixel art details based on type
        this.drawTypeDetails(ctx);
        
        // Draw eyes
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x - this.size / 4, this.y - this.size / 4, 2, 2);
        ctx.fillRect(this.x + this.size / 4 - 2, this.y - this.size / 4, 2, 2);
        
        this.drawHealthBar(ctx);
    }
    
    drawTypeDetails(ctx) {
        switch (this.type) {
            case 'strong':
                // Add spikes
                ctx.fillStyle = '#000';
                ctx.fillRect(this.x - this.size / 2 - 1, this.y - 2, 2, 4);
                ctx.fillRect(this.x + this.size / 2 - 1, this.y - 2, 2, 4);
                ctx.fillRect(this.x - 2, this.y - this.size / 2 - 1, 4, 2);
                ctx.fillRect(this.x - 2, this.y + this.size / 2 - 1, 4, 2);
                break;
            case 'fast':
                // Add motion lines
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(this.x - this.size, this.y - 2);
                ctx.lineTo(this.x - this.size / 2 - 2, this.y - 2);
                ctx.moveTo(this.x - this.size, this.y + 2);
                ctx.lineTo(this.x - this.size / 2 - 2, this.y + 2);
                ctx.stroke();
                break;
            case 'basic':
                // Add basic detail
                ctx.fillStyle = this.getDarkerColor();
                ctx.fillRect(this.x - this.size / 2 + 1, this.y + this.size / 2 - 3, this.size - 2, 2);
                break;
        }
    }
    
    getDarkerColor() {
        switch (this.color) {
            case '#ff6b35': return '#e55d31';
            case '#e74c3c': return '#c0392b';
            case '#f39c12': return '#d68910';
            default: return '#333333';
        }
    }
}

// Unit Classes
class Unit extends Entity {
    constructor(x, y) {
        super(x, y);
        this.attackTimer = 0;
        this.baseAttackRate = 1000; // Base attack rate
        this.attackRate = this.baseAttackRate; // Current attack rate
        this.baseRange = 50; // Base range
        this.range = this.baseRange; // Current range
        this.baseMeleeDamage = 10; // Base melee damage
        this.meleeDamage = this.baseMeleeDamage; // Current melee damage
        this.baseProjectileDamage = 0; // Base projectile damage
        this.projectileDamage = this.baseProjectileDamage; // Current projectile damage
        this.projectileSpeed = 200;
        this.color = '#4ecdc4';
        this.type = 'unit';
        
        // Upgrade tracking
        this.damageUpgradeLevel = 0;
        this.attackSpeedUpgradeLevel = 0;
        this.rangeUpgradeLevel = 0;
        
        // Evolution tracking
        this.canEvolve = false;
        this.evolutionPaths = [];
        this.evolved = false;
        this.evolutionCost = 200;
    }
    
    applyDamageUpgrade(level, multiplier) {
        if (level !== this.damageUpgradeLevel) {
            this.damageUpgradeLevel = level;
            const damageMultiplier = Math.pow(multiplier, level);
            this.meleeDamage = Math.floor(this.baseMeleeDamage * damageMultiplier);
            this.projectileDamage = Math.floor(this.baseProjectileDamage * damageMultiplier);
        }
    }
    
    applyAttackSpeedUpgrade(level, multiplier) {
        if (level !== this.attackSpeedUpgradeLevel) {
            this.attackSpeedUpgradeLevel = level;
            const speedMultiplier = Math.pow(multiplier, level);
            this.attackRate = Math.floor(this.baseAttackRate * speedMultiplier);
        }
    }
    
    applyRangeUpgrade(level, multiplier) {
        if (level !== this.rangeUpgradeLevel) {
            this.rangeUpgradeLevel = level;
            const rangeMultiplier = Math.pow(multiplier, level);
            this.range = Math.floor(this.baseRange * rangeMultiplier);
        }
    }
    
    update(deltaTime, monsters, projectiles) {
        this.attackTimer += deltaTime;
        
        if (this.attackTimer >= this.attackRate) {
            this.attack(monsters, projectiles);
            this.attackTimer = 0;
        }
    }
    
    attack(monsters, projectiles) {
        // Find nearest monster in range
        let nearestMonster = null;
        let nearestDistance = Infinity;
        
        monsters.forEach(monster => {
            const distance = this.getDistance(monster);
            if (distance <= this.range && distance < nearestDistance) {
                nearestDistance = distance;
                nearestMonster = monster;
            }
        });
        
        if (nearestMonster) {
            if (this.projectileDamage > 0) {
                // Ranged attack
                const angle = Math.atan2(nearestMonster.y - this.y, nearestMonster.x - this.x);
                projectiles.push(new Projectile(
                    this.x, this.y, angle, this.projectileSpeed, this.projectileDamage, this.color
                ));
            }
            // Melee damage is handled in collision detection
        }
    }
    
    getDistance(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    render(ctx) {
        // Draw unit body with pixelated style
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        
        // Draw unit border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        
        // Draw inner detail for pixel art effect
        ctx.fillStyle = this.getLighterColor();
        ctx.fillRect(this.x - this.size / 2 + 2, this.y - this.size / 2 + 2, this.size - 4, 2);
        
        this.drawHealthBar(ctx);
    }
    
    getLighterColor() {
        // Create a lighter version of the unit color for pixel art effect
        switch (this.color) {
            case '#e74c3c': return '#ff6b6b';
            case '#2ecc71': return '#4ecdc4';
            case '#9b59b6': return '#bb8fce';
            default: return '#ffffff';
        }
    }
}

class Warrior extends Unit {
    constructor(x, y) {
        super(x, y);
        this.health = 150;
        this.maxHealth = 150;
        this.size = 12;
        this.baseAttackRate = 800;
        this.attackRate = this.baseAttackRate;
        this.baseRange = 25;
        this.range = this.baseRange;
        this.baseMeleeDamage = 25;
        this.meleeDamage = this.baseMeleeDamage;
        this.color = '#e74c3c';
        this.type = 'warrior';
        
        // Evolution setup
        this.canEvolve = true;
        this.evolutionPaths = [
            { name: 'Guardian', cost: 200, description: 'Tank with high health and taunt' },
            { name: 'Berserker', cost: 250, description: 'High damage with life steal' }
        ];
    }
    
    render(ctx) {
        super.render(ctx);
        
        // Draw warrior-specific details
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x - 1, this.y - this.size / 2 + 1, 2, this.size - 2); // Sword
        
        // Draw warrior symbol
        ctx.fillStyle = '#000';
        ctx.font = '6px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('⚔', this.x, this.y + 1);
        ctx.textAlign = 'left';
    }
}

class Ranger extends Unit {
    constructor(x, y) {
        super(x, y);
        this.health = 80;
        this.maxHealth = 80;
        this.size = 10;
        this.baseAttackRate = 600;
        this.attackRate = this.baseAttackRate;
        this.baseRange = 120;
        this.range = this.baseRange;
        this.baseMeleeDamage = 5;
        this.meleeDamage = this.baseMeleeDamage;
        this.baseProjectileDamage = 20;
        this.projectileDamage = this.baseProjectileDamage;
        this.projectileSpeed = 300;
        this.color = '#2ecc71';
        this.type = 'ranger';
        
        // Evolution setup
        this.canEvolve = true;
        this.evolutionPaths = [
            { name: 'Sniper', cost: 225, description: 'Extreme range and critical hits' },
            { name: 'Hunter', cost: 200, description: 'Multi-shot and tracking arrows' }
        ];
    }
    
    render(ctx) {
        super.render(ctx);
        
        // Draw bow
        ctx.strokeStyle = '#8b4513';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x + this.size / 3, this.y, 3, 0, Math.PI);
        ctx.stroke();
        
        // Draw ranger symbol
        ctx.fillStyle = '#000';
        ctx.font = '6px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('🏹', this.x, this.y + 1);
        ctx.textAlign = 'left';
    }
}

class Wizard extends Unit {
    constructor(x, y) {
        super(x, y);
        this.health = 60;
        this.maxHealth = 60;
        this.size = 10;
        this.baseAttackRate = 1200;
        this.attackRate = this.baseAttackRate;
        this.baseRange = 100;
        this.range = this.baseRange;
        this.baseMeleeDamage = 5;
        this.meleeDamage = this.baseMeleeDamage;
        this.baseProjectileDamage = 35;
        this.projectileDamage = this.baseProjectileDamage;
        this.projectileSpeed = 250;
        this.color = '#9b59b6';
        this.type = 'wizard';
        
        // Evolution setup
        this.canEvolve = true;
        this.evolutionPaths = [
            { name: 'Archmage', cost: 275, description: 'Chain lightning and mana shield' },
            { name: 'Elementalist', cost: 250, description: 'Elemental damage and area spells' }
        ];
    }
    
    attack(monsters, projectiles) {
        // Wizard can hit multiple enemies with splash damage
        let nearestMonster = null;
        let nearestDistance = Infinity;
        
        monsters.forEach(monster => {
            const distance = this.getDistance(monster);
            if (distance <= this.range && distance < nearestDistance) {
                nearestDistance = distance;
                nearestMonster = monster;
            }
        });
        
        if (nearestMonster) {
            const angle = Math.atan2(nearestMonster.y - this.y, nearestMonster.x - this.x);
            projectiles.push(new MagicProjectile(
                this.x, this.y, angle, this.projectileSpeed, this.projectileDamage, this.color
            ));
        }
    }
    
    render(ctx) {
        super.render(ctx);
        
        // Draw wizard hat
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.size / 2 - 2);
        ctx.lineTo(this.x - 4, this.y - this.size / 2 + 2);
        ctx.lineTo(this.x + 4, this.y - this.size / 2 + 2);
        ctx.closePath();
        ctx.fill();
        
        // Draw wizard symbol
        ctx.fillStyle = '#000';
        ctx.font = '6px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('🔮', this.x, this.y + 1);
        ctx.textAlign = 'left';
    }
}

// Projectile Classes
class Projectile {
    constructor(x, y, angle, speed, damage, color) {
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.damage = damage;
        this.color = color;
        this.size = 3;
        this.dead = false;
        this.lifetime = 2000; // 2 seconds
        this.age = 0;
    }
    
    update(deltaTime) {
        this.x += this.vx * deltaTime / 1000;
        this.y += this.vy * deltaTime / 1000;
        this.age += deltaTime;
        
        // Remove if out of bounds or too old
        if (this.x < 0 || this.x > 800 || this.y < 0 || this.y > 600 || this.age >= this.lifetime) {
            this.dead = true;
        }
    }
    
    render(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    }
}

class MagicProjectile extends Projectile {
    constructor(x, y, angle, speed, damage, color) {
        super(x, y, angle, speed, damage, color);
        this.size = 5;
        this.splashRadius = 30;
    }
    
    render(ctx) {
        // Draw glowing magic projectile
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// Evolved Unit Classes
class Guardian extends Warrior {
    constructor(x, y) {
        super(x, y);
        this.health = 300;
        this.maxHealth = 300;
        this.size = 14;
        this.baseMeleeDamage = 20;
        this.meleeDamage = this.baseMeleeDamage;
        this.color = '#8e44ad';
        this.type = 'guardian';
        this.evolved = true;
        this.canEvolve = false;
        this.tauntRadius = 60;
    }
    
    update(deltaTime, monsters, projectiles) {
        super.update(deltaTime, monsters, projectiles);
        
        // Taunt nearby monsters to target this unit
        monsters.forEach(monster => {
            const distance = this.getDistance(monster);
            if (distance <= this.tauntRadius) {
                // Redirect monster slightly towards this unit
                const angle = Math.atan2(this.y - monster.y, this.x - monster.x);
                monster.vx += Math.cos(angle) * 5;
                monster.vy += Math.sin(angle) * 5;
            }
        });
    }
    
    render(ctx) {
        super.render(ctx);
        
        // Draw shield symbol
        ctx.fillStyle = '#fff';
        ctx.font = '8px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('🛡️', this.x, this.y + 2);
        ctx.textAlign = 'left';
    }
}

class Berserker extends Warrior {
    constructor(x, y) {
        super(x, y);
        this.health = 120;
        this.maxHealth = 120;
        this.size = 12;
        this.baseAttackRate = 400;
        this.attackRate = this.baseAttackRate;
        this.baseMeleeDamage = 45;
        this.meleeDamage = this.baseMeleeDamage;
        this.color = '#c0392b';
        this.type = 'berserker';
        this.evolved = true;
        this.canEvolve = false;
        this.lifeSteal = 0.3; // 30% life steal
    }
    
    takeDamage(amount) {
        super.takeDamage(amount);
        
        // Berserker gets faster when damaged
        const healthPercent = this.health / this.maxHealth;
        const speedBonus = (1 - healthPercent) * 0.5;
        this.attackRate = this.baseAttackRate * (1 - speedBonus);
    }
    
    attack(monsters, projectiles) {
        super.attack(monsters, projectiles);
        
        // Life steal on attack
        if (this.health < this.maxHealth) {
            this.health = Math.min(this.maxHealth, this.health + this.meleeDamage * this.lifeSteal);
        }
    }
    
    render(ctx) {
        super.render(ctx);
        
        // Draw berserker symbol
        ctx.fillStyle = '#fff';
        ctx.font = '8px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('⚡', this.x, this.y + 2);
        ctx.textAlign = 'left';
    }
}

class Sniper extends Ranger {
    constructor(x, y) {
        super(x, y);
        this.health = 70;
        this.maxHealth = 70;
        this.baseAttackRate = 1000;
        this.attackRate = this.baseAttackRate;
        this.baseRange = 200;
        this.range = this.baseRange;
        this.baseProjectileDamage = 60;
        this.projectileDamage = this.baseProjectileDamage;
        this.projectileSpeed = 500;
        this.color = '#27ae60';
        this.type = 'sniper';
        this.evolved = true;
        this.canEvolve = false;
        this.critChance = 0.25; // 25% crit chance
        this.critMultiplier = 2.5;
    }
    
    attack(monsters, projectiles) {
        let nearestMonster = null;
        let nearestDistance = Infinity;
        
        monsters.forEach(monster => {
            const distance = this.getDistance(monster);
            if (distance <= this.range && distance < nearestDistance) {
                nearestDistance = distance;
                nearestMonster = monster;
            }
        });
        
        if (nearestMonster) {
            const angle = Math.atan2(nearestMonster.y - this.y, nearestMonster.x - this.x);
            const isCrit = Math.random() < this.critChance;
            const damage = isCrit ? this.projectileDamage * this.critMultiplier : this.projectileDamage;
            
            const projectile = new Projectile(this.x, this.y, angle, this.projectileSpeed, damage, this.color);
            if (isCrit) {
                projectile.color = '#f39c12'; // Golden color for crits
                projectile.size = 5;
            }
            projectiles.push(projectile);
        }
    }
    
    render(ctx) {
        super.render(ctx);
        
        // Draw scope symbol
        ctx.fillStyle = '#fff';
        ctx.font = '8px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('🎯', this.x, this.y + 2);
        ctx.textAlign = 'left';
    }
}

class Hunter extends Ranger {
    constructor(x, y) {
        super(x, y);
        this.health = 90;
        this.maxHealth = 90;
        this.baseAttackRate = 500;
        this.attackRate = this.baseAttackRate;
        this.baseProjectileDamage = 15;
        this.projectileDamage = this.baseProjectileDamage;
        this.color = '#229954';
        this.type = 'hunter';
        this.evolved = true;
        this.canEvolve = false;
        this.multiShotCount = 3;
    }
    
    attack(monsters, projectiles) {
        let nearestMonster = null;
        let nearestDistance = Infinity;
        
        monsters.forEach(monster => {
            const distance = this.getDistance(monster);
            if (distance <= this.range && distance < nearestDistance) {
                nearestDistance = distance;
                nearestMonster = monster;
            }
        });
        
        if (nearestMonster) {
            const baseAngle = Math.atan2(nearestMonster.y - this.y, nearestMonster.x - this.x);
            
            // Fire multiple projectiles in a spread
            for (let i = 0; i < this.multiShotCount; i++) {
                const angleOffset = (i - 1) * 0.2; // 0.2 radian spread
                const angle = baseAngle + angleOffset;
                projectiles.push(new Projectile(
                    this.x, this.y, angle, this.projectileSpeed, this.projectileDamage, this.color
                ));
            }
        }
    }
    
    render(ctx) {
        super.render(ctx);
        
        // Draw multi-arrow symbol
        ctx.fillStyle = '#fff';
        ctx.font = '8px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('🏹', this.x, this.y + 2);
        ctx.textAlign = 'left';
    }
}

class Archmage extends Wizard {
    constructor(x, y) {
        super(x, y);
        this.health = 80;
        this.maxHealth = 80;
        this.baseAttackRate = 800;
        this.attackRate = this.baseAttackRate;
        this.baseProjectileDamage = 50;
        this.projectileDamage = this.baseProjectileDamage;
        this.color = '#8b5cf6';
        this.type = 'archmage';
        this.evolved = true;
        this.canEvolve = false;
        this.chainCount = 3;
        this.manaShield = 0.5; // 50% damage reduction
    }
    
    takeDamage(amount) {
        // Mana shield reduces damage
        const reducedDamage = amount * (1 - this.manaShield);
        super.takeDamage(reducedDamage);
    }
    
    attack(monsters, projectiles) {
        let nearestMonster = null;
        let nearestDistance = Infinity;
        
        monsters.forEach(monster => {
            const distance = this.getDistance(monster);
            if (distance <= this.range && distance < nearestDistance) {
                nearestDistance = distance;
                nearestMonster = monster;
            }
        });
        
        if (nearestMonster) {
            const angle = Math.atan2(nearestMonster.y - this.y, nearestMonster.x - this.x);
            projectiles.push(new ChainLightning(
                this.x, this.y, angle, this.projectileSpeed, this.projectileDamage, this.color, this.chainCount
            ));
        }
    }
    
    render(ctx) {
        super.render(ctx);
        
        // Draw archmage symbol with glow
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 5;
        ctx.fillStyle = '#fff';
        ctx.font = '8px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('⚡', this.x, this.y + 2);
        ctx.textAlign = 'left';
        ctx.shadowBlur = 0;
    }
}

class Elementalist extends Wizard {
    constructor(x, y) {
        super(x, y);
        this.health = 75;
        this.maxHealth = 75;
        this.baseAttackRate = 1000;
        this.attackRate = this.baseAttackRate;
        this.baseProjectileDamage = 30;
        this.projectileDamage = this.baseProjectileDamage;
        this.color = '#e67e22';
        this.type = 'elementalist';
        this.evolved = true;
        this.canEvolve = false;
        this.elements = ['fire', 'ice', 'lightning'];
        this.currentElement = 0;
    }
    
    attack(monsters, projectiles) {
        let nearestMonster = null;
        let nearestDistance = Infinity;
        
        monsters.forEach(monster => {
            const distance = this.getDistance(monster);
            if (distance <= this.range && distance < nearestDistance) {
                nearestDistance = distance;
                nearestMonster = monster;
            }
        });
        
        if (nearestMonster) {
            const angle = Math.atan2(nearestMonster.y - this.y, nearestMonster.x - this.x);
            const element = this.elements[this.currentElement];
            
            projectiles.push(new ElementalProjectile(
                this.x, this.y, angle, this.projectileSpeed, this.projectileDamage, element
            ));
            
            // Cycle through elements
            this.currentElement = (this.currentElement + 1) % this.elements.length;
        }
    }
    
    render(ctx) {
        super.render(ctx);
        
        // Draw elemental symbol
        ctx.fillStyle = '#fff';
        ctx.font = '8px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('🔥', this.x, this.y + 2);
        ctx.textAlign = 'left';
    }
}

// Special Projectile Classes
class ChainLightning extends MagicProjectile {
    constructor(x, y, angle, speed, damage, color, chainCount) {
        super(x, y, angle, speed, damage, color);
        this.chainCount = chainCount;
        this.hasChained = false;
    }
    
    // Chain lightning logic would be implemented in collision detection
}

class ElementalProjectile extends MagicProjectile {
    constructor(x, y, angle, speed, damage, element) {
        super(x, y, angle, speed, damage, '#e67e22');
        this.element = element;
        this.statusEffect = this.getStatusEffect();
        
        // Set color based on element
        switch (element) {
            case 'fire':
                this.color = '#e74c3c';
                break;
            case 'ice':
                this.color = '#3498db';
                break;
            case 'lightning':
                this.color = '#f1c40f';
                break;
        }
    }
    
    getStatusEffect() {
        switch (this.element) {
            case 'fire':
                return { type: 'burn', duration: 3000, damage: 5 };
            case 'ice':
                return { type: 'slow', duration: 2000, multiplier: 0.5 };
            case 'lightning':
                return { type: 'stun', duration: 1000 };
            default:
                return null;
        }
    }
}

// Initialize game when page loads
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new Game();
});