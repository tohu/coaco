var Actor = function(name, context, $canvas, dragdrophandler, nodefn) {
	this.name = name;
	this.context = context;
	this.$canvas = $canvas;
	this.dragdrophandler = dragdrophandler;
	this.$creator = null;
	this.createCreator();
}

Actor.prototype.createCreator = function() {
	this.$creator = $('<div>').addClass("actor");
	$('#object-container').append(this.$creator);
	this.$creator.html(this.name).attr("draggable", "true");

	var instance = this;
	this.$creator.on("dragstart", function(ev) {
    ev.stopPropagation();
    instance.dragdrophandler.action = instance.name;
    ev.originalEvent.dataTransfer.setData('Text/html', "lowpass");
    ev.dropEffect = "move";
	});

	this.$creator.click(function(ev) {
		ev.stopPropagation();
	});
	this.$creator.mousedown(function(ev) {
		ev.stopPropagation();
	});
	this.$creator.mouseup(function(ev) {
		ev.stopPropagation();
	});


}




