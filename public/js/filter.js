var Filter = function(x, y, filterNode,context) {
	this.x = x;
	this.y = y;
	this.filterNode = filterNode;
  this.radius =  0.1 * Math.sqrt(window.innerHeight*window.innerHeight + window.innerWidth*window.innerWidth);
  this.gainNodes = {};
  this.context = context;
}
Filter.prototype.dist = function(listener) {
	var dx = listener.x - this.x;
	var dy = listener.y - this.y;
	var dist = Math.sqrt(dx*dx + dy*dy);
	return dist;
}
Filter.prototype.influence = function(listener) {
  var dist = this.dist(listener);
  var gain = 1 - (dist / this.radius);
  gain = Math.max(gain, 0);
	return gain;
}
Filter.prototype.gain = function(sidx, gain) {
	this.gainNode(sidx).gain.value = gain;
}
Filter.prototype.gainNode = function(sample_id) {
  var gn = this.gainNodes[sample_id];
  if(!gn) {
    var gn = this.context.createGain();
    this.gainNodes[sample_id] = gn;
  }
  return gn;
}