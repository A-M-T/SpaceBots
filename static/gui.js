
// # Rendering

// Now, that we can communicate and manage our robot, we should create GUI
// that would allow you to see what is going on around and issue commands.

// We will do our rendering using <canvas> element that is already on the page.
var canvas = document.getElementById('canvas');

// To draw, we have to get drawing context first.
var ctx = canvas.getContext('2d');

// Small fix for browsers that does not support dashed lines.
if (!ctx.setLineDash) {
  ctx.setLineDash = function () {};
  ctx.lineDashOffset = 0;
}

// This function should fire every time the screen is refreshed. This usually
// happens 60 times per second but it might differ depending on the screen.
// We use `requestAnimationFrame` to run our animation exactly when the screen
// refreshes, but as a fallback (when `requestAnimationFrame` isn't available)
//  we try to use other methods.
var animate = window.requestAnimationFrame       ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame    ||
  function animate(f) { setTimeout(f, 1000 / 60); };

// We will do 3d rendering using isometric projection. World axes will be
// placed like this:
//                                 .
//                                /|\    Y (0,1,0)
//                                 |
//                                 |
//                                 o (0,0,0)
//                                / \
//                   (0,0,1) Z   /   \   X (1,0,0)
//                             \/_   _\/
//
// Each axis should have length equal to 1 - this will make 3d spheres
// correspond to circles on the screen.
// Also - to stay coherent with most of isometric pixelart, the X and Z axes
// will have width twice their height.
//
//           --
//           - --  sqrt(5)*x
//          x-   --
//           -     --
//           ----------
//              2x
//
// Solving for x, we get following width and height of X and Z axes:

var XZ_width = 2 / Math.sqrt(5);
var XZ_height = 1 / Math.sqrt(5);

// This will be virtual camera that will contain 3d coordinates where we are
// looking.
var camera = vectors.create();

// TODO: docs
Float32Array.prototype.getScreenX = function getScreenX() {
  return (this[0] - camera[0]) * XZ_width - (this[2] - camera[2]) * XZ_width + canvas.width / 2;
};
Float32Array.prototype.getScreenY = function getScreenY() {
  return (this[0] - camera[0]) * XZ_height + (this[2] - camera[2]) * XZ_height - (this[1] - camera[1]) + canvas.height / 2;
};

// Here are some drawing functions for various primitives on the screen:

// Here is the line between `a` and `b`:
var line = function line(a, b) {
  ctx.beginPath();
  ctx.moveTo(a.getScreenX(), a.getScreenY());
  ctx.lineTo(b.getScreenX(), b.getScreenY());
  ctx.stroke();
};

// This function will draw slightly flattened ellipse at screen coordinates `x`,
// `y` with width `w`.
var ellipse = function ellipse(x, y, w) {
  var h = w / 2;
  var kappa = .5522848,
  ox = (w / 2) * kappa, // control point offset horizontal
  oy = (h / 2) * kappa, // control point offset vertical
  xe = x + w,           // x-end
  ye = y + h,           // y-end
  xm = x + w / 2,       // x-middle
  ym = y + h / 2;       // y-middle

  ctx.translate(-w/2, -h/2);
  ctx.beginPath();
  ctx.moveTo(x, ym);
  ctx.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
  ctx.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
  ctx.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
  ctx.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
  ctx.closePath();
  ctx.fill();
  ctx.translate(w/2, h/2);
};

// This function will draw "shadow" from lines. It will help visualise, where
// the point is in 3d space.
Float32Array.prototype.drawShadow = function drawShadow(color) {
  // `b` is the base of point `p` - it has the same coordinates (this is
  // achieved by using `p` as a prototype) except coordinate `y` which is set
  // to 0.
  var top_y = this.getScreenY();
  var base_y = (this[0] - camera[0]) * XZ_height + (this[2] - camera[2]) * XZ_height + canvas.height / 2;
  var x = this.getScreenX();

  ctx.strokeStyle=color;
  ctx.fillStyle=color;
  ctx.setLineDash([5]);

  ctx.beginPath();
  ctx.moveTo(x, top_y);
  ctx.lineTo(x, base_y);
  ctx.stroke();

  ctx.setLineDash([0]);

  ellipse(x, base_y, 10);
};

// When drawing images from the internet, we could cache their contents to
// download them only once. We will do this in this object. It's keys are
// going to be urls and values - images downloaded from the internet.
var image_cache = {};

var explosions = [];
socket.on('explosion', function explosion(data) {
  data.reported = current_time;
  data.position = vectors.create(data.position);
  data.screen_position = vectors.create(2);
  explosions.push(data);
  new Audio('/boom'+Math.floor(Math.random()*3)+'.ogg').play();
});

var stars = [];
var scale = { current: 1, target: 1 };

var get_image = function get_image(url, url2) {
  if(url2) {
    if(image_cache[url2] !== 'loading') {
      if(image_cache[url2])
        return image_cache[url2];
      var second = new Image;
      second.onload = function image_onload() {
        image_cache[url2] = second;
      };
      second.src = url2;
      image_cache[url2] = 'loading';
    }
  }

  if(!(url in image_cache)) {
    image_cache[url] = new Image;
    image_cache[url].src = url;
  }
  return image_cache[url];
};

var get_frame_count = function get_frame_count(filename) {
  var match = /(\d+)\.png$/.exec(filename);
  if(match) {
    return Number(match[1]);
  }
  return 1;
};

// Finally, this is function that will draw everything on the screen.
var tick = function tick(time) {

  // First - we convert time from milliseconds to seconds.
  time = time / 1000;
  current_time = time;

  // Next, we schedule next execution of `tick`.
  animate(tick);

  // The drawing begins with clearing canvas by filling it with background.
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  var now = +new Date;

  // If we have avatar, we will move camera by 1/10th the distance towards it.
  if(avatar && get_position_now(avatar)) {
    camera = get_position_now(avatar);
  }

  scale.current += (scale.target - scale.current) / 5;

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(scale.current, scale.current);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);

  if(radio) {
    ctx.strokeStyle = 'red';
    ctx.lineWidth = radio.radio_range / 160;
    ctx.setLineDash([radio.radio_range / 20]);
    ctx.beginPath();
    ctx.arc(canvas.width/2, canvas.height/2, radio.radio_range, 0, 2 * Math.PI, true);
    ctx.stroke();
    ctx.setLineDash([0]);
    ctx.lineWidth = 1;
  }

  // We set the color for lines and ellipses of shadows.
  ctx.strokeStyle = 'white';
  ctx.fillStyle = 'white';

  var star_life = 200;
  for(var i = 0; i < stars.length; ++i) {
    var s = stars[i];
    s.age += 1;
    var a = Math.sin(s.age / star_life * Math.PI);
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(s.position.getScreenX(), s.position.getScreenY(), 2*a / scale.current, 0, 2*Math.PI, false);
    ctx.fill();
    if(s.age >= star_life) {
      s.age = 0;
      s.position.make_random2(500/scale.current).add(camera);
    }
  }
  ctx.globalAlpha = 1;

  if((stars.length < 200) && (Math.random() < 0.5)) {
    stars.push({
      age: 0,
      position: vectors.random2(500/scale.current).add(camera)
    });
  }

  var arr = common.dict_to_array(objects).filter(function position_filter(o) {
    return 'position' in o;
  });
  arr.sort(function position_sort(a, b) {

    return a.position[0] +
      a.position[1] / 100 +
      a.position[2] -
      b.position[0] -
      b.position[1] / 100 -
      b.position[2];
  });

  // Now, we draw every object from the `objects` set
  for(var i = 0; i < arr.length; ++i) {
    var obj = arr[i];
    var pos = get_position_now(obj);

    if(messages[obj.id]) {
      ctx.save();
      ctx.font = 'bold 20px Dosis';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      messages[obj.id].forEach(function draw_message(msg, j) {
        if(current_time - msg.time < 8) {
          ctx.fillStyle = '#' + obj.id.substring(0, 6);
          ctx.strokeStyle = 'white';
        } else {
          ctx.fillStyle = 'rgba(' + 
            parseInt(obj.id.substring(0, 2), 16) + ',' +
            parseInt(obj.id.substring(2, 4), 16) + ',' +
            parseInt(obj.id.substring(4, 6), 16) + ',' +
            (1 - (current_time - msg.time - 8)/3) + ')';
          ctx.strokeStyle = 'rgba(255,255,255,' +
            (1 - (current_time - msg.time - 8)/3) + ')';
        }
        var X = obj.position.getScreenX();
        var Y = obj.position.getScreenY() - j * 20 - 20;
        ctx.strokeText(msg.text, X, Y);
        ctx.fillText(msg.text, X, Y);
      });
      messages[obj.id] = messages[obj.id].filter(function filter_messages(o) {return current_time - o.time < 11;});
      if(messages[obj.id].length == 0) delete messages[obj.id];
      ctx.restore();
    }

    var a = 1 - (time - obj.fetch_time)/2;
    if(a <= 0) continue;
    ctx.globalAlpha = a;

    try {
      pos.drawShadow('white');
    } catch(e) {
      console.log(pos, obj.velocity, obj.position.drawShadow, obj.sprite);
    }

    var sprite_url = obj.sprite || '/unknown.png';
    var sprite = get_image(sprite_url, user_sprites && obj.user_sprite);

    var frames = get_frame_count(sprite_url);

    var fw = sprite.width / frames;
    var fh = sprite.height;

    var sx = (Math.round(time * 30) % frames) * fw;
    var sy = 0;

    try {
    ctx.drawImage(
      sprite,
      sx, sy, fw, fh,
      pos.getScreenX() - fw/2,
      pos.getScreenY() - fh/2,
      fw, fh
    );
    } catch(e) {
      console.log(pos);
    }

    ctx.globalAlpha = 1;

  }

  draw_explosions(time);

  if(manipulator) {
    ctx.strokeStyle = 'white';
    ctx.setLineDash([1, 8]);
    ctx.lineDashOffset = time * 2;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    if(radio) {
      ctx.beginPath();
      ctx.arc(canvas.width/2, canvas.height/2, manipulator.manipulator_range, 0, 2 * Math.PI, false);
      ctx.stroke();
    }
    ctx.lineDashOffset = 0;
    ctx.setLineDash([1,0]);

    if(manipulator.manipulator_slot) {
      var pos_a = common.get_position(manipulator.manipulator_slot);
      var pos_b = common.get_position(manipulator);
      if(pos_a.dist(pos_b) > manipulator.manipulator_range) {
        delete manipulator.manipulator_slot.grabbed_by;
        delete manipulator.manipulator_slot;
      }
    }

    if(manipulator.manipulator_slot) {
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 3;
      line(manipulator.position, manipulator.manipulator_slot.position);
      ctx.strokeStyle = '#00ffaa';
      ctx.lineWidth = 2;
      line(manipulator.position, manipulator.manipulator_slot.position);
    }
  }


  ctx.restore();

  // Execute animate function from the tutorial

  if(tutorial_process < tutorial_strings.length && tutorial_strings[tutorial_process].animate) tutorial_strings[tutorial_process].animate();

  // Check if the step is finished, and set the button state

  var btn = document.getElementById("tutwindow_button");
  if(tutorial_process < tutorial_strings.length && tutorial_strings[tutorial_process].finished) {
    if(tutorial_strings[tutorial_process].finished()) {
      btn.disabled = false;
    } else {
      btn.disabled = true;
    }
  } else {
    btn.disabled = false;
  }


  if(focused_obj) {
    var root = common.get_root(focused_obj);
    var current_pos = get_position_now(root);
    document.querySelectorAll('.set_x').text(Math.round(current_pos[0]));
    document.querySelectorAll('.set_y').text(Math.round(current_pos[1]));
    document.querySelectorAll('.set_z').text(Math.round(current_pos[2]));
  }

  // Update fetch_time and position if in tutorial mode
  if(document.getElementById("tutwindow").style.display != "none") {
    for(var obj in objects) {
      if(objects[obj].position) objects[obj].position = get_position_now(objects[obj]);
      objects[obj].fetch_time = current_time;
    }
  }
};
animate(tick);

var draw_explosions = function(time) {

  for(var i = explosions.length-1; i >= 0; --i) {
    var e = explosions[i];
    var sprite_url = e.sprite;
    var sprite = get_image(sprite_url);
    var frames = get_frame_count(sprite_url);

    var dt = time - e.reported;
    if(i == 10)
      console.log(i, time, e.reported, e.duration, dt);
    if(dt > e.duration) {
      explosions.splice(i, 1);
    } else {
      e.position.drawShadow('rgba(255,0,0,'+(1 - dt / e.duration)+')');

      var fw = sprite.width / frames;
      var fh = sprite.height;
      var sx = Math.round(frames * dt / e.duration) * fw;
      var sy = 0;

      ctx.drawImage(
        sprite,
        sx, sy, fw, fh,
        e.position.getScreenX() - fw/2,
        e.position.getScreenY() - fh/2,
        fw, fh
      );
    }
  }
};

var controls = {};

controls.skeleton = function(elem, object) {
  var list = document.createElement('ol');
  for(var i = 0; i < object.skeleton_slots.length; ++i) {
    var item = document.createElement('li');
    item.classList.add('drag');
    var child = object.skeleton_slots[i];
    if(child) {
      var link = document.createElement('a');
      link.textContent = child.id.slice(0, 4);
      link.classList.add('object');
      link.href = '#' + child.id;
      item.appendChild(link);

      if(child.features) {
        Object.keys(child.features).forEach(function(feature) {
          var icon = document.createElement('img');
          icon.src = '/features/' + feature + '.png';
          icon.setAttribute('title', feature);
          item.appendChild(icon);
        });
      }

    } else {
      var text_node = document.createTextNode('empty');
      item.appendChild(text_node);
    }
    list.appendChild(item);
  }
  elem.appendChild(list);
};

controls.avatar = function(elem, object) {
  elem.appendChild(document.createTextNode('Avatar status: OK'));
};

controls.radio = function(elem, object) {
  var template = document.getElementById("radio_controls").content;
  template.querySelectorAll('.range').text(Math.round(object.radio_range));
  template.querySelectorAll('.status').text(radio_scanner.status());
  template.querySelectorAll('.interval').text(radio_scanner.interval);
  elem.appendChild(template.cloneNode(true));
};

controls.manipulator = function(elem, object) {
  var template = document.getElementById("manipulator_controls").content;
  template.querySelectorAll('.set_id').text(document.querySelector('.focused').id.substr(0, 4));
  elem.appendChild(template.cloneNode(true));
};

controls.store = function(elem, object) {
  var scvs = document.createElement('canvas');
  scvs.width = 200;
  scvs.height = 100;
  elem.appendChild(scvs);

  var max = 0;
  var sum = 0;
  for(var i = 0; i < 100; ++i) {
    max = Math.max(max, object.store_stored[i]);
    sum += object.store_stored[i];
  }

  var desc = 'Filled ' + Math.round(sum) + '/' + Math.round(object.store_capacity);
  elem.appendChild(document.createTextNode(desc));

  var sctx = scvs.getContext('2d');
  sctx.lineWidth = 2;
  for(var i = 0; i < 100; ++i) {
    sctx.beginPath();
    sctx.moveTo(i*2+1, 100);
    sctx.lineTo(i*2+1, 100 - object.store_stored[i] / max * 100);
    sctx.stroke();
  }
};

controls.battery = function(elem, object) {
  var desc = 'Filled ' + Math.round(object.battery_energy) + '/' + Math.round(object.battery_capacity);
  elem.appendChild(document.createTextNode(desc));
};

controls.impulse_drive = function(elem, object) {
  var template = document.getElementById("impulse_drive_controls").content;
  template.querySelectorAll('.set_id').text(document.querySelector('.focused').id.substr(0, 4));
  elem.appendChild(template.cloneNode(true));
};

var stringify = function(o) {
  return JSON.stringify(o, function(key, value) {
    if(typeof value === 'number') {
      return Math.round(value*100)/100;
    }
    return value;
  }, '  ').replace(/\n/g, '<br>').replace(/ /g, '&nbsp;')
};

controls.laboratory = function(elem, object) {
  var template = document.getElementById("laboratory_controls").content;
  template.querySelector('.laboratory_slots').innerHTML = stringify(object.laboratory_slots);
  elem.appendChild(template.cloneNode(true));
};

controls.assembler = function(elem, object) {
  var template = document.getElementById("assembler_controls").content;
  elem.appendChild(template.cloneNode(true));
};

var element_in_document = function( element ) {
  if (element === document) {
    return true;
  }
  element = element.parentNode;
  if (element) {
    return element_in_document ( element );
  }
  return false;
};

var top_index = 1;
var focused_obj;

var focus_details = function(details) {
  if(details.id.match(/[0-9A-F]{32}/i)) {
    focused_obj = common.get(details.id);
    var focused = document.querySelector('.focused');
    if(focused) {
      focused.classList.remove('focused');
    }
    details.classList.add('focused');
    document.querySelectorAll('.set_id').text(details.id.substr(0, 4));
  }
  details.style['z-index'] = top_index++;
};

var drag;
var show_details_for = function(object, event) {
  var details = document.getElementById(object.id);
  if(!details) {

    var t = document.getElementById('details');

    t.content.querySelector('h2').textContent = object.id.slice(0, 4);

    var features = t.content.querySelector('.features');
    while(features.hasChildNodes()) {
      features.removeChild(features.lastChild);
    }
    if(object.features) {
      Object.keys(object.features).forEach(function(feature) {
        var icon = document.createElement('img');
        icon.src = '/features/' + feature + '.png';
        icon.setAttribute('title', feature);
        icon.classList.add('feature');
        t.content.querySelector('.features').appendChild(icon);
      });
    }

    details = t.content.cloneNode(true).querySelector('.details');
    details.id = object.id;
    document.getElementById('overlay').appendChild(details);


    var view = details.querySelector('canvas.sprite');
    var cx = view.getContext('2d');
    var draw = function(time) {
      time /= 1000;

      if(!element_in_document(view)) return;
      animate(draw);
      cx.clearRect(0,0, view.width, view.height);
      var sprite_url = object.sprite || '/unknown.png';

      if(!(sprite_url in image_cache)) {
        image_cache[sprite_url] = new Image;
        image_cache[sprite_url].src = sprite_url;
      }

      var sprite = image_cache[sprite_url];

      var match = /(\d+)\.png$/.exec(sprite_url);
      var frames = 1;
      if(match) {
        frames = Number(match[1]);
      }

      var fw = sprite.width / frames;
      var fh = sprite.height;

      view.width = fw;
      view.height = fh;

      var sx = (Math.round(time * 30) % frames) * fw;
      var sy = 0;

      cx.drawImage(
        sprite,
        sx, sy, fw, fh,
        0,
        0,
        fw, fh
      );
    };
    animate(draw);

  }

  focus_details(details);

  var rect = details.getBoundingClientRect();
  var w2 = (rect.right - rect.left) / 2;
  var h2 = (rect.bottom - rect.top) / 2;

  details.style.left = (event.x - w2) + 'px';
  details.style.top = (event.y - h2) + 'px';

  drag = {
    dragged: details,
    x: event.x,
    y: event.y
  };
  return details;
};

var find_parent = function(element, className) {
  while(!element.classList.contains(className)) {
    element = element.parentElement;
    if(element == null) {
      return undefined;
    }
  }
  return element;
};

var dont_drag_by = {
  "A": true,
  "BUTTON": true,
  "INPUT": true,
  "TEXTAREA": true
};

var can_drag = function(element) {
  if(element.classList.contains('ace_content')) return false;
  if(element.contentEditable == "true") return false;
  if(dont_drag_by[element.tagName]) return false;
  return true;
};

document.addEventListener('mousemove', function(e) {
  if(drag) {
    var dx = e.x - drag.x;
    var dy = e.y - drag.y;
    drag.dragged.style.left = drag.dragged.offsetLeft + dx + 'px';
    drag.dragged.style.top = drag.dragged.offsetTop + dy + 'px';
    drag.x = e.x;
    drag.y = e.y;
  }
}, true);

document.addEventListener('mousedown', function(e) {
  if(find_parent(e.target, 'nobubble')) {
    e.stopPropagation();
  }
}, true);

document.addEventListener('mousedown', function(e) {

  var details = find_parent(e.target, 'details');

  if(details && e.button == 1) {
    if(details.classList.contains('focused')) {
      focused_obj = undefined;
      details.classList.remove('focused');
    }
    details.remove();
    e.stopPropagation();
    e.preventDefault();
  } else if(e.button == 0) {
    if((e.target.tagName == 'A') && (e.target.href.indexOf('#') >= 0)) {
      var hash = e.target.href.split('#')[1];
      show_details_for(objects[hash], e);
      e.preventDefault();
      e.stopPropagation();
    } else if(e.target.classList.contains('feature')) {
      var curr = e.target;
      var controls_div;
      while((controls_div = curr.querySelector('.controls')) == null) {
        curr = curr.parentElement;
      }

      var details = curr;
      while(!details.classList.contains('details')) {
        details = details.parentElement;
      }

      while (controls_div.hasChildNodes()) {
        controls_div.removeChild(controls_div.lastChild);
      }

      var feature = e.target.getAttribute('title');
      var object = objects[details.id];
      controls[feature](controls_div, object);

      // Notify the tutorial code that we're changing controls

      if(tutorial_process < tutorial_strings.length && tutorial_strings[tutorial_process].on_controlschange) tutorial_strings[tutorial_process].on_controlschange(details.id, feature);

    } else if(details && can_drag(e.target)) {
      drag = {
        dragged: details,
        x: e.x,
        y: e.y
      };
      e.preventDefault();
      e.stopPropagation();
      focus_details(details);
    }
  }
}, false);

document.addEventListener('mouseup', function(e) {
  drag = undefined;
}, true);

canvas.addEventListener('mousedown', function(e) {
  if(e.button == 0) {
    var clicked;
    var closest = 30;
    for(var hash in objects) {
      var o = objects[hash];
      if(o.position) {
        var dx = (o.position.getScreenX() - canvas.width/2) * scale.current + canvas.width/2 - e.x;
        var dy = (o.position.getScreenY() - canvas.height/2) * scale.current + canvas.height/2 - e.y;

        var d = Math.sqrt(dx*dx+dy*dy);
        if(d < closest) {
          closest = d;
          clicked = o;
        }
      }
    }
    if(clicked) {
      show_details_for(clicked, e);
    } else {
      focused_obj = undefined;
      var focused = document.querySelector('.focused');
      if(focused) focused.classList.remove('focused');
    }
    e.stopPropagation();
    e.preventDefault();
  } else if(e.button == 1) {
    scale.target = 1;
  }
}, false);

canvas.addEventListener('mousewheel', function(e) {
  var f = 1 + e.wheelDelta / 1000;
  scale.target *= f;
}, false);

onresize = function(e) {
  var dw = window.innerWidth - canvas.width;
  var dh = window.innerHeight - canvas.height;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  for(var hash in objects) {
    var obj = objects[hash];
    if(obj.screen_position) {
      obj.screen_position.x += dw/2;
      obj.screen_position.y += dh/2;
    }
  }

  document.getElementById("tutorial").style.left = (window.innerWidth/2 - 150)+"px";
  document.getElementById("tutorial").style.top = (window.innerHeight/2 - 50)+"px";

  // Execute resize function from the tutorial

  if(tutorial_process < tutorial_strings.length && tutorial_strings[tutorial_process].resize) tutorial_strings[tutorial_process].resize();
};
onresize();

