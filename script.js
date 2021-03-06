'use strict';

var canvas, height, width, ctx;
var fighters = [];
var fightersAlive;
var customFighter = null;
var bullets = [];
var startTime, lastHitTime, timer;
var generation;
var notifyQueue = [];
const CODONS = ENTITY_ACTS.length;
const syllables = ['asp', 'kat', 'ley', 'mas', 'zan', 'kyo', 'ba', 'tel', 'she', 'mon', 'so', 'jat', 'ryu',
					'aque', 'erg', 'per', 'fal', 'und', 'phi', 'os', 'vog', 'hal', 'aux'];
const GROUND_HEIGHT      = 50;		// height of ground plane from bottom of canvas
const GENERATION_TIMEOUT = 5;		// number of seconds to wait after damage before starting new generation
const TIMER_BAR_WIDTH    = 100;		// width of timer bar in pixels

// User-alterable settings
var POPULATION_SIZE     = 10;		// number of fighters in population
var GENOME_LENGTH       = 10;		// number of genes in fighter genome (actions in loop)
var CULL_COUNT          = 4;		// number of weakest fighters to replace in each generation
var MUTATION_PROB	    = 0.10;		// probability that any given gene will mutate
var OUTSIDER_COUNT   	= 1;		// number of outsiders introduced every generation
var CROSSOVER_TECHNIQUE = '1pt';	// Method used for crossing genomes for new offspring

function showNotification(message) {
	var n = document.getElementById('notification');
	n.innerHTML = message;
	n.className = 'show';
	setTimeout(function(){ n.className = n.className.replace('show', ''); }, 2000);
}

function updateNotifications() {
	var n = document.getElementById('notification');
	if(n.className === 'show') {
		return;
	} else if(notifyQueue.length >= 1){
		var msg = notifyQueue.pop();
		showNotification(msg);
	}
}

function insertCustomFighter() {
	var customName = document.getElementById('customName').value.trim();
	var customGenome = document.getElementById('customGenome').value;
	var customColor = document.getElementById('customColor').value;
	customColor = hexToRgb(customColor);

	// guards
	if(customName.split(' ').length != 2) {
		alert('Invalid name.  Must have 1 first name and 1 last name separated by a space.'
			+ '\nEx: John Smith');
		return;
	}
	if(customGenome.length != GENOME_LENGTH) {
		alert('Genome must be exactly ' + GENOME_LENGTH + ' characters long.'
			+ '\nCurrent length: ' + customGenome.length);
		return;
	}
	// convert user genome notation to number array
	var decodedGenome = '';
	for(var i = 0; i < customGenome.length; i++) {
		switch(customGenome.charAt(i)) {
			case '^':	// jump
				decodedGenome += '0';
				break;
			case '[':	// move left
				decodedGenome += '1';
				break;
			case ']':	// move right
				decodedGenome += '2';
				break;
			case '<':	// shoot left
				decodedGenome += '3';
				break;
			case '>':	// shoot right
				decodedGenome += '4';
				break;
			default:
				alert('Invalid character in genome: \"' + customGenome.charAt(i)
				+ '\"\nAcceptable characters are: ^ [ ] < > (see key)');
				return;
		}
	}
	customFighter = new Fighter(width/2, height/2, customName, decodedGenome, customColor);
	notifyQueue.push('Adding ' + customName + ' to the next generation.');
}

function crossGenomes(g1, g2, ratio) {
	switch(CROSSOVER_TECHNIQUE) {
		case '1pt':
			var divPt = Math.floor(ratio * GENOME_LENGTH);
			return g1.substring(0, divPt) + g2.substring(divPt);
		case '2pt':
			var divPt1 = Math.floor(ratio * (GENOME_LENGTH / 2));
			var divPt2 = Math.floor((1 - ratio) * (GENOME_LENGTH / 2)) + Math.floor(GENOME_LENGTH / 2);
			return g1.substring(0, divPt1) + g2.substring(divPt1, divPt2) + g1.substring(divPt2);
		case 'uni':
			var genome = '';
			for(var i = 0; i < GENOME_LENGTH; i++) {
				if(Math.random() <= ratio) {
					genome += g1.charAt(i);
				} else {
					genome += g2.charAt(i);
				}
			}
			return genome;
		default:
			console.log('Invalid crossover technique.');
	}
}

function mutateGenome(genome) {
	for(var i = 0; i < genome.length; i++) {
		if(Math.random() < MUTATION_PROB) {
			genome = genome.substring(0, i)
				+ Math.floor(Math.random() * CODONS)
				+ genome.substring(i+1);
		}
	}
	return genome;
}

// converts color string of format "rgb(14, 30, 200)" to array of 3 numbers
function rgbStrToArr(str) {
	var i1, i2, r, g, b;
	i1 = str.indexOf("rgb(")+4;
	i2 = str.indexOf(",");
	r = str.substring(i1, i2);
	i1 = str.indexOf(",", i2+1);
	g = str.substring(i2+1, i1);
	i2 = str.indexOf(")", i1+1);
	b = str.substring(i1+1, i2);
	return [Number(r), Number(g), Number(b)];
}

function hexToRgb(hexColor) {
	if(hexColor.charAt(0) === '#') hexColor = hexColor.substring(1);
	var r = parseInt('0x' + hexColor.substring(0, 2));
	var g = parseInt('0x' + hexColor.substring(2, 4));
	var b = parseInt('0x' + hexColor.substring(4));
	return 'rgb(' + r + ', ' + g + ', ' + b + ')';
}

function blendColors(c1, c2, ratio) {
	var color1 = rgbStrToArr(c1);
	var color2 = rgbStrToArr(c2);
	var c3 = [0,0,0];
	for(var i = 0; i < 3; i++) {
		var val = Math.floor((color1[i] * ratio) + (color2[i] * (1-ratio)));
		c3[i] = val;
	}
	return 'rgb('+c3[0]+', '+c3[1]+', '+c3[2]+')';
}

function updateLeaderboard() {
	// sort fighters by generations survived (descending)
	fighters.sort(function(a, b) {
		return b.generationsSurvived - a.generationsSurvived;
	});

	var tab = document.getElementById('ranking');
	tab.innerHTML = '';

	// add table caption
	var cap = document.createElement('caption');
	cap.appendChild(document.createTextNode('Generation ' + generation));
	tab.appendChild(cap);

	// add fighter data
	for(var i = 0; i < fighters.length; i++) {
		var row = document.createElement('tr');

		var cell = document.createElement('td');
		var content;
		if(fighters[i].isChampion) {
			content = document.createTextNode('\u2654\uFE0E ' + fighters[i].name);
		} else {
			content = document.createTextNode(fighters[i].name);
		}
		cell.appendChild(content);
		cell.style.textAlign = 'right';
		row.appendChild(cell);

		cell = document.createElement('td');
		content = document.createTextNode(fighters[i].generationsWon+'/'+fighters[i].generationsSurvived);
		content.alt = fighters[i].generationsWon + ' wins, ' + fighters[i].generationsSurvived + ' generations survived.';
		cell.appendChild(content);
		row.appendChild(cell);

		cell = document.createElement('td');
		cell.width = '10px';
		cell.style.background = fighters[i].bodyColor;
		row.appendChild(cell);

		cell = document.createElement('td');
		content = document.createTextNode(fighters[i].health > 0 ? '' : '\u2620\uFE0E');
		cell.appendChild(content);
		cell.width = '20px';
		row.appendChild(cell);	

		tab.appendChild(row);
	}
}

function startNewGeneration() {
	generation++;

	for(var i = 0; i < fighters.length; i++) {
		// give any surviving fighters a score
		if(fighters[i].health > 0)
			fighters[i].score = (new Date().getTime() - startTime) + (fighters[i].health * 100);

		// update generations survived
		fighters[i].generationsSurvived++;

		// remove previous champion status
		if(fighters[i].isChampion) fighters[i].isChampion = false;
	}

	// sort fighters by score (ascending)
	fighters.sort(function(a, b) {
		return a.score - b.score;
	});

	// cull the weakest fighters
	fighters.splice(0, CULL_COUNT);

	// reward champion
	fighters[fighters.length-1].generationsWon++;
	fighters[fighters.length-1].isChampion = true;

	// create new fighters by crossing 2 fittest genomes
	var g1 = fighters[fighters.length-1].genome;
	var g2 = fighters[fighters.length-2].genome;
	var c1 = fighters[fighters.length-1].bodyColor;
	var c2 = fighters[fighters.length-2].bodyColor;
	var g3, c3;
	var championName = fighters[fighters.length-1].name;
	championName = championName.substring(championName.indexOf(' '));

	var offspringCount;
	if(OUTSIDER_COUNT === 0) {
		offspringCount = CULL_COUNT - (customFighter === null ? 0 : 1);
	} else {
		offspringCount = CULL_COUNT - OUTSIDER_COUNT;
	}

	// generate offspring
	for(var i = 0; i < offspringCount; i++) {
		// cross genomes of top 2 fighters
		g3 = crossGenomes(g1, g2, (i+1)/(CULL_COUNT+1));
		g3 = mutateGenome(g3);
		c3 = blendColors(c1, c2, (i+1)/(CULL_COUNT+1));
		// take champion's last name
		name = randomName() + championName;
		fighters.push(new Fighter(width/2, height/2, name, g3, c3));
	}

	// generate outsiders
	var outsidersToGenerate = OUTSIDER_COUNT - (customFighter === null ? 0 : 1);
	for(var i = 0; i < outsidersToGenerate; i++) {
		g3 = randomGenome(GENOME_LENGTH);
		c3 = randomColor();
		name = randomName() + ' ' + randomName();
		fighters.push(new Fighter(width/2, height/2, name, g3, c3));
	}

	if(customFighter !== null) {
		fighters.push(customFighter);
		customFighter = null;
	}

	// reassign fighter IDs, reset health and position
	for(var i = 0; i < fighters.length; i++) {
		fighters[i].health = FIGHTER_MAX_HEALTH;
		fighters[i].x = width / 2;
		fighters[i].y = height / 2;
		fighters[i].onGround = false;
	}

	updateLeaderboard();

	startTime = lastHitTime = new Date().getTime();
	fightersAlive = fighters.length;
}

function createNewPopulation() {
	var popSizeInput = document.getElementById('popSize');
	var cullCountInput = document.getElementById('cullCount');
	var outsiderCountInput = document.getElementById('outsiderCount');
	var genomeLenInput = document.getElementById('genomeLen');
	var mutateProbInput = document.getElementById('mutateProb');
	var crossTechniqueInput = document.getElementById('crossoverTechnique');

	// guards
	if(!popSizeInput.checkValidity()){
		alert('Invalid population size.  Must be an integer greater than 2.');
		return;
	}
	if(!cullCountInput.checkValidity()) {
		alert('Invalid cull count.  Must be a positive integer.');
		return;
	}
	if(popSizeInput.value < 3 || popSizeInput.value - cullCountInput.value < 2) {
		alert('Population size is too small.  Must have at least two survivors and one culled fighter per generation.');
		return;
	}
	if(!outsiderCountInput.checkValidity()) {
		alert('Invalid outsider interval.  Must be a positive integer.');
		return;
	}
	if(outsiderCountInput.value > cullCountInput.value) {
		alert('Outsider count cannot be larger than cull count.');
		return;
	}
	if(!genomeLenInput.checkValidity()) {
		alert('Invalid genome length.  Must be a positive integer.');
		return;
	}
	if(mutateProbInput.value < 0 || mutateProbInput.value > 1) {
		alert('Mutation probability must be between 0.0 and 1.0');
		return;
	}

	//change settings
	POPULATION_SIZE = popSizeInput.value;
	CULL_COUNT = cullCountInput.value;
	OUTSIDER_COUNT = outsiderCountInput.value;
	GENOME_LENGTH = genomeLen.value;
	MUTATION_PROB = mutateProbInput.value;
	CROSSOVER_TECHNIQUE = crossTechniqueInput.value;

	document.getElementById('genomeLenHelp').innerHTML = GENOME_LENGTH;
	document.getElementById('customGenome').maxLength  = GENOME_LENGTH;

	fighters = [];
	bullets  = [];
	
	// initialize timer
	startTime = new Date().getTime();
	timer = 0;

	generation = 1;

	// initialize fighter population
	for(var i = 0; i < POPULATION_SIZE; i++) {
		fighters.push(new Fighter(width/2, height/2,
			randomName() + ' ' + randomName(),
			randomGenome(GENOME_LENGTH),
			randomColor()));
	}
	fightersAlive = POPULATION_SIZE;

	notifyQueue.push('Population created.');
}

function updateFighters() {
	var product;
	for(var i = 0; i < fighters.length; i++) {
		if(fighters[i].health > 0) {
			product = fighters[i].moveStep();

			// add product of fighter action to appropriate list
			if(product instanceof Bullet) {
				bullets.push(product);
			}

			// update positions based on velocities
			if(!fighters[i].onGround) {
				fighters[i].y -= fighters[i].yVelocity;

				// account for gravity
				fighters[i].yVelocity -= 1;

				// check for collision with ground
				if(fighters[i].y >= height - GROUND_HEIGHT) {
					fighters[i].onGround = true;
					fighters[i].yVelocity = 0;
					fighters[i].y = height - GROUND_HEIGHT;
				}
			}
			fighters[i].x += fighters[i].xVelocity;
			// check for collision with walls
			if(fighters[i].x < 0) fighters[i].x = 0;
			if(fighters[i].x > width) fighters[i].x = width;
		}

		if(fightersAlive < 2 || timer >= GENERATION_TIMEOUT) {
			startNewGeneration();
			return;
		}
	}
}

function updateBullets() {
	var deadBullets = [];
	for(var i = 0; i < bullets.length; i++) {
		bullets[i].x += bullets[i].velocity;
		// remove bullets outside of canvas
		if(bullets[i].x < 0 || bullets[i].x > width) deadBullets.push(i);
		
		// check for collisions with fighters
		for(var j = 0; j < fighters.length; j++) {
			if(fighters[j].health > 0 && bullets[i].hits(fighters[j])) {
				var timestamp = new Date().getTime();
				lastHitTime = timestamp;

				// fighters are given scores on death
				if(--fighters[j].health <= 0) {
					fightersAlive--;
					fighters[j].score = timestamp - startTime;
				}
				if(!deadBullets.includes(i)) deadBullets.push(i);
			}
		}
	}

	// remove bullets outside of window area and collided bullets
	for(var i = deadBullets.length-1; i >= 0; i--) {
		if(deadBullets.includes(i)) {
			bullets.splice(i, 1);
		}
	}
}

function render(ctx) {
	// background
	ctx.fillStyle = 'rgb(241, 241, 241';
	ctx.fillRect(0, 0, width, height);

	// floor
	ctx.fillStyle = 'rgb(77, 78, 79)';
	ctx.fillRect(0, height - GROUND_HEIGHT, width, GROUND_HEIGHT);

	// active fighters
	for(var i = 0; i < fighters.length; i++) {
		if(fighters[i].health > 0) fighters[i].draw(ctx);
	}

	// bullets
	for(var i = 0; i < bullets.length; i++) {
		bullets[i].draw(ctx);
	}

	// timer
	var timestamp = new Date().getTime();
	var widthCoefficient = 1 - ((timestamp - lastHitTime) / (1000 * GENERATION_TIMEOUT));
	ctx.fillStyle = 'rgb(180, 180, 180)';
	ctx.fillRect(15, 15, TIMER_BAR_WIDTH * widthCoefficient, 10);
	ctx.strokeStyle = 'rgb(180, 180, 180)';
	ctx.lineWidth = 1;
	ctx.strokeRect(15.5, 15.5, TIMER_BAR_WIDTH, 10);
	/*
	ctx.font = '12px IBM Plex Mono Light';
	ctx.fillStyle = 'black';
	ctx.fillText(GENERATION_TIMEOUT - timer, 15, 25);
	*/
}

function loop(ctx) {
	updateFighters();
	updateBullets();
	timer = Math.floor((new Date().getTime() - lastHitTime) / 1000);
	render(ctx);
	updateLeaderboard();
	updateNotifications();
	requestAnimationFrame(function() {
		loop(ctx);
	});
}

function randomGenome(len) {
	var g = '';
	for(var i = 0; i < len; i++) {
		g = g + Math.floor(Math.random() * CODONS);
	}
	return g;
}

function randomColor() {
	var r = Math.floor(Math.random() * 255);
	var g = Math.floor(Math.random() * 255);
	var b = Math.floor(Math.random() * 255);
	return 'rgb('+r+', '+g+', '+b+')';
}

function randomName() {
	// combine two random syllables
	var i = Math.floor(Math.random() * syllables.length);
	var name = syllables[i];
	i = Math.floor(Math.random() * syllables.length);
	name = name + syllables[i];
	// capitalize first letter
	name = name.charAt(0).toUpperCase() + name.substring(1);
	return name;
}

window.onload = function() {
	canvas = document.getElementById('mainCanvas');
	width  = canvas.width = 800;
	height = canvas.height = 300;

	ctx = canvas.getContext('2d');

	// initialize timer
	startTime = lastHitTime = new Date().getTime();
	timer = 0;

	generation = 1;

	// initialize fighter population
	for(var i = 0; i < POPULATION_SIZE; i++) {
		fighters.push(new Fighter(width/2, height/2,
			randomName() + ' ' + randomName(),
			randomGenome(GENOME_LENGTH),
			randomColor()));
	}
	fightersAlive = POPULATION_SIZE;

	updateLeaderboard();

	loop(ctx);
}