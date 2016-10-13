var Sample = function(name, buffer, context, name, canvas, x, y, allSamples, audioRouting) {
	this.name = name;
	this.context = context;
	this.bufferSource=null;
  this.forwardBuffer = buffer;
  this.reverseBuffer = context.createBuffer(buffer.numberOfChannels, buffer.length, context.sampleRate);
  var i = 0;
  if(buffer.channels != 2) {
  	console.log("Got Buffer with " + buffer.channels + "channels.");
  }
  for(; i<buffer.numberOfChannels; i++) {
  	var farr = buffer.getChannelData(i);
  	var rarr = new Float32Array(buffer.length);
  	farr.forEach(function(val, idx, arr) {
  		rarr[buffer.length-1-idx] = val;
  	});
  	this.reverseBuffer.copyToChannel(rarr, i);
  }
  this.buffer = this.forwardBuffer;
  this.stime=null;
  this.pos = 0;
  this.canvas = canvas;
  this.gainNode = this.context.createGain();
  this.$sampleView = null;
  this.width=null;
  this.height=null;
  this.position = {x:x, y:y};
  this.allSamples = allSamples;
  this.$parent = $('body');
  this.playing = false;
  this.radius =  0.15 * Math.sqrt(window.innerHeight*window.innerHeight + window.innerWidth*window.innerWidth);
  this.filters = [];

  //TWO.JS
  this.circle = null;
  this.two = null;
  this.id = Sample.idCounter++;

  this.audioRouting = audioRouting;
}
Sample.idCounter = 0;
// var seconds = function() {
// 	var d = new Date();
// 	var n = d.getTime();
// 	return n / 1000;
// }
Sample.prototype.dist = function(listener) {
	var center = this.position;
	var dx = listener.x - center.x;
	var dy = listener.y - center.y;
	var dist = Math.sqrt(dx*dx + dy*dy);
	return dist;
}
Sample.prototype.influence = function(listener) {
	var dist = this.dist(listener);
	var gain = 1 - (dist / this.radius);
	gain = Math.max(gain, 0);
	return gain;
}
Sample.prototype.stop = function() {
	var t = this.context.currentTime;
	this.pos = this.pos + (t-this.stime);
	this.pos = this.pos % this.buffer.duration;

	var context = this.context;
	this.bufferSource.stop(0);
}
Sample.prototype.play = function() {
	this.stime = this.context.currentTime;

	this.bufferSource = this.context.createBufferSource();
	this.bufferSource.buffer = this.buffer;
	this.bufferSource.loop = true;

	this.bufferSource.connect(this.gainNode);
	this.gainNode.connect(this.context.destination);

	this.audioRouting.connectSample(this);

	this.bufferSource.start(this.context.currentTime, this.pos);
}
Sample.prototype.createPlayButton = function(bufferSource) {
	var $b = $('<div class="sample-control-button play-button">').html('>');
	var instance = this;
	$b.click(function(ev) {
		ev.originalEvent.preventDefault();
		if(instance.playing) {
			instance.playing = false;
			$b.html('>');
			instance.stop.call(instance);
		}
		else {
			instance.playing = true;
			$b.html('][');
			instance.play.call(instance);
		}
		return false;
	});
	return $b;
}
Sample.prototype.createBackButton = function() {
	var $b = $('<div class="sample-control-button back-button">').html('reverse');
	var instance = this;
	$b.click(function(){
		if(instance.playing) {
			instance.stop.call(instance);
			instance.pos = instance.buffer.duration - instance.pos;
			(instance.buffer === instance.forwardBuffer) ? instance.buffer = instance.reverseBuffer : instance.buffer = instance.forwardBuffer;
			instance.play.call(instance);
		}
	});
	return $b;
}
Sample.prototype.createDeleteButton = function() {
	var $b = $('<div class="sample-control-button delete-button">').html("X");
	var instance = this;
	$b.click(function(){
		if(instance.playing) {
			instance.stop.call(instance);
		}
		var idx = instance.allSamples.indexOf(instance);
		instance.allSamples.splice(idx, 1);

		instance.$sampleView.empty();
		instance.$sampleView.remove();
		instance.two.remove(instance.circle);
	});
	return $b;
}
Sample.prototype.createSampleView = function(two) {
	var instance = this;
	this.two = two;

	this.bufferSource = this.context.createBufferSource();
	var bufferSource = this.bufferSource;
	this.bufferSource.buffer = this.buffer;
	var name = this.name;

	var $button = this.createPlayButton(bufferSource);
	var $backButton = this.createBackButton(bufferSource);
	var $deleteButton = this.createDeleteButton();

	var $sampleView = $('<div class="sample-view">');
	// $sampleView.css("width", "500px");

	$sampleView.css("position","absolute").css("top",this.position.y+"px").css("left",this.position.x+"px");
	$container = $('<div>').css("overflow", "hidden");
	$container.html(name + '<br>Duration: ' +  Math.floor(bufferSource.buffer.duration) + " seconds<br>");
	$container.append($deleteButton).append($backButton).append($button);
	$sampleView.append($container);
	$sampleView.css("z-index", "-1");
	this.$sampleView = $sampleView;

	this.$parent.append($sampleView);

	// $sampleView.append($("<div>").css("margin-top", "5px").css("width", "100%"));
	// var height = parseFloat($sampleView.css("height"));
	// height += 105;
	// $sampleView.css("height", height + "px");

	// this.width=width;
	// this.height=height;

	var pos = $sampleView.position();
	var x = pos.left;
	x += $sampleView.outerWidth()/2;
	var y = pos.top;
	y += $sampleView.outerHeight()/2;
	this.position.x = x;
	this.position.y = y;


  var circle = two.makeCircle(x, y, this.radius);
  circle.fill = "#F33";
  circle.opacity = 0.3;
  this.circle = circle;

	// var ctx = this.canvas.getContext("2d");
	// ctx.fillStyle = "blue";
	// ctx.fillRect(x,y,4,4);

	// var waveform = new Array(Math.ceil(width));
	// waveform.fill(0);
	// var samplesPerColumn = bufferSource.buffer.length / width;
	// var maxEnergy = 0;
	// function processBar(idx) {
	// 	if(idx > waveform.length - 1) {
	// 		this.buffer = bufferSource.buffer;
	// 		var play = this.play;
	// 		var stop = this.stop;

	// 		return $sampleView;
	// 	}
	// 	var offset = idx * samplesPerColumn;
	// 	var samples = bufferSource.buffer.getChannelData(0).slice(offset, Math.min(offset+samplesPerColumn, bufferSource.buffer.length - 1));
	// 	var energy = 0;

	// 	var i;
	// 	for(i=0; i<samplesPerColumn; i++) {
	// 		energy += Math.abs(samples[i]);
	// 	}

	// 	samples.forEach(function(curSample, sidx, sarr) {
	// 		energy += Math.abs(curSample);
	// 	});



	// 	energy = energy / samplesPerColumn;
	// 	maxEnergy = Math.max(energy, maxEnergy);
	// 	curCol = energy;
	// 	// carr[cidx] = energy;
	// 	// console.log(curCol);

	// 	var h = curCol *100;
	// 	// var $colView = $("<div>").css("height", h+"px").css("width", "1px").css("background", "red").css("float", "left").css("margin-top", 50 - h/2 + "px");
	// 	// $sampleView.append($colView);

	// 	setTimeout(function(){processBar(idx+1)}, 1);
	// }
	// processBar(0);


	// waveform.forEach(function(curCol, cidx, carr) {
	// 	var offset = cidx * samplesPerColumn;
	// 	var samples = bufferSource.buffer.getChannelData(0).slice(offset, Math.min(offset+samplesPerColumn, bufferSource.buffer.length - 1));
	// 	var energy = 0;

	// 	samples.forEach(function(curSample, sidx, sarr) {
	// 		energy += Math.abs(curSample);
	// 	});



	// 	energy = energy / samplesPerColumn;
	// 	maxEnergy = Math.max(energy, maxEnergy);
	// 	curCol = energy;
	// 	carr[cidx] = energy;
	// 	// console.log(curCol);


	// });
	// waveform.forEach(function(curCol, cidx, carr) {
	// 	var h = curCol *100;
	// 	var $colView = $("<div>").css("height", h+"px").css("width", "1px").css("background", "red").css("float", "left").css("margin-top", 50 - h/2 + "px");
	// 	$sampleView.append($colView);
	// 	// console.log(curCol);
	// });
	this.buffer = bufferSource.buffer;
	var play = this.play;
	var stop = this.stop;

	return $sampleView;
}
Sample.prototype.center = function() {
	var pos = this.$sampleView.position();
	var x = pos.left;
	x += this.width/2;
	var y = pos.top;
	y += this.height/2;
	return {x:x, y:y};
}
Sample.prototype.gain = function(gain) {
	this.gainNode.gain.value = gain;
}