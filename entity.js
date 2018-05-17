const ENTITY_ACTS = ['JUMP', 'MOVE_L', 'MOVE_R', 'SHOOT_L', 'SHOOT_R'];
const CYCLES_PER_ACT = 10;

const DRAW_FIGHTER_NAMES   = false;
const DRAW_BULLET_HITBOXES = false;
const FIGHTER_MAX_HEALTH   = 7;

/*
 *	FIGHTER OBJECT
 */
function Fighter(x, y, name, genome, bodyColor) {
	this.x = x;
	this.y = y;
	this.name = name;
	this.genome = genome;
	this.bodyColor = bodyColor;
	this.health = FIGHTER_MAX_HEALTH;
	this.cycleCounter = CYCLES_PER_ACT;
	this.currentGene = 0;

	this.score = 0;
	this.generationsWon = 0;
	this.generationsSurvived = 0;
	this.isChampion = false;

	this.xVelocity = 0;
	this.yVelocity = 0;

	this.onGround = false;
	this.direction = 'LEFT';
};

Fighter.prototype.switchAct = function() {
	if(++this.currentGene === this.genome.length) {
			this.currentGene = 0;
	}
};

Fighter.prototype.moveStep = function() {
	var returnObject = null;
	if(--this.cycleCounter <= 0) {
		this.switchAct();
		this.cycleCounter = CYCLES_PER_ACT;
	}
	this.xVelocity = 0;
	switch(ENTITY_ACTS[this.genome.charAt(this.currentGene)]) {
		case 'JUMP':
			if(this.onGround) {
				this.onGround = false;
				this.yVelocity = 15;
			}
			break;
		case 'MOVE_L':
			this.xVelocity = -5;
			this.direction = 'LEFT';
			break;
		case 'MOVE_R':
			this.xVelocity = 5;
			this.direction = 'RIGHT';
			break;
		case 'SHOOT_L':
			if(this.cycleCounter === 5) {
				returnObject = new Bullet(this.x-6, this.y-15, -10);
			}
			break;
		case 'SHOOT_R':
			if(this.cycleCounter === 5) {
				returnObject = new Bullet(this.x+6, this.y-15, 10);
			}
			break;
	}
	return returnObject;
};

Fighter.prototype.draw = function(ctx) {
	ctx.fillStyle = this.bodyColor;
	ctx.fillRect(this.x-5, this.y-20, 10, 20);

	if(this.isChampion) {
		ctx.fillStyle = 'gold';
		ctx.font = '16px IBM Plex Mono Light';
		ctx.fillText('\u2654', this.x-7, this.y-25);
	} else if(DRAW_FIGHTER_NAMES) {
		ctx.fillStyle = 'black';
		ctx.font = '10px IBM Plex Mono Light';
		ctx.fillText(this.name, this.x-(this.name.length*3), this.y-25);
	}
};

/*
 *	BULLET OBJECT
 */
function Bullet(x, y, velocity) {
	this.x = x;
	this.y = y;
	this.velocity = velocity;
};

// Detects whether this bullet collides with the given fighter
Bullet.prototype.hits = function(fighter) {
	if(this.velocity < 0) {	// flying left
		if(this.x <= fighter.x+5 && this.x-this.velocity >= fighter.x-5
			&& this.y >= fighter.y-20 && this.y <= fighter.y) {
			return true;
		}
	} else {				// flying right
		if(this.x-this.velocity <= fighter.x+5 && this.x >= fighter.x-5
			&& this.y >= fighter.y-20 && this.y <= fighter.y) {
			return true;
		}
	}
	return false;
};

Bullet.prototype.draw = function(ctx) {
	if(DRAW_BULLET_HITBOXES) {
		ctx.fillStyle = 'red';
		if(this.velocity < 0) {
			ctx.fillRect(this.x, this.y, -this.velocity, 1);
		} else {
			ctx.fillRect(this.x-this.velocity, this.y, this.velocity, 1);
		}
	}
	ctx.fillStyle = 'black';
	ctx.fillRect(this.x-2, this.y-2, 4, 4);
};