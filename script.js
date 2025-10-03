// Game Core Engine
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false; // Pixelated rendering
        
        // Game state
        this.gameState = 'playing'; // playing, paused, gameOver
        this.money = 250;
        this.wave = 1;
        this.time = 0;
        this.lastTime = 0;
        this.center = { x: this.canvas.width / 2, y: this.canvas.height / 2 };
        this.speedMultiplier = 1; // Speed control (1x, 2x, 4x)
        this.speedLevels = [1, 2, 4];
        
        // Unit placement state
        this.placementMode = false;
        this.placementUnitType = null;
        this.placementUnitClass = null;
        this.placementUnitCost = 0;
        this.mouseX = 0;
        this.mouseY = 0;
        
        // Game objects
        this.units = [];
        this.monsters = [];
        this.projectiles = [];
        this.particles = [];
        
        // Spawn timers
        this.monsterSpawnTimer = 0;
        this.monsterSpawnRate = 2000; // milliseconds
        
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
        
        // Control buttons
        document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('resume-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('restart-btn').addEventListener('click', () => this.restart());
        document.getElementById('restart-pause-btn').addEventListener('click', () => this.restart());
        document.getElementById('speed-btn').addEventListener('click', () => this.toggleSpeed());
        
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
        });
    }
    
    handleCanvasClick(x, y) {
        if (this.placementMode) {
            // Check if placement is valid (not too close to center, within bounds)
            if (this.isValidPlacement(x, y)) {
                // Place the unit
                this.units.push(new this.placementUnitClass(x, y));
                this.money -= this.placementUnitCost;
                this.updateUI();
                this.exitPlacementMode();
            }
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
        this.money = 100;
        this.wave = 1;
        this.time = 0;
        this.monsterSpawnTimer = 0;
        
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
        
        // Reinitialize
        this.initializeStartingUnits();
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
        
        this.monsters.push(new Monster(x, y, monsterType, this.wave));
    }
    
    update(deltaTime) {
        if (this.gameState !== 'playing') return;
        
        // Apply speed multiplier
        const adjustedDeltaTime = deltaTime * this.speedMultiplier;
        
        this.time += adjustedDeltaTime;

        // Spawn monsters
        this.monsterSpawnTimer += adjustedDeltaTime;
        const currentSpawnRate = Math.max(500, this.monsterSpawnRate - (this.wave - 1) * 100);
        
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
        this.units.forEach(unit => unit.render(this.ctx));
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
        
        // Draw range indicator
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
        if (this.health === this.maxHealth) return;
        
        const barWidth = this.size * 2;
        const barHeight = 4;
        const x = this.x - barWidth / 2;
        const y = this.y - this.size - 10;
        
        // Background
        ctx.fillStyle = '#333';
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Health
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = healthPercent > 0.5 ? '#4ecdc4' : '#e74c3c';
        ctx.fillRect(x, y, barWidth * healthPercent, barHeight);
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
    constructor(x, y, type, wave) {
        super(x, y);
        this.speed = 30;
        this.damage = 10;
        this.reward = 10;
        this.color = '#ff6b35';
        this.type = type;
        this.rewardGiven = false;
        this.vx = 0;
        this.vy = 0;
        
        // Scale with wave
        this.applyWaveScaling(wave);
        this.applyTypeModifiers(type);
    }
    
    applyWaveScaling(wave) {
        const scale = 1 + (wave - 1) * 0.3;
        this.health *= scale;
        this.maxHealth = this.health;
        this.damage = Math.floor(this.damage * scale);
        this.reward = Math.floor(this.reward * (1 + (wave - 1) * 0.2));
        this.speed *= (1 + (wave - 1) * 0.1);
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
        this.attackRate = 1000; // milliseconds
        this.range = 50;
        this.meleeDamage = 10;
        this.projectileDamage = 0;
        this.projectileSpeed = 200;
        this.color = '#4ecdc4';
        this.type = 'unit';
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
        this.attackRate = 800;
        this.range = 25;
        this.meleeDamage = 25;
        this.color = '#e74c3c';
        this.type = 'warrior';
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
        this.attackRate = 600;
        this.range = 120;
        this.meleeDamage = 5;
        this.projectileDamage = 20;
        this.projectileSpeed = 300;
        this.color = '#2ecc71';
        this.type = 'ranger';
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
        this.attackRate = 1200;
        this.range = 100;
        this.meleeDamage = 5;
        this.projectileDamage = 35;
        this.projectileSpeed = 250;
        this.color = '#9b59b6';
        this.type = 'wizard';
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

// Initialize game when page loads
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new Game();
});