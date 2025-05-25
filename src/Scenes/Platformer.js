class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
    }

    init() {
        this.ACCELERATION = 700;
        this.DRAG = 800;
        this.MAX_SPEED_X = 500;
        this.physics.world.gravity.y = 900;
        this.JUMP_VELOCITY = -850;
        this.AIR_CONTROL_FACTOR = 0.7;
        this.GROUND_TURN_DAMPING = 0.6;
        this.MAX_FALL_SPEED = 1000;

        this.LIVES = 3;
        this.SPIKE_KNOCKBACK_X = 200;
        this.SPIKE_KNOCKBACK_Y = -300;
        this.PLAYER_INVULNERABLE_TIME = 1000;

        this.INITIAL_LAVA_SPEED = 1;
        this.LAVA_SPEED_GROWTH_FACTOR = 1.2;
        this.MAX_LAVA_SPEED = 112; 

        this.PARTICLE_VELOCITY = 50;
        this.SCALE = 0.7;
        this.CAMERA_WIDTH = 1280 * 2; 
        this.CAMERA_HEIGHT = 720 * 2;
    }

    create() {
        if (!window.my) {
            window.my = { sprite: {}, vfx: {} };
        }
        if (!my.vfx) {
            my.vfx = {};
        }

        this.playerLives = this.LIVES;
        this.isPlayerInvulnerable = false;
        this.gameEnded = false;

        this.map = this.make.tilemap({ key: "spritesheet_tiles" });
        this.tilesetImage = this.map.addTilesetImage("spritesheet_tiles", "tilemap");

        this.backgroundLayer = this.map.createLayer("Background", this.tilesetImage, 0, 0);
        if(this.backgroundLayer) this.backgroundLayer.setVisible(true);

        this.groundLayer = this.map.createLayer("Ground", this.tilesetImage, 0, 0);
        this.spikesLayer = this.map.createLayer("Spikes", this.tilesetImage, 0, 0);
        if(this.spikesLayer) this.spikesLayer.setVisible(true);
        
        this.endLayer = this.map.createLayer("End", this.tilesetImage, 0, 0);
        if(this.endLayer) {
            this.endLayer.setVisible(true);
            this.endLayer.setCollisionByExclusion([-1]);
        }
        
        if(this.groundLayer) this.groundLayer.setCollisionByExclusion([-1]);
        if(this.spikesLayer) this.spikesLayer.setCollisionByExclusion([-1]);

        this.mushrooms = this.map.createFromObjects("Mushrooms", {
            name: "mushroom",
            key: "tilemap",
            frame: 58
        });

        this.physics.world.enable(this.mushrooms, Phaser.Physics.Arcade.STATIC_BODY);
        this.mushroomGroup = this.add.group(this.mushrooms);
        this.totalMushrooms = this.mushroomGroup.getChildren().length;
        this.mushroomsCollected = 0;

        const spawnPoint = this.map.findObject("Spawnpoints", obj => obj.name === "PlayerStart");
        let spawnX = spawnPoint ? spawnPoint.x + (spawnPoint.width / 2) : 100;
        let spawnY = spawnPoint ? spawnPoint.y : 1000; 

        this.cursors = this.input.keyboard.createCursorKeys();
        this.rKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

        my.sprite.player = this.physics.add.sprite(spawnX, spawnY, "chickenAtlas", "stand_frame_one");
        my.sprite.player.setOrigin(0.5, 1);
        my.sprite.player.setScale(5);
        my.sprite.player.body.maxVelocity.x = this.MAX_SPEED_X;
        my.sprite.player.body.maxVelocity.y = this.MAX_FALL_SPEED;
        my.sprite.player.body.tileBias = 128;

        if(this.groundLayer) this.physics.add.collider(my.sprite.player, this.groundLayer);
        if (this.spikesLayer) {
            this.physics.add.collider(my.sprite.player, this.spikesLayer, this.handleSpikeCollision, null, this);
        }
        if (this.endLayer) {
            this.physics.add.collider(my.sprite.player, this.endLayer, this.reachEndLevel, null, this);
        }
        
        this.physics.add.overlap(my.sprite.player, this.mushroomGroup, this.collectMushroom, null, this);

        this.lavaTileGroup = this.physics.add.group({
            allowGravity: false,
            immovable: true 
        });

        const lavaTileWidth = 128;
        const lavaTileHeight = 128;
        const mapWidthInTiles = this.map.widthInPixels / lavaTileWidth;
        const mapHeightInTiles = this.map.heightInPixels / lavaTileHeight; 
        const lavaTileFrame = 23; 
        const numLavaRows = 8;
        const topLavaRowTileYIndex = mapHeightInTiles - 2;

        for (let r = 0; r < numLavaRows; r++) {
            const currentTileYIndex = topLavaRowTileYIndex + r;
            const yPos = currentTileYIndex * lavaTileHeight;
            for (let i = 0; i < mapWidthInTiles; i++) {
                const xPos = i * lavaTileWidth;
                this.lavaTileGroup.create(xPos, yPos, 'tilemap', lavaTileFrame).setOrigin(0, 0);
            }
        }
        
        this.physics.add.collider(my.sprite.player, this.lavaTileGroup, this.handleLavaCollision, null, this);

        const uiFontFamily = 'Arial';

        this.livesText = this.add.text(16, 16, 'Lives: ' + this.playerLives, { 
            fontFamily: uiFontFamily,
            fontSize: '32px', 
            fill: '#FFF', 
            stroke: '#000', 
            strokeThickness: 4 
        }).setScrollFactor(0).setDepth(100);

        this.mushroomText = this.add.text(this.cameras.main.width - 16, 16, 'Mushrooms: 0/' + this.totalMushrooms, {
            fontFamily: uiFontFamily,
            fontSize: '32px', 
            fill: '#FFD700', 
            stroke: '#000', 
            strokeThickness: 4 
        }).setScrollFactor(0).setOrigin(1,0).setDepth(100);
        this.updateMushroomText();

        this.timerText = this.add.text(this.cameras.main.width / 2, 16, 'Time: 0.00', {
            fontFamily: uiFontFamily,
            fontSize: '32px',
            fill: '#FFF',
            stroke: '#000',
            strokeThickness: 4
        }).setScrollFactor(0).setOrigin(0.5, 0).setDepth(100);
        this.gameStartTime = this.time.now;
        this.elapsedTime = 0;

        my.vfx.walking = this.add.particles(0, 0, "voxelparticles", {
            frame: ['square_white.png', 'swirl_white.png'],
            scale: { start: 0.15, end: 0.05 },
            lifespan: 300,
            gravityY: -200,
            alpha: { start: 0.9, end: 0.1 },
            frequency: 80,
            speed: { min: 20, max: 60 },
            angle: { min: 260, max: 280 },
            blendMode: 'ADD'
        });
        my.vfx.walking.stop();

        my.vfx.jump = this.add.particles(0, 0, "voxelparticles", {
            frame: ['square_white.png', 'swirl_white.png'],
            scale: { start: 0.1, end: 0.04 },
            lifespan: 400,
            gravityY: -150,
            alpha: { start: 1, end: 0.2 },
            speed: { min: 80, max: 150 },
            angle: { min: 240, max: 300 },
            blendMode: 'ADD',
            emitting: false
        });
        
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(my.sprite.player, true, 0.25, 0.25);
        this.cameras.main.setDeadzone(50, 50); 
        this.cameras.main.setZoom(this.SCALE); 
        
        this.sound.play('snd_bgm', { loop: true, volume: 0.3 });
    }
    
    updateMushroomText() {
        this.mushroomText.setText('Mushrooms: ' + this.mushroomsCollected + '/' + this.totalMushrooms);
    }

    collectMushroom(player, mushroom) {
        mushroom.destroy();
        this.mushroomsCollected++;
        this.sound.play('snd_collect', { volume: 0.2 }); 
        this.updateMushroomText();
        // this.sound.play('snd_collect'); 
    }

    handleSpikeCollision(player, spike) {
        if (this.isPlayerInvulnerable || this.gameEnded) return;

        this.playerLives--;
        this.livesText.setText('Lives: ' + this.playerLives);
        player.anims.play('hurt', true);
        this.sound.play('snd_hurt'); 
        this.isPlayerInvulnerable = true;
        
        let knockFromLeft = player.x < spike.pixelX + spike.width / 2;
        player.body.setVelocityX(knockFromLeft ? -this.SPIKE_KNOCKBACK_X : this.SPIKE_KNOCKBACK_X);
        player.body.setVelocityY(this.SPIKE_KNOCKBACK_Y);
        player.setAlpha(0.5);

        this.time.delayedCall(this.PLAYER_INVULNERABLE_TIME, () => {
            this.isPlayerInvulnerable = false;
            player.setAlpha(1);
        }, [], this);

        if (this.playerLives <= 0) {
            this.gameOver();
        }
    }

    handleLavaCollision(player, lavaTile) {
        if (this.playerLives <= 0 || this.gameEnded) return;
        
        this.playerLives = 0;
        this.livesText.setText('Lives: ' + this.playerLives);
        player.anims.play('hurt', true);
        this.sound.play('snd_death'); 
        this.gameOver();
    }
    
    reachEndLevel(player, tile) {
        if (this.gameEnded) return;
        this.gameEnded = true;
        
        my.sprite.player.setAcceleration(0,0);
        my.sprite.player.setVelocity(0,0);
        my.sprite.player.anims.play('stand');
        this.physics.pause();

        const finalTime = this.elapsedTime.toFixed(2);
        const summaryText = `Level Complete!\n\nTime: ${finalTime}s\nMushrooms: ${this.mushroomsCollected}/${this.totalMushrooms}\n\nPress R to Restart`;
        
        const uiFontFamily = 'Arial';

        this.add.rectangle(this.cameras.main.width / 2, this.cameras.main.height / 2, 600, 400, 0x000000, 0.8)
            .setScrollFactor(0).setDepth(199);
            
        this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, summaryText, {
            fontFamily: uiFontFamily,
            fontSize: '40px',
            fill: '#ffffff',
            align: 'center',
            wordWrap: { width: 580 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

        this.sound.stopByKey('snd_bgm');
        // this.sound.play('snd_level_complete');
    }

    gameOver() {
        if (this.gameEnded && this.playerLives > 0) return; // Prevent calling if already won
        if (this.gameEnded && this.playerLives <=0) return; // Prevent multiple game over calls if already dead

        this.gameEnded = true; // Set gameEnded true for death as well

        this.sound.stopByKey('snd_bgm');
        // this.sound.play('snd_death'); 
        my.sprite.player.setTint(0xff0000);
        my.sprite.player.anims.play('hurt'); 
        this.physics.pause();
        this.time.delayedCall(1500, () => this.scene.restart(), [], this);
    }

    update(time, delta) {
        if (this.gameEnded || this.playerLives <= 0) {
            if (my.vfx.walking.emitting) { 
                my.vfx.walking.stop(); 
            }
            return;
        }

        this.elapsedTime = (this.time.now - this.gameStartTime) / 1000;
        this.timerText.setText('Time: ' + this.elapsedTime.toFixed(2));

        const playerBody = my.sprite.player.body;

        if (this.cursors.left.isDown) {
            if (!playerBody.blocked.down && playerBody.velocity.x > 0) {
                playerBody.setAccelerationX(-this.ACCELERATION * this.AIR_CONTROL_FACTOR);
            } else if (playerBody.blocked.down && playerBody.velocity.x > 50) {
                 playerBody.setVelocityX(playerBody.velocity.x * this.GROUND_TURN_DAMPING);
                 playerBody.setAccelerationX(-this.ACCELERATION);
            } else {
                playerBody.setAccelerationX(-this.ACCELERATION);
            }
            my.sprite.player.setFlip(true, false);
            my.sprite.player.anims.play('walk', true);
            
            if (playerBody.blocked.down && !my.vfx.walking.emitting) {
                const particleY = my.sprite.player.y - (my.sprite.player.body.height * 0.1);
                my.vfx.walking.startFollow(my.sprite.player, 0, particleY - my.sprite.player.y);
                my.vfx.walking.start();
            }
        } else if (this.cursors.right.isDown) {
            if (!playerBody.blocked.down && playerBody.velocity.x < 0) {
                playerBody.setAccelerationX(this.ACCELERATION * this.AIR_CONTROL_FACTOR);
            } else if (playerBody.blocked.down && playerBody.velocity.x < -50) {
                playerBody.setVelocityX(playerBody.velocity.x * this.GROUND_TURN_DAMPING);
                playerBody.setAccelerationX(this.ACCELERATION);
            } else {
                playerBody.setAccelerationX(this.ACCELERATION);
            }
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);
            
            if (playerBody.blocked.down && !my.vfx.walking.emitting) {
                const particleY = my.sprite.player.y - (my.sprite.player.body.height * 0.1); 
                my.vfx.walking.startFollow(my.sprite.player, 0, particleY - my.sprite.player.y);
                my.vfx.walking.start();
            }
        } else {
            playerBody.setAccelerationX(0);
            playerBody.setDragX(this.DRAG);
            if (playerBody.blocked.down) {
                my.sprite.player.anims.play('stand', true);
            } else {
                my.sprite.player.anims.play('jump', true);
            }
            if (my.vfx.walking.emitting) { 
                 my.vfx.walking.stop();
            }
        }

        if (playerBody.blocked.down) {
        } else { 
             if (!this.cursors.left.isDown && !this.cursors.right.isDown) {
                my.sprite.player.anims.play('jump', true);
             }
        }

        if (Phaser.Input.Keyboard.JustDown(this.cursors.up) && playerBody.blocked.down) {
            playerBody.setVelocityY(this.JUMP_VELOCITY);
            my.vfx.jump.emitParticleAt(my.sprite.player.x, my.sprite.player.y); 
            this.sound.play('snd_jump', { volume: 0.01 }); 
        }
        
        if (this.lavaTileGroup && this.lavaTileGroup.getChildren().length > 0) {
            let calculatedSpeed = this.INITIAL_LAVA_SPEED * Math.pow(this.LAVA_SPEED_GROWTH_FACTOR, this.elapsedTime);
            const currentLavaSpeed = Math.min(calculatedSpeed, this.MAX_LAVA_SPEED);
            this.lavaTileGroup.incY(-currentLavaSpeed * (delta / 1000));
        }

        if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
            if(this.gameEnded) { 
                 this.scene.restart();
            } else { 
                 this.playerLives = 0; 
                 this.gameOver(); 
            }
        }
    }
}