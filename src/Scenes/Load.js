class Load extends Phaser.Scene {
    constructor() {
        super("loadScene");
    }

    preload() {
        this.load.setPath("./assets/");
        this.load.atlasXML(
            'chickenAtlas', 
            'Custom Edited - Minecraft Customs - Chicken.png', 
            'chickenatlas.xml' 
        );
        this.load.atlasXML(
            'voxelparticles',
            'spritesheet_particles.png',
            'spritesheet_particles.xml'
        );
        this.load.spritesheet("tilemap", "spritesheet_tiles.png", { frameWidth: 128, frameHeight: 128 });
        this.load.tilemapTiledJSON("spritesheet_tiles", "level.json");
        this.load.multiatlas("kenny-particles", "kenny-particles.json");
        this.load.audio('snd_bgm', 'Lavachicken.mp3');
        this.load.audio('snd_jump', 'Mario Jump - Sound Effect (HD) [37-paiEz0mQ].mp3');
        this.load.audio('snd_hurt', 'Dead Chicken Sound Effect [KhYD3swHfPc].mp3');
        this.load.audio('snd_collect', 'Collect.mp3');
        this.load.audio('snd_death', 'Lavachicken_1.mp3');

        
    }

    create() {

        this.anims.create({
            key: 'stand',
            defaultTextureKey: 'chickenAtlas', 
            frames: [
                { frame: 'stand_frame_one' },
                { frame: 'stand_frame_two' },
                { frame: 'stand_frame_three' }
            ],
            frameRate: 5, 
            repeat: -1    
        });
    
        // Walk Animation
        this.anims.create({
            key: 'walk',
            defaultTextureKey: 'chickenAtlas', 
            frames: [
                { frame: 'walking_frame_one' },
                { frame: 'walking_frame_two' },
                { frame: 'walking_frame_three' }
            ],
            frameRate: 10, 
            repeat: -1    
        });
    
       
        this.anims.create({
            key: 'jump',
            defaultTextureKey: 'chickenAtlas', 
            frames: [
                { frame: 'stand_frame_one' }
            ],
            frameRate: 10, 
            repeat: 0     
        });
    
     
        this.anims.create({
            key: 'hurt',
            defaultTextureKey: 'chickenAtlas', 
            frames: [
                { frame: 'hurt_frame_one' },
                { frame: 'hurt_frame_two' }
            ],
            frameRate: 10,
            repeat: 0     
        });
        this.scene.start("platformerScene");

    }

    
}
