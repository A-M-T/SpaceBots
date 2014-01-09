
// # Rendering

// Now, that we can communicate and manage our robot, we should create GUI
// that would allow you to see what is going on around and issue commands.

// We will do our rendering using <canvas> element that is already on the page.
var canvas = document.getElementById('canvas');

// To draw, we have to get drawing context first.
var ctx = canvas.getContext('2d');

if(typeof ctx.setLineDash === 'undefined') {
  if(typeof ctx.mozDash !== 'undefined') {
    ctx.setLineDash = function(arr) { 
      if(arr[0] == 0) ctx.mozDash = null;
      else ctx.mozDash = arr;
    };
  } else {
    ctx.setLineDash = function() {};
  }
}

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

var X_width = Z_width = 2 / Math.sqrt(5);
var X_height = Z_height = 1 / Math.sqrt(5);
var Y_height = 1, Y_hidden = 0;

// This will be virtual camera that will contain 3d coordinates where we are
// looking.
var camera = vectors.create();

// TODO: docs
Float32Array.prototype.getScreenX = function getScreenX() {
  return (this[0] - camera[0]) * X_width + (this[2] - camera[2]) * Z_width + canvas.width / 2;
};
Float32Array.prototype.getScreenY = function getScreenY() {
  return (this[0] - camera[0]) * X_height + (this[2] - camera[2]) * Z_height - (this[1] - camera[1]) * Y_height + canvas.height / 2;
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
  var h = w * Y_hidden;
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
  var base_y = (this[0] - camera[0]) * X_height + (this[2] - camera[2]) * Z_height + canvas.height / 2;
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
  requestAnimationFrame(tick);

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
      position: vectors.random2(300/scale.current).add(camera)
    });
  }
  
    
  ctx.save();
  for(var cid in objects) {
    var c = objects[cid];
    if(!c.a || !c.b) continue;
    var a = get_position_now(c.a);
    var b = get_position_now(c.b);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'black';
    line(a, b);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'white';
    line(a, b);
  }
  ctx.restore();

  var arr = common.dict_to_array(objects).filter(function position_filter(o) {
    return 'position' in o;
  });
  arr.sort(function position_sort(a, b) {
    return a.position[0] +
      a.position[2] -
      b.position[0] -
      b.position[2];
  });

  // Now, we draw every object from the `objects` set
  for(var i = 0; i < arr.length; ++i) {
    var obj = arr[i];
    var pos = get_position_now(obj);

    if(messages[obj.id]) {
      ctx.save();
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

    var sprite_url = obj.sprite || 'unknown.png';
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
    } catch(e) {}

    var short_id = obj.id.substring(0, 6);
    ctx.fillStyle = '#' + short_id;
    ctx.fillText(short_id, pos.getScreenX(), pos.getScreenY() - fh/2);

    ctx.globalAlpha = 1;

  }

  draw_explosions(time);

  if(manipulator) {
    ctx.strokeStyle = 'white';
    ctx.setLineDash([1, 8]);
    ctx.lineDashOffset = time * 2;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    var p = get_position_now(manipulator);
    if(radio) {
      ctx.beginPath();
      ctx.arc(p.getScreenX(), p.getScreenY(), manipulator.manipulator_range, 0, 2 * Math.PI, false);
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

    if(manipulator.manipulator_slot && manipulator.manipulator_slot.position) {
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 3;
      line(manipulator.position, manipulator.manipulator_slot.position);
      ctx.strokeStyle = '#00ffaa';
      ctx.lineWidth = 2;
      line(manipulator.position, manipulator.manipulator_slot.position);
    }
  }


  ctx.restore();

};
requestAnimationFrame(tick);

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

var hovered;

canvas.addEventListener('mousemove', function(e) {
  var alpha = Math.PI * e.x / innerWidth * 2;
  var pitch = Math.PI * e.y / innerHeight / 2;
  
  X_width = Math.sin(alpha);
  X_height = Math.cos(pitch) * Math.cos(alpha);
  
  Z_width = -Math.cos(alpha);
  Z_height = Math.cos(pitch) * Math.sin(alpha);

  Y_height = Math.sin(pitch);
  Y_hidden = Math.cos(pitch);

  hovered = null;
  var closest = 30;
  for(var hash in objects) {
    var o = objects[hash];
    if(o.position) {
      var dx = (o.position.getScreenX() - canvas.width/2) * scale.current + canvas.width/2 - e.x;
      var dy = (o.position.getScreenY() - canvas.height/2) * scale.current + canvas.height/2 - e.y;

      var d = Math.sqrt(dx*dx+dy*dy);
      if(d < closest) {
        closest = d;
        hovered = o;
      }
    }
  }
}, true);

canvas.addEventListener('contextmenu', function(e) {
  e.preventDefault();
  return false;
}, false);

canvas.addEventListener('mousedown', function(e) {
  if(e.button == 0 && hovered)
    prompt("Press Ctrl + C and Enter.", hovered.id);
  else if(e.button == 2 && hovered)
    prompt("Press Ctrl + C and Enter.", 'objects["'+hovered.id+'"]');
  else if(e.button == 1)
    scale.target = 1;
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
  ctx.font = '20px "Share Tech"';
  ctx.textAlign = 'center';
  ctx.imageSmoothingEnabled = false;
};
onresize();
