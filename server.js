
var fs = require('fs');
var sty = require('sty');
var argv = require('optimist').argv;

var logger = require('./logger');

global.warranty = function() {
  process.stdout.write(fs.readFileSync('WARRANTY').toString());
};

global.copyright = function() {
  process.stdout.write(fs.readFileSync('LICENSE').toString());
}

var nesh = require('nesh');
nesh.log = logger;
nesh.config.load();
nesh.start({
  prompt: '> ',
  useGlobal: true,
  useColors: true,
  ignoreUndefined: true,
  historyFile: '.spacebots_history',
  historyMaxInputSize: 1024 * 1024,
  welcome: sty.b('SpaceBots')+' Copyright (C) 2013  Marek Rogalski\n' +
    'This program comes with ABSOLUTELY NO WARRANTY; for details type "warranty()".\n' +
    'This is free software, and you are welcome to redistribute it under certain\n' +
    'conditions; type "copyright()" for details.'
}, function(err, repl) {
  if(err) {
    logger.error(err);
    return;
  }

  repl.on('exit', function () {
    process.stdout.write(sty.u('(keyboard exit)\n'));
    process.exit();
  });
});

var listener = require('./listener');

var io = listener.io;

var app = listener.app;

logger.info('Listening on port ' + listener.port);

// Begin game logic

var common = require('./static/common'),
vectors = require('./static/vectors'),
resources = require('./static/resources'),
bp = require('./static/blueprints'),
physics = require('./static/physics'),
check = require('validator').check,
sanitize = require('validator').sanitize;

var objects = global.objects = physics.objects;

var reg = function(obj) {
  objects[obj.id] = obj;
  return obj;
};

var connect = function(a, b) {
  var c = {
    id: common.uid(),
    a: a, b: b,
    features: { rigid: true, relay: true },
    mass: 5,
    integrity: 10000
  };
  a.connections.push(c);
  b.connections.push(c);
  reg(c);
  return c;
};

var asteroids = global.asteroids = [];

var make_asteroid = function() {
  return {
    id: common.uid(),
    features: {},
    composition: resources.make_resources(common.rnd_exp(5, 10), 14, 20),
    connections: [],
    sprite: '/asteroid100.png',
    position: vectors.create(),
    velocity: vectors.create(),
  };
};

for(var i = 0; i < 60; ++i) {
  var asteroid = reg(make_asteroid());
  asteroid.position = vectors.random2(3000);
  asteroid.velocity = vectors.random2(5);
  asteroids.push(asteroid);
}

var create_and_add = function(a, features) {
  var b = reg(bp.make(features, 10));
  b.position = vectors.random2(50).add(a.position);
  b.velocity = vectors.create(a.velocity);
  connect(a, b);
  return b;
};

var get_or_create_player = function(hash) {
  if(!(hash in objects)) {

    var hull = reg(bp.make('manipulator', 10));
    hull.position = vectors.random2(200);
    hull.velocity = vectors.random2(5);

    var avatar = create_and_add(hull, 'avatar radio');
    avatar.radio_range = 1000;

    var drive = create_and_add(hull, 'impulse_drive store battery');
    drive.store_stored[0] = drive.store_capacity*0.75;
    drive.battery_energy = drive.battery_capacity;

    create_and_add(hull, 'assembler refinery spectrometer');
    create_and_add(hull, 'laboratory enriching_reactor burning_reactor');

    var player = reg({
      id: hash,
      avatars: {}
    });

    player.avatars[avatar.id] = avatar;
  }
  return objects[hash];
};

var colors = 'red green yellow blue magenta cyan'.split(' ');

var random_color = function() {
  var i = Math.floor(Math.random() * colors.length);
  return colors[i];
};

var stub = function(obj) {
  if(obj) return { id: obj.id };
};

attractor = reg(make_asteroid());
attractor.sprite = '/attractor151.png';
delete attractor.velocity;

apply_secret_force = function(object) {
  for(var i = 0; i < 3; ++i) {
    var v = object.position[i];
    if(v < -2000) {
      var cc = common.walk(object, 'rigid');
      var delta = - v - 4000 - v;
      for(var id in cc) {
        if(cc[id].position) cc[id].position[i] += delta;
        if(cc[id].velocity) cc[id].velocity[i] = -cc[id].velocity[i];
      }
    }
    if(v > 2000) {
      var cc = common.walk(object, 'rigid');
      var delta = - v + 4000 - v;
      for(var id in cc) {
        if(cc[id].position) cc[id].position[i] += delta;
        if(cc[id].velocity) cc[id].velocity[i] = -cc[id].velocity[i];
      }
    }
  }
};

attract = function() {
  for(var hash in objects) {
    var object = objects[hash];
    if(object.position && object.velocity) {
      object.position.add(object.velocity, 0.01);
      apply_secret_force(object);
    }
    if(object.manipulator_slot) {
      var pos_a = common.get_position(object.manipulator_slot);
      var pos_b = common.get_position(object);
      if(pos_a && pos_b && pos_a.dist(pos_b) > object.manipulator_range) {
        delete object.manipulator_slot.grabbed_by;
        delete object.manipulator_slot;
      }
    }
  }
  setTimeout(attract, 10);
};

attract();

var physics_destroy = physics.destroy;
var destroy = global.destroy = physics.destroy = function(object) {

  logger.info(object.id + ' destroyed');

  var cc = common.walk(object, 'relay');
  for(var k in cc) {
    var o = cc[k];
    if(o.features.avatar) {
      io.sockets.in(k).emit('destroyed', stub(object));
    }
  }

  physics_destroy(object);

};

var physics_thrust = physics.thrust;
var thrust = global.thrust = physics.thrust = function(object, momentum) {

  logger.info('thrust on ' + object.id.slice(0,4) + ' : ' + momentum);

  physics_thrust(object, momentum);

};

var last_commands_db = {};
var last_accounts = {};

io.sockets.on('connection', function (socket) {
  var player = undefined;
  var address = socket.handshake.address;
  var last_commands;

  if(argv.throttle === 'player') {
    last_commands = [0,0,0,0,0,0,0,0,0,0];
  } else {
    if(address in last_commands_db) {
      last_commands = last_commands_db[address];
    } else {
      last_commands_db[address] = last_commands = [0,0,0,0,0,0,0,0,0,0];
    }
  }

  var name = sty.b(sty[random_color()](address.address));
  var current_handler = 'unknown';

  (function() {
    var old_emit = socket.emit;
    socket.emit = function() {
      logger.info(name + ' < ' + arguments[0]);
      old_emit.apply(socket, arguments);
    };
  })();

  var log_in = function(message) {
    current_handler = message;
    logger.info(name + ' > ' + message);
  };

  var log = function(message) {
    logger.info(name + ' : ' + message);
  };

  log('connected');

  // true if limit exceeded, false if ok
  var test_command_limit = function() {
    var now = (new Date).getTime() / 1000;
    var ten_before = last_commands.shift();
    last_commands.push(now);
    return now - ten_before < 1;
  };

  socket.on('log in', function(data, callback) {
    log_in('log in');
    if(!('' + data.player_id).match(/[0-9A-F]{32}/i)) {
      return callback('fail', { code: 2, message: 'Hash used to log in does not match regular' +
                      ' expression /[0-9A-F]{32}/i .'});
    }

    if(!(data.player_id in objects)) {
      var now = (new Date).getTime() / 1000;
      if(address in last_accounts) {
        if(now - last_accounts[address] < 20) {
          player = undefined;
          return callback('fail', { code: 18, message: 'Only one account per 20 seconds per ip allowed.'});
        }
      }
      last_accounts[address] = now;
    }

    player = get_or_create_player('' + data.player_id);

    if(argv.throttle === 'player') {
      if(data.player_id in last_commands_db) {
        last_commands = last_commands_db[data.player_id];
      } else {
        last_commands_db[data.player_id] = last_commands;
      }
    }


    if(!('avatars' in player)) {
      player = undefined;
      return callback('fail', { code: 3, message: 'Corrupted account - no avatar list.'});
    }
    for(var k in player.avatars) {
      socket.join(k);
    }

    return callback('success', { avatar_list: Object.keys(player.avatars) });
  });

  var find_target = function(command) {
  };

  var check_feature = function(object, feature) {
    if(!object.features[feature]) {
      throw { code: 8, message: 'Specified component doesn\'t  have ' + feature + ' capabilities' };
      return false;
    }
    return true;
  };

  var battery_check = function(battery, energy) {
    check_feature(battery, 'battery');
    check(energy, "Energy must be a number").isFloat();
    check(energy, "Energy can't be nagative").min(0);
    check(energy, "Required energy exceeds available in battery").max(battery.battery_energy);
  };

  var on = function on(name, handler) {
    socket.on(name, function on_handler(command, cb) {
      log_in(name);
      if(!player) {
        return cb('fail', { code: 18, message: 'You have to log in first!' });
      }
      if(test_command_limit()) {
        return cb('fail', { code: 9, message: 'Exceeded limit of ' + last_commands.length + ' commands per second.' });
      }
      if(!command) {
        return cb('fail', { code: 999, message: 'Command didn\'t have parameters defined.' });
      }
      if(!command.target) {
        return cb('fail', { code: 5, message: 'Command didn\'t have `target` defined.' });
      }
      if(!('' + command.target).match(/[0-9A-F]{32}/i)) {
        return cb('fail', { code: 6, message: 'Target hash is not a valid identifier (should match /[0-9A-F]{32}/i).' });
      }

      var target;
      for(var id in player.avatars) {
        var cc = common.walk(objects[id], 'relay');
        if(target = cc[command.target]) break;
      }

      if(!target) {
        return cb('fail', { code: 7, message: 'Command target not found connected to any avatar.' });
      }

      try {
        if(cb) {
          cb('success', handler(target, command));
        } else {
          handler(target, command);
        }
      } catch(e) {
        if(cb) {
          cb('fail', { source: current_handler, message: e.message, stack: e.stack });
        } else {
          socket.emit('fail', { source: current_handler, message: e.message });
        }
      }
    });
  };

  on('sprite', function(target, data) {
    if('user_sprite' in target) {
      throw { message: "Specified target already has 'user_sprite' defined." };
    }
    var spr = "" + data.user_sprite;
    if(spr.length > 127) {
      throw { message: "Requested sprite url has length " + data.length + " but should be no more than 127." };
    }
    target.user_sprite = spr;
    return { id: target.id, user_sprite: spr };
  });

  on('report', function(target, data) {
    var report = {};
    if(target.connections) report.connections = target.connections.map(stub);
    if(target.a) report.a = stub(target.a);
    if(target.b) report.b = stub(target.b);
    if(target.manipulator_slot) report.manipulator_slot = stub(target.manipulator_slot);
    var copy = 'id features position velocity sprite user_sprite integrity radio_range impulse_drive_payload impulse_drive_impulse store_stored store_capacity battery_energy battery_capacity manipulator_range laboratory_slots laboratory_tech_level'.split(' ');
    copy.forEach(function(key) {
      report[key] = target[key];
    });
    if(target.composition) {
      report.mass = resources.get_mass(target.composition);
    }
    return report;
  });

  on('broadcast', function(target, data) {
    check_feature(target, 'radio');
    var str = JSON.stringify(data.message);
    if(str.length > 140) {
      throw { code: 1, message: 'JSON.stringify(message) should have at most 140 characters' };
    }
    socket.broadcast.emit('broadcast', { source: stub(target), message: data.message });
    return "sent";
  });


  var radio_copy_fields = 'id sprite user_sprite position velocity'.split(' ');
  on('scan', function(target, data) {
    check_feature(target, 'radio');
    var results = [];
    var radio_position = target.position;

    for(var hash in objects) {
      var object = objects[hash];
      if(!('position' in object)) continue;
      var d = radio_position.dist(object.position);
      if(d <= target.radio_range) {
        var report = {};
        radio_copy_fields.forEach(function(key) { if(key in object) report[key] = object[key]; });
        results.push(report);
      }
    }
    return results;
  });


  on('manipulator grab', function(target, data) {
    if(!check_feature(target, 'manipulator')) return;

    if(target.manipulator_slot) {
      delete target.manipulator_slot.grabbed_by;
      delete target.manipulator_slot;
    }

    var manipulator_position = common.get_position(target);
    var grab_position = manipulator_position;
    if(Array.isArray(data.position)) {
      grab_position = vectors.create(data.position);
    }

    var total_range = target.manipulator_range;
    var left_range = total_range - grab_position.dist(manipulator_position);

    if(left_range < 0) {
      return fail(999, 'Grab position outside manipulator range.');
    }

    var cc = common.walk(target);

    var closest = undefined;
    var closest_dist = 999999;

    for(var hash in objects) {
      var object = objects[hash];
      if(!('position' in object)) continue;
      if(object.id in cc) continue;
      var d = grab_position.dist(object.position);
      if(d < closest_dist) {
        closest_dist = d;
        closest = object;
      }
    }

    if(closest_dist > left_range) {
      return fail(999, 'No valid object found around grab position.');
    }

    closest.grabbed_by = target;
    target.manipulator_slot = closest;

    socket.emit('manipulator grabbed', {
      id: target.id,
      manipulator_slot: { id: closest.id }
    });
  });

  on('manipulator attach', function(target, data) {
    if(!check_feature(target, 'manipulator'))
      return;
    if(typeof target.manipulator_slot === 'undefined')
      return fail(999, 'Manipulator empty - nothing to be attached.');
    if(typeof data.hub === 'undefined')
      return fail(999, 'You must define hub to attach to.');
    var hub = common.get(data.hub);

    var o = target.manipulator_slot;
    connect(hub, o);
    delete target.manipulator_slot.grabbed_by;
    delete target.manipulator_slot;
    socket.emit('manipulator attached', { manipulator: { id: target.id }, hub: { id: hub.id }, object: { id: o.id } });
  });

  on('manipulator detach', function(target, data) {
    if(!check_feature(target, 'manipulator'))
      return;
    if(typeof target.manipulator_slot !== 'undefined')
      return fail(999, 'Manipulator not empty');
    var skeleton = find_co_component(target, data.skeleton, 'skeleton');
    if(typeof data.skeleton_slot !== 'number')
      return fail(999, 'Skeleton slot should be a number.');
    var idx = Math.round(data.skeleton_slot);
    if(idx < 0)
      return fail(999, 'Specified skeleton doesn\'t have negative slots.');
    if(idx >= skeleton.skeleton_slots.length)
      return fail(999, 'Specified skeleton doesn\'t have that many slots.');
    if(!skeleton.skeleton_slots[idx])
      return fail(999, 'Nothing in skeleton '+data.skeleton+' slot '+idx+'.');

    target.manipulator_slot = skeleton.skeleton_slots[idx];
    skeleton.skeleton_slots[idx] = null;
    delete target.manipulator_slot.parent;
    target.manipulator_slot.grabbed_by = target;
    target.manipulator_slot.position = vectors.create(target.position);
    target.manipulator_slot.velocity = vectors.create(target.velocity);
    socket.emit('manipulator detached', { manipulator: stub(target), skeleton: stub(skeleton), slot: idx, object: stub(target.manipulator_slot) });
  });

  on('manipulator release', function(target, data) {
    if(!check_feature(target, 'manipulator')) return;

    if(typeof target.manipulator_slot === 'undefined') {
      return fail(999, 'Manipulator empty.');
    }

    delete target.manipulator_slot.grabbed_by;
    delete target.manipulator_slot;

    socket.emit('manipulator released', { id: target.id });
  });

  var find_co_component = function(source, id, feature) {
    var cc = common.walk(source, 'relay');
    var name = feature ? feature.capitalize() : "Object";
    check(id, name + ' id (' + id + ') doesn\'t match /[0-9A-F]{32}/i').is(/[0-9A-F]{32}/i);
    check(cc[id], name + ' ' + id + ' is not reachable from ' + source.id).notNull();
    if(feature) check(cc[id].features[feature], 'Object ' + id + ' can\'t act as a ' + feature).notNull();
    return cc[id];
  };

  on('manipulator repulse', function(target, data) {
    if(!check_feature(target, 'manipulator'))
      return;
    if(typeof target.manipulator_slot === 'undefined')
      return fail(999, 'Manipulator empty.');
    if(!Array.isArray(data.direction))
      return fail(999, 'Repulse direction should be an array.');
    if(data.direction.length != 3)
      return fail(999, 'Repulse direction should have length 3.');
    var energy_source = find_co_component(target, data.energy_source, 'battery');
    if(typeof energy_source === 'undefined') return;

    battery_check(energy_source, data.energy);
    var energy = Number(data.energy);

    var direction = vectors.create(data.direction).scaleTo(energy);
    var object = target.manipulator_slot;

    thrust(object, direction);
    thrust(target, direction.neg());

    energy_source.battery_energy -= energy;

  });

  on('impulse_drive push', function(target, cmd) {
    check_feature(target, 'impulse_drive');

    var energy_source = find_co_component(target, cmd.energy_source, 'battery');
    if(typeof energy_source === 'undefined') return;
    var matter_store = find_co_component(target, cmd.matter_source, 'store');
    if(typeof matter_store === 'undefined') return;

    if(!resources.lte(cmd.composition, matter_store.store_stored)) {
      throw { code: 11, message: 'Ordered to grab more materials than available in store.' };
    }
    var reaction_mass = resources.get_mass(cmd.composition);
    if(reaction_mass > target.impulse_drive_payload) {
      throw { code: 12, message: 'Ordered payload exceeds drive capabilities.' };
    }
    if(cmd.impulse > target.impulse_drive_impulse) {
      throw { code: 13, message: 'Ordered impulse exceeds drive capabilities.' };
    }
    if(cmd.impulse <= 0) {
      throw { code: 999, message: 'Impulse must be greather than 0.' };
    }
    var energy = reaction_mass * cmd.impulse;
    battery_check(energy_source, energy);

    var d = target.position.dist(cmd.destination);
    var time = d / cmd.impulse;

    setTimeout(function() {
      socket.emit('explosion', {
        sprite: '/explosion45.png',
        duration: 1,
        position: cmd.destination
      });

      var r = d * reaction_mass * cmd.impulse / 100000 + 10;
      var hit_point = vectors.create(cmd.destination);
      var total = 0;
      var hit = [];
      var o, l, m;

      for(var hash in objects) {
        o = objects[hash];
        if(o.position) {
          l = o.position.dist(hit_point);
          if(l == 0) {
            hit = [o];
            break;
          }
          if(l < r) {
            m = resources.get_connected_mass(o);
            total += m / l;
            hit.push(o);
          }
        }
      }
      if(hit.length == 0) return;
      var here = Math.random() * total;
      var cumulative = 0;
      for(var i = 0; i < hit.length; ++i) {
        o = hit[i];
        l = o.position.dist(hit_point);
        m = resources.get_connected_mass(o);
        cumulative += m / l;
        if(cumulative > here) break;
      }
      var cc = common.walk(o); // TODO: more sophisticated
      // selection of hit location
      var arr = common.dict_to_array(cc);
      var i = Math.floor(Math.random() * arr.length);
      thrust(arr[i], direction.neg());
    }, time * 1000);
    

    var direction = vectors.create(target.position).
      subtract(cmd.destination).
      scaleTo(energy);

    thrust(target, direction);

    resources.subtract(matter_store.store_stored, cmd.composition);
    energy_source.battery_energy -= energy;

    return;

  });

  on('refinery refine', function(target, data) {
    if(!check_feature(target, 'refinery')) return;
    var store = find_co_component(target, data.store, 'store');
    if(typeof store === 'undefined') return;
    var material = find_co_component(target, data.material);
    if(typeof material === 'undefined') return;

    var stored = resources.get_mass(store.store_stored);
    var space_left = store.store_capacity - stored;

    var material_mass = resources.get_mass(material.composition);

    if(material_mass > space_left) {
      var ratio = space_left / material_mass;
      var move_arr = resources.make_copy(material.composition);
      resources.multiply(move_arr, ratio);
      resources.subtract(material.composition, move_arr);
      resources.add(store.store_stored, move_arr);
      if(material.features) {
        var farr = Object.keys(material.features);
        var remove_features = Math.ceil(ratio * farr.length);
        for(var i = 0; i < remove_features; ++i) {
          var desiredIndex = Math.floor(Math.random() * farr.length);
          delete material.features[farr[desiredIndex]];
          farr.splice(desiredIndex, 1);
        }
      }

    } else {
      resources.add(store.store_stored, material.composition);
      destroy(material);
    }

    socket.emit('refinery refined', { id: target.id, refined: Math.min(material_mass, space_left) });
  });

  on('store move', function(target, data) {
    if(!check_feature(target, 'store')) return;
    var store = find_co_component(target, data.store, 'store');
    if(typeof store === 'undefined') return;
    var composition = data.composition;
    if(typeof composition === 'undefined') return;

    if(!resources.lte(composition, store.store_stored)) {
      return fail(999, 'Not enough resources in store.');
    }

    var stored = resources.get_mass(target.store_stored);
    var space_left = target.store_capacity - stored;

    var material_mass = resources.get_mass(composition);

    if(material_mass > space_left)
      return fail(999, 'Not enough space left in target store');

    resources.subtract(store.store_stored, composition);
    resources.add(target.store_stored, composition);

    socket.emit('store moved', { id: target.id, moved: composition });
  });

  on('battery move', function(target, data) {
    if(!check_feature(target, 'battery')) return;
    var battery = find_co_component(target, data.battery, 'battery');
    if(typeof battery === 'undefined') return;
    battery_check(battery, data.energy);
    var energy = data.energy;

    var space_left = target.battery_capacity - target.battery_energy;

    if(energy > space_left)
      return fail(999, 'Not enough space left in target battery');

    battery.battery_energy -= energy;
    target.battery_energy += energy;

    socket.emit('battery moved', { id: target.id, moved: energy });
  });


  on('laboratory invent', function(target, json) {
    if(!check_feature(target, 'laboratory')) return;
    var laboratory = target;
    check(json.slot, "Slot number must be an integer").isInt();
    check(json.slot, "Slot number must be >= 0").min(0);
    check(json.slot, "Slot number must not exceed laboratory capacity").max(laboratory.laboratory_slots.length - 1);
    var slot = sanitize(json.slot).toInt();
    check(laboratory.laboratory_slots[slot], "Laboratory slot taken").isNull();
    var battery = find_co_component(laboratory, json.battery, 'battery');
    if(typeof battery === 'undefined') return;
    battery_check(battery, json.energy);
    var energy = Number(json.energy);
    battery.battery_energy -= energy;
    var level = bp.mod(laboratory.laboratory_tech_level, energy);
    var features = bp.random_features(level);
    var blueprint = bp.randomize_blueprint(bp.make_blueprint(features, level));
    laboratory.laboratory_slots[slot] = blueprint;
    socket.emit('laboratory invented', { laboratory: stub(laboratory), slot: slot, blueprint: blueprint});
  });

  on('laboratory abandon', function(target, json) {
    if(!check_feature(target, 'laboratory')) return;
    var laboratory = target;
    check(json.slot, "Slot number must be an integer").isInt();
    check(json.slot, "Slot number must be >= 0").min(0);
    check(json.slot, "Slot number must not exceed laboratory capacity").max(laboratory.laboratory_slots.length - 1);
    var slot = sanitize(json.slot).toInt();
    check(laboratory.laboratory_slots[slot], "Laboratory slot already empty").notNull();
    socket.emit('laboratory abandoned', { laboratory: stub(laboratory), slot: slot, blueprint: laboratory.laboratory_slots[slot] });
    laboratory.laboratory_slots[slot] = undefined;
  });

  on('assembler estimate', function(target, json) {
    if(!check_feature(target, 'assembler')) return;
    var laboratory = find_co_component(target, json.laboratory, 'laboratory');
    check(json.slot, "Slot number must be an integer").isInt();
    check(json.slot, "Slot number must be >= 0").min(0);
    check(json.slot, "Slot number must not exceed laboratory capacity").max(laboratory.laboratory_slots.length - 1);
    var slot = sanitize(json.slot).toInt();
    check(laboratory.laboratory_slots[slot], "Laboratory slot can't be empty").notNull();
    var blueprint = laboratory.laboratory_slots[slot];
    var materials = bp.estimate_materials(blueprint);
    socket.emit('assembler estimated', { assembler: stub(target), laboratory: stub(laboratory), slot: slot, materials: materials });
  });

  on('assembler build', function(target, json) {
    if(!check_feature(target, 'assembler')) return;
    var laboratory = find_co_component(target, json.laboratory, 'laboratory');
    check(json.slot, "Slot number must be an integer").isInt();
    check(json.slot, "Slot number must be >= 0").min(0);
    check(json.slot, "Slot number must not exceed laboratory capacity").max(laboratory.laboratory_slots.length - 1);
    var slot = sanitize(json.slot).toInt();
    check(laboratory.laboratory_slots[slot], "Laboratory slot can't be empty").notNull();
    var blueprint = laboratory.laboratory_slots[slot];
    var materials = bp.estimate_materials(blueprint);
    var store = find_co_component(target, json.store, 'store');
    if(!resources.lte(materials, store.store_stored))
      return fail(999, 'Not enough resources in store.');
    resources.subtract(store.store_stored, materials);
    var object = bp.realize_blueprint(blueprint);
    var root = common.get_root(target);
    object.position = vectors.create(root.position);
    object.velocity = vectors.create(root.velocity);
    socket.emit('assembler built', { assembler: stub(target), laboratory: stub(laboratory), slot: slot, materials: materials, object: object });
    reg(object);
  });

});
