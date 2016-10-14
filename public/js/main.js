$(document).ready(function() {

	// Compatibility check
	var context;
	try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    context = new AudioContext();
  }
  catch(e) {
    $('body').html("Sorry, this Browser does not support the Web API. Please try the latest version of Chrome.");
    return;
  }

	var two = new Two({
    type: Two.Types.canvas,
    fullscreen: true,
    autostart: true
	}).appendTo(document.body)


	function dist(x1,x2,y1,y2) {
		var dx = x2 - x1;
		var dy = y2 - y1;
		return Math.sqrt(dx*dx+dy*dy);
	}
	function listenerDist(x,y) {
		return dist(x,y,listener.x, listener.y)
	}
	function listen(x, y) {
		samples.forEach(function(cur, idx, samples) {
			if(!cur.center) {
				return;
			}
			var center = cur.center.call(cur);
			var dx = event.pageX - center.x;
			var dy = event.pageY - center.y;
			var dist = Math.sqrt(dx*dx + dy*dy);
			var ratio = dist / maxDist;
			cur.gain.call(cur, Math.max(1-2*ratio, 0));
		});
	}
  function connectSampleFilter(sample, filter) {
    sample.filters.push(filter);
    sample.bufferSource.connect(filter.gainNode(sample.id));
    filter.gainNode(sample.id).connect(filter.filterNode);
    filter.filterNode.connect(context.destination);
  }
	function connectFilter(filter) {
		samples.forEach(function(sample, idx, arr) {
      connectSampleFilter(sample,filter);
		});
	}
  var audioRouting = {
    connectSample : function(sample) {
      filters.forEach(function(filter) {
        connectSampleFilter(sample, filter);
      });
    }
  }
	function calcMixing(listener) {
		samples.forEach(function(sample, sidx, sarr) {

			// influence = relative to all other, sum is one
			// overall gain in dependence of window size
			var sample_influence = sample.influence(listener);
			var sample_dist = sample.dist(listener);
			var filter_dists = new Array(filters.length);
			var dist_sum = sample_dist;
			filters.forEach(function(filter, fidx, farr) {
				var f_dist = filter.dist(listener);
				filter_dists[fidx] = (f_dist);
				dist_sum += f_dist;
			});

			if(dist_sum === 0) {
				sample.gain(0);
				filters.forEach(function(filter, fidx, farr) {
					filter.gain(0);
				});
			}
			else {
        var rel;
        if(sample_dist === dist_sum)
          rel =1;
        else
          rel = 1-(sample_dist / dist_sum);
				var sample_gain = sample_influence * rel;
				sample.gain(sample_gain);
				filters.forEach(function(filter, fidx, farr) {
					var f_dist = filter_dists[fidx];
          var g;
          var rel;
          rel = 1-(f_dist / dist_sum);
          g = sample_influence * filter.influence(listener) * rel;
					filter.gain(sidx, g);
				});
			}
		});
	}



  // Create a canvas that extends the entire screen
	// and it will draw right over the other html elements, like buttons, etc
	var $canvas = $('canvas');
	$canvas.attr("width", window.innerWidth);
	$canvas.attr("height", window.innerHeight);
	$canvas.css("left", "0px");
  $canvas.css("top", "0px");
  $canvas.css("position", "absolute");
  $canvas.css("z-index", "-11");
  var canvas = $canvas[0];

  var ctx = canvas.getContext("2d");
	// canvas.setAttribute("style", "position: absolute; x:0px; y:0px;");
	// document.body.appendChild(canvas);


  var analyser = context.createAnalyser();

	var listener = {x:null, y:null, maxDist: Math.sqrt(window.innerHeight*window.innerHeight + window.innerWidth*window.innerWidth)};
  var samples = [];
  var filters = [];


  function arrayBuffer2SampleView(arrayBuffer, name, ev) {
    context.decodeAudioData(arrayBuffer, function(buffer) {
    		var sample = new Sample(name, buffer, context, name, canvas, ev.clientX, ev.clientY, samples, audioRouting);
    		sample.createSampleView(two);
        filters.forEach(function(filter) {
          connectSampleFilter(sample, filter);
        });

  			sample.$sampleView.addClass("ui-widget-content");
				sample.$sampleView.draggable({
				  drag: function( ev, ui ) {
				  	var elem = sample.$sampleView;
				  	var pos = elem.position();
				  	var x = pos.left;
				  	x += elem.outerWidth() / 2;
				  	var y = pos.top;
				  	y += elem.outerHeight() / 2;

				  	sample.position.x = x;
				  	sample.position.y = y;

            sample.circle.translation.x = x;
            sample.circle.translation.y = y;
            two.update();

				  	calcMixing(listener);
				  }
				});

        samples.push(sample);
        calcMixing(listener);
        //sound.start(0);
    });
  }
	function loadFile(file, ev) {
		var fileReader = new FileReader();
		fileReader.onload = function() {
		    var buffer = this.result;
		    arrayBuffer2SampleView(buffer, file.name, ev);
		};
		fileReader.readAsArrayBuffer(file);
	}

	var dragdrophandler = {action : null};
	var lpActor = new Actor("lowpass", context, canvas, dragdrophandler, function(){});

  var $sampleObjects = $('.sample-object');
  $sampleObjects.attr("draggable", "true")

  $sampleObjects.on("dragstart", function(ev) {
    ev.stopPropagation();
    dragdrophandler.action = "sample-object";
    ev.originalEvent.dataTransfer.setData('Text/html', $(ev.target).html());
    ev.dropEffect = "move";
  });

  $sampleObjects.click(function(ev) {
    ev.stopPropagation();
  });
  $sampleObjects.mousedown(function(ev) {
    ev.stopPropagation();
  });
  $sampleObjects.mouseup(function(ev) {
    ev.stopPropagation();
  });


	window.addEventListener("dragenter", function(e) {
    e.preventDefault();
	}, false);
	window.addEventListener("dragover", function(e) {
    e.preventDefault();
	}, false);
	window.addEventListener("drop", function(e) {
    e.preventDefault();

    var x = e.clientX;
		var y = e.clientY;

    if(e && e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      var files = e.dataTransfer.files;
	    for(var i = 0; i<files.length; i++) {
				loadFile(files[i], e);
	    }
    }
    else if(dragdrophandler.action) {
    	var action = dragdrophandler.action;
    	if(action === 'lowpass') {
    		// ... create audio node, connect, ...
    		dragdrophandler.action = null;

    		e.dataTransfer = 'copy';
    		var $newactor = lpActor.$creator.clone();
    		$newactor.css("left", x+"px").css("top", y).css("position", "absolute");
    		$newactor.on("dragstart", function(ev) {
			    ev.stopPropagation();
				});
				$newactor.on("dragstart", function(ev) {
			    ev.stopPropagation();
			    movingNode = true;
				});
				$newactor.on("dragstop", function(ev) {
			    ev.stopPropagation();
			    movingNode = false;
				});
        $('body').append($newactor);

        var f = context.createBiquadFilter();
        // var g = context.createGain();
        f.type = "lowpass";
        f.frequency.value = 300;
        f.Q.value = 3;
        var filter = new Filter(x,y,f,context);
        connectFilter(filter);
        filters.push(filter);


        var pos = $newactor.position();
        x = pos.left;
        x += $newactor.outerWidth() / 2;
        y = pos.top;
        y += $newactor.outerHeight() / 2;
        var circle = two.makeCircle(x, y, filter.radius);
        circle.fill = "#F80";
        circle.opacity = 0.3;

				$newactor.addClass("ui-widget-content");
        $newactor.css("border", "solid 4px #F80");
				$newactor.draggable({
				  drag: function( ev, ui ) {
				  	var elem = $newactor;
				  	var pos = elem.position();
				  	var x = pos.left;
				  	x += elem.outerWidth() / 2;
				  	var y = pos.top;
				  	y += elem.outerHeight() / 2;

				  	filter.x = x;
				  	filter.y = y;

            circle.translation.x = x;
            circle.translation.y = y;
            two.update();

				  	calcMixing(listener);
				  }
				});

				calcMixing(listener);
    	}
      else if(dragdrophandler.action==="sample-object") {
        console.log(e.dataTransfer.getData("text/html"));
        var name = e.dataTransfer.getData("text/html");

        var xhr = new XMLHttpRequest();
        xhr.open('GET', "data/"+name, true);
        xhr.responseType = 'arraybuffer';

        var ev = e;
        xhr.onload = function(e) {
          arrayBuffer2SampleView(xhr.response, name, ev);
        };


        xhr.send();
      }
    }
	}, false);


	var lastMouse = null;
	function drawPath(x, y) {
		if(lastMouse) {
			ctx.lineWidth = 3;
	    ctx.strokeStyle = "rgba(0, 0, 0, 1)";
	    ctx.fillStyle = "rgba(0, 0, 0, 1)";

			ctx.beginPath();
			ctx.moveTo(lastMouse.x,lastMouse.y);
			ctx.lineTo(x,y);
			ctx.stroke();

			lastMouse.x=x;
			lastMouse.y=y;
		}
		else {
			lastMouse = {x:x, y:y};
		}
	}

	var $listener = $("#listener");
	// var moveListener = false;
	var movingNode = false;
	$listener.click(function(ev) {
		ev.stopPropagation();
	});
	$listener.mousedown(function(ev) {
		ev.stopPropagation();
	});
	$listener.mouseover(function(ev) {
		draw =false;
		lastMouse = null;
	});
	$listener.mouseup(function(ev) {
		// ev.stopPropagation();
	});
	// $listener.on("dragstart", function(ev) {
 //    ev.stopPropagation();
 //    moveListener = true;
	// });
	// $listener.on("dragstop", function(ev) {
 //    ev.stopPropagation();
 //    moveListener=false;
	// });
  var top = window.innerHeight / 2;
  var left = window.innerWidth / 2;
  $listener.css("position","absolute").css("top",top+"px").css("left",left+"px");
  listener.x = left + $listener.outerWidth()/2;
  listener.y = top + $listener.outerHeight()/2;

  var circle = two.makeCircle(listener.x, listener.y, 7);
  circle.fill = "#F77";
  circle.noStroke();
  circle.opacity = 1;

	$listener.addClass("ui-widget-content");
  function listenerPosition(x, y) {
    var elem = $listener;

    $listener.css("left",(x-$listener.outerWidth()/2)+"px");
    $listener.css("top",(y-$listener.outerHeight()/2)+"px");

    listener.x = x;
    listener.y = y;
    circle.translation.x = x;
    circle.translation.y = y;
    // two.update();
    calcMixing(listener);
  }
  function translateListener(tx, ty) {
    // var elem = $listener;
    // var pos = elem.position();
    // var x = pos.left;
    // x += elem.outerWidth() / 2;
    // var y = pos.top;
    // y += elem.outerHeight() / 2;
    listenerPosition(listener.x+tx, listener.y+ty)
  }
	$listener.draggable({
	  drag: function( ev, ui ) {
	  	var elem = $listener;
	  	var pos = elem.position();
	  	var x = pos.left;
	  	x += elem.outerWidth() / 2;
	  	var y = pos.top;
	  	y += elem.outerHeight() / 2;
      listenerPosition(x,y);
	  	// listener.x = x;
	  	// listener.y = y;

    //   circle.translation.x = x;
    //   circle.translation.y = y;
    //   two.update();

	  	// calcMixing(listener);
	  }
	});


	$( "body" ).mousemove(function( event ) {
		var mx = event.pageX;
		var my = event.pageY;
		if(draw) {
			drawPath(mx,my);
		}
	});

	var draw = false;
	$('canvas').mousedown(function(ev) {
		draw = true;
	});
	$('canvas').mouseup(function(ev) {
		draw = false;
		lastMouse = null;
	});





	$(window).resize(function() {
		// console.log($(window).outerWidth());
		// reposition elements
		// --> recalculate audio mixing
		listener.maxDist = Math.sqrt(window.innerHeight*window.innerHeight + window.innerWidth*window.innerWidth);
	});

	$(window).resize();

  var listenerspeed = 3;
  ml = {l:false,u:false,r:false,d:false};
  $(document).keydown(function(e) {
      switch(e.which) {
          case 65: // left
          ml.l=true;
          break;

          case 87: // up
          ml.u=true;
          break;

          case 68: // right
          ml.r=true;
          break;

          case 83: // down
          ml.d=true;
          break;

          default: return;
      }
      e.preventDefault();
  });
  $(document).keyup(function(e) {
      switch(e.which) {
          case 65: // left
          ml.l=false;
          break;

          case 87: // up
          ml.u=false;
          break;

          case 68: // right
          ml.r=false;
          break;

          case 83: // down
          ml.d=false;
          break;

          default: return;
      }
      e.preventDefault();
  });

  two.bind('update', function(frameCount) {
    // This code is called everytime two.update() is called.
    // Effectively 60 times per second.
    if(ml.l) {
      translateListener(-listenerspeed,0);
    }
    if(ml.u) {
      translateListener(0,-listenerspeed);
    }
    if(ml.r) {
      translateListener(listenerspeed,0);
    }
    if(ml.d) {
      translateListener(0,listenerspeed);
    }
  }).play();
});