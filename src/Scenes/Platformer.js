class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
    }

    init() {
        // variables and settings
        this.ACCELERATION = 400;
        this.DRAG = 500;    // DRAG < ACCELERATION = icy slide
        this.physics.world.gravity.y = 1500;
        this.JUMP_VELOCITY = -600;
        this.PARTICLE_VELOCITY = 50;
        this.SCALE = 2.0;
    }

    create() {
        // Create a new tilemap game object which uses 18x18 pixel tiles, and is
        // 45 tiles wide and 25 tiles tall.
        this.map = this.add.tilemap("platformer-level-1", 18, 18, 45, 25);

        // Add a tileset to the map
        // First parameter: name we gave the tileset in Tiled
        // Second parameter: key for the tilesheet (from this.load.image in Load.js)
        this.tileset = this.map.addTilesetImage("kenny_tilemap_packed", "tilemap_tiles");

        // Create a layer
        this.groundLayer = this.map.createLayer("Ground-n-Platforms", this.tileset, 0, 0);

        // Make it collidable
        this.groundLayer.setCollisionByProperty({
            collides: true
        });

        // Find coins in the "Objects" layer in Phaser
        // Look for them by finding objects with the name "coin"
        // Assign the coin texture from the tilemap_sheet sprite sheet
        // Phaser docs:
        // https://newdocs.phaser.io/docs/3.80.0/focus/Phaser.Tilemaps.Tilemap-createFromObjects

        this.coins = this.map.createFromObjects("Objects", {
            name: "coin",
            key: "tilemap_sheet",
            frame: 151
        });
         // Since createFromObjects returns an array of regular Sprites, we need to convert 
        // them into Arcade Physics sprites (STATIC_BODY, so they don't move) 
        this.physics.world.enable(this.coins, Phaser.Physics.Arcade.STATIC_BODY);  
        
        // EC2: COIN PARTICLE SYSTEM
        my.vfx.pickup = this.add.particles(100, 100, "kenny-particles", {
            frame: ['star_08.png'],
            random: false,
            maxAliveParticles: 1,
            scale: {start: 0.1, end: 0.05, ease: 'bounce.out'},
            lifespan: 100,
            stopAfter: 2
            //alpha: {start: 0, end: 1}, 
        });
        my.vfx.pickup.stop();

        // EC3: ANIAMTE COINS
        for(let i in this.coins){
            this.coins[i].anims.play('rotate');
        }

        // EC1.A: MAKING A SPAWN POINT
        this.spawnPoint = this.map.createFromObjects("Objects", {
            name: "spawn",
            key: "tilemap_sheet",
            frame: 157
        });
        this.physics.world.enable(this.spawnPoint, Phaser.Physics.Arcade.STATIC_BODY);  
        //console.log(this.spawnPoint);
        this.spawnPoint[0].setVisible(false);

        // EC1.B: MAKING A POWERUP
        this.powerUp = this.map.createFromObjects("Objects", {
            name: "powerup",
            key: "tilemap_sheet",
            frame: 107
        });
        this.physics.world.enable(this.powerUp, Phaser.Physics.Arcade.STATIC_BODY);  

        // set up player avatar
        my.sprite.player = this.physics.add.sprite(
            this.spawnPoint[0].x, 
            this.spawnPoint[0].y, 
            "platformer_characters", 
            "tile_0000.png");
        my.sprite.player.setCollideWorldBounds(true);

        // Enable collision handling
        this.physics.add.collider(my.sprite.player, this.groundLayer);

        // Create a Phaser group out of the array this.coins
        // This will be used for collision detection below.
        this.coinGroup = this.add.group(this.coins);
        // Handle collision detection with coins
        this.physics.add.overlap(
            my.sprite.player, 
            this.coinGroup, 
            (obj1, obj2) => {
                my.vfx.pickup.x = obj2.x;
                my.vfx.pickup.y = obj2.y;
                my.vfx.pickup.start();
                obj2.destroy(); // remove coin on overlap
        });     
        
        this.powerUpGroup = this.add.group(this.powerUp);
        // Handle collision detection with powerUps
        this.physics.add.overlap(
            my.sprite.player, 
            this.powerUp, 
            (obj1, obj2) => {
                obj2.anims.play('superJump');
                // make player jump high
                my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY*2);

        });    

        // set up Phaser-provided cursor key input
        cursors = this.input.keyboard.createCursorKeys();

        this.rKey = this.input.keyboard.addKey('R');

        // debug key listener (assigned to D key)
        this.input.keyboard.on('keydown-D', () => {
            this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true
            this.physics.world.debugGraphic.clear()
        }, this);

        // movement vfx

        my.vfx.walking = this.add.particles(0, 0, "kenny-particles", {
            frame: ['smoke_03.png', 'smoke_09.png'],
            // TODO: Try: add 
            random: true,
            scale: {start: 0.03, end: 0.1},
            // TODO: Try: 
            maxAliveParticles: 8,
            lifespan: 150,
            // TODO: Try: 
            gravityY: -200,
            alpha: {start: 1, end: 0.1}, 
        });

        my.vfx.walking.stop();
        
        // CAMERA

        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(my.sprite.player, true, 0.25, 0.25); // (target, [,roundPixels][,lerpX][,lerpY])
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(this.SCALE);        

    }

    update() {
        if(cursors.left.isDown) {
            my.sprite.player.setAccelerationX(-this.ACCELERATION);
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);
            // TODO: add particle following code here
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2+5, my.sprite.player.displayHeight/2-5, false);
            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);
            // Only play smoke effect if touching the ground
            if (my.sprite.player.body.blocked.down) {
                my.vfx.walking.start();
            }

        } else if(cursors.right.isDown) {
            my.sprite.player.setAccelerationX(this.ACCELERATION);
            my.sprite.player.setFlip(true, false);
            my.sprite.player.anims.play('walk', true);
            
            // TODO: add particle following code here
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-30, my.sprite.player.displayHeight/2-5, false);
            my.vfx.walking.setParticleSpeed(-this.PARTICLE_VELOCITY, 0);
            // Only play smoke effect if touching the ground
            if (my.sprite.player.body.blocked.down) {
                my.vfx.walking.start();
            }
        } else {
            // Set acceleration to 0 and have DRAG take over
            my.sprite.player.setAccelerationX(0);
            my.sprite.player.setDragX(this.DRAG);
            my.sprite.player.anims.play('idle');
            // TODO: have the vfx stop playing
            my.vfx.walking.stop();
        }

        // player jump
        // note that we need body.blocked rather than body.touching b/c the former applies to tilemap tiles and the latter to the "ground"
        if(!my.sprite.player.body.blocked.down) {
            my.sprite.player.anims.play('jump');
        }
        if(my.sprite.player.body.blocked.down && Phaser.Input.Keyboard.JustDown(cursors.up)) {
            my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
        }

        if(Phaser.Input.Keyboard.JustDown(this.rKey)) {
            this.scene.restart();
        }
    }
}