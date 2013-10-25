
var fs = require('fs');
var sty = require('sty');

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
	sylvester = require('sylvester'),
	resources = require('./static/resources'),
	bp = require('./blueprints');

var objects = global.objects = {},
	Vector = sylvester.Vector;

var reg = function(obj) {
	objects[obj.id] = obj;
	return obj;
};

var place = function(host, guest, pos) {
	host.skeleton_slots[pos] = guest;
	guest.parent = host;
	return guest;
};

var asteroids = global.asteroids = [];

var make_asteroid = function() {
	return {
		id: common.uid(),
		features: {},
		composition: resources.make_resources(common.rnd_exp(5), 14, 20),
		sprite: '/asteroid100.png',
		position: sylvester.Vector.Zero(3),
		velocity: sylvester.Vector.Zero(3)
	};
};

for(var i = 0; i < 60; ++i) {
	var asteroid = reg(make_asteroid());
	asteroid.position = common.RV(3000);
	asteroid.velocity = common.RV(5);
	asteroids.push(asteroid);
}

var get_or_create_player = function(hash) {
    if(!(hash in objects)) {

		var hull = reg(bp.make('skeleton manipulator', 10));
		hull.position = common.RV(200);
		hull.velocity = common.RV(5);
		hull.skeleton_slots = [null, null, null, null, null, null];
		hull.sprite = '/hull.png';

		var avatar = place(hull, reg(bp.make('avatar radar', 10)), 0);
		avatar.radar_range = 1000;

		var drive = place(hull, reg(bp.make('impulse_drive store battery', 10)), 1);
		drive.store_stored[0] = drive.store_capacity;
		drive.battery_energy = drive.battery_capacity;
		place(hull, reg(bp.make('assembler refinery spectrometer', 10)), 2);
		place(hull, reg(bp.make('laboratory enriching_reactor burning_reactor', 10)), 3);

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
	for(var i = 1; i <= 3; ++i) {
		var v = object.position.e(i);
		if(v < -2000) {
			object.position.elements[i-1] = - v - 4000;
			object.velocity.elements[i-1] = - object.velocity.elements[i-1];
		}
		if(object.position.e(i) > 2000) {
			object.position.elements[i-1] = - v + 4000;
			object.velocity.elements[i-1] = - object.velocity.elements[i-1];
		}
	}
};

if('ATTRACTOR_KEY' in process.env) {
	try {
		var decipher = require('crypto').
			createDecipher('aes256', process.env.ATTRACTOR_KEY);
		decipher.end('k7S4ZzSGD7L4v7rOZXAiHgNJHbBGSbAUzwb+EWEjYau5//l0Rep1Hq' +
					 'hZFDI7qKOH6gqmsyr+plzaqL+1MNrHkzepOcMVkeCjWbwIU+xF19g=',
					 'base64');
		var str = decipher.read().toString('utf8');
		apply_secret_force = eval(str);
		logger.info('attractor\'s secret decrypted');
	} catch(e) {
		logger.error('couldn\'t decrypt attractor secret: ' + e.toString());
	}
}

attract = function() {
	for(var hash in objects) {
		var object = objects[hash];
		if(object.position && object.velocity) {
			object.position = object.position.add(object.velocity.x(0.1));
			apply_secret_force(object);
		}
		if(object.manipulator_slot) {
			var pos_a = common.get_position(object.manipulator_slot);
			var pos_b = common.get_position(object);
			if(pos_a.distanceFrom(pos_b) > object.manipulator_range) {
				delete object.manipulator_slot.grabbed_by;
				delete object.manipulator_slot;
			}
		}
	}
	setTimeout(attract, 100);
};

attract();

var damage_object = function(obj, dmg) {
	logger.info('damaging ' + obj.id + ' with ' + dmg);
	if(obj.integrity && dmg > obj.integrity) {
		destroy(obj);
	}
};

var damage_ship = function(root, dmg) {
	logger.info('hit at ' + root.id + ' with ' + dmg);
	var cc = common.walk(root);
	var arr = common.dict_to_array(cc);
	var total = 0;
	var i;
	for(i = 0; i < arr.length; ++i) {
		total += resources.get_mass(arr[i]);
	}
	var here = Math.random() * total;
	total = 0;
	for(i = 0; i < arr.length; ++i) {
		total += resources.get_mass(arr[i]);
		if(total > here) break;
	}
	damage_object(arr[i], dmg);
};

var destroy = function(object) {
	logger.info(object.id + ' destroyed');
	var pos = common.get_root(object).position;
	var vel = common.get_root(object).velocity;

	if(object.skeleton_slots) {
		for(var i = 0; i < object.skeleton_slots.length; ++i) {
			var orphan = object.skeleton_slots[i];
			orphan.parent = undefined;
			orphan.velocity = Vector.create(vel);
			orphan.position = Vector.create(pos);
			object.skeleton_slots[i] = undefined;
		}
	}
	if(object.parent) {
		var me = object.parent.skeleton_slots.indexOf(object);
		object.parent.skeleton_slots[me] = undefined;
		object.parent = undefined;
	}
	delete objects[object.id];
};

var apply_thrust_dmg = function(object, source, v, reduce_dmg) {
	var mass = 0;
	if(object.mass) {
		mass += object.mass;
	} else if(object.composition) {
		mass += resources.get_mass(object.composition);
	}
	if(object.parent && object.parent !== source) {
		mass += apply_thrust_dmg(object.parent, object, v, true);
	}
	if(object.skeleton_slots) {
		for(var i = 0; i < object.skeleton_slots.length; ++i) {
			if(object.skeleton_slots[i] && object.skeleton_slots[i] !== source) {
				mass += apply_thrust_dmg(object.skeleton_slots[i], object, v, true);
			}
		}
	}
	var energy = mass * v;
	if(reduce_dmg) {
		energy /= 5;
	}
	if(energy > object.integrity) {
		destroy(object);
		mass = 0;
	}
	return mass;
}

var apply_thrust = function(object, direction, momentum, reduce_dmg) {
	logger.info('thrust on ' + object.id.slice(0,4) + ' : ' + momentum);
	var root = common.get_root(object);
	if(typeof root.velocity === 'undefined') return;
	var mass = resources.get_connected_mass(object);
	var dv = momentum / mass;
	apply_thrust_dmg(object, object, dv, reduce_dmg);
	root.velocity = root.velocity.add( direction.toUnitVector().x(dv) );
};

var last_commands = {};
var last_accounts = {};

io.sockets.on('connection', function (socket) {
    var player = undefined;
	var address = socket.handshake.address;

	if(!(address in last_commands)) {
		last_commands[address] = [0,0,0,0,0,0,0,0,0,0];
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

	var fail = function(code, message) {
		socket.emit('fail', {
			code: code,
			source: current_handler,
			message: message
		});
	};

	log('connected');

	
	socket.on('broadcast', function(data) {
		log_in('broadcast');
		var str = JSON.stringify(data);
		if(str.length > 140) {
			return fail(1, 'Message json should have at most 140 characters');
		}
		socket.broadcast.emit('broadcast', data);
	});

	socket.on('log in', function(data) {
		log_in('log in');
		if(!('' + data.player_id).match(/[0-9A-F]{32}/i)) {
			return fail(2, 'Hash used to log in does not match regular' +
						' expression /[0-9A-F]{32}/i .');
		}

		if(!(data.player_id in objects)) {
			var now = (new Date).getTime() / 1000;
			if(address in last_accounts) {
				if(now - last_accounts[address] < 60) {
					player = undefined;
					return fail(18, 'Only one account per minute per ip allowed.');
				}
			}
			last_accounts[address] = now;
		}

		player = get_or_create_player('' + data.player_id);


		if(!('avatars' in player)) {
			player = undefined;
			return fail(3, 'This account doesn\'t have an avatar list');
		}
		socket.emit('avatar list',  Object.keys(player.avatars));
	});

	var find_target = function(command) {
		if(typeof player === 'undefined') {
			return fail(4, 'No player selected. You should first log in.');
		}
		if(typeof command === 'undefined') {
			return fail(999, 'Command didn\'t have parameters defined.');
		}
		if(typeof command.target === 'undefined') {
			return fail(5, 'Command didn\'t have `target` defined.');
		}
		if(!('' + command.target).match(/[0-9A-F]{32}/i)) {
			return fail(6, 'Target hash is not a valid identifier (should' +
						' match /[0-9A-F]{32}/i).');
		}
		// TODO: zasięg poleceń dla awatarów
		
		var visited = {};
		var queue = [];
		for(var id in player.avatars) {
			queue.push(id);
		}
		var count = 0;
		while(queue.length) {
			id = queue.pop();
			if(id in visited) continue;
			visited[id] = objects[id];
			count += 1;
			var current = objects[id];
			if(typeof current === 'undefined') continue;
			if(id == command.target) return current;
			if(current.parent) {
				queue.push(current.parent.id);
			}
			if(current.skeleton_slots) {
				for(var i = 0; i < current.skeleton_slots.length; ++i) {
					if(current.skeleton_slots[i]) {
						queue.push(current.skeleton_slots[i].id);
					}
				}
			}
		}
		return fail(7, 'Command target not found connected to any ' + 
				'avatar (searched ' + count+' objects).');
	};

	var check_feature = function(object, feature) {
		if(typeof object.features[feature] === 'undefined') {
			return fail(8, 'Specified component doesn\'t  have ' + 
					feature + ' capabilities');
		}
		return true;
	};

	var on = function(name, handler) {
		socket.on(name, function(cmd) {
			var now = (new Date).getTime() / 1000;
			if(typeof player === 'undefined') {
				return fail(18, 'You have to log in first!');
			}
			var ten_before = last_commands[address].shift();
			last_commands[address].push(now);
			if(now - ten_before < 1) {
				return fail(9, 'Exceeded limit of ' + last_commands[address].length + ' commands per second.');
			}
			log_in(name);
			var target = find_target(cmd);
			if(!target) return;
			handler(target, cmd);
		});
	};

	on('report', function(target, data) {
		var report = {};
		if('parent' in target) {
			report.parent = stub(target.parent);
		}
		if('skeleton_slots' in target) {
			report.skeleton_slots = target.skeleton_slots.map(stub);
		}
		if('manipulator_slot' in target) {
			report.manipulator_slot = stub(target.manipulator_slot);
		}
		var copy = 'id features sprite integrity radar_range impulse_drive_payload impulse_drive_impulse store_stored store_capacity battery_energy battery_capacity manipulator_range'.split(' ');
		var vectors = 'position velocity'.split(' ');
		copy.forEach(function(key) {
			report[key] = target[key];
		});
		vectors.forEach(function(key) {
			if(key in target) {
				report[key] = target[key].elements;
			}
		});
		if(target.composition) {
			report.mass = resources.get_mass(target.composition);
		}
		socket.emit('report', report);
	});

	var radar_copy_fields = 'id sprite'.split(' ');
	var radar_vector_fields = 'position velocity'.split(' ');
	on('radar scan', function(target, data) {
		if(!check_feature(target, 'radar')) return;
		var results = [];
		var now = (new Date).getTime();
		var radar_position = common.get_position(target);
		
		for(var hash in objects) {
			var object = objects[hash];
			if(!('position' in object)) continue;
			var d = radar_position.distanceFrom(object.position);
			if(d <= target.radar_range) {
				var report = {};
				radar_copy_fields.forEach(function(key) { report[key] = object[key]; });
				radar_vector_fields.forEach(function(key) { if(key in object) report[key] = object[key].elements; });
				
				results.push(report);
			}
		}
		socket.emit('radar result', results);
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
			grab_position = Vector.create(data.position);
		}

		var total_range = target.manipulator_range;
		var left_range = total_range - grab_position.distanceFrom(manipulator_position);

		if(left_range < 0) {
			return fail(999, 'Grab position outside manipulator range.');
		}

		var cc = common.walk(target, {}, true);

		var closest = undefined;
		var closest_dist = 999999;

		for(var hash in objects) {
			var object = objects[hash];
			if(!('position' in object)) continue;
			if(object.id in cc) continue;
			var d = grab_position.distanceFrom(object.position);
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
		var skeleton = find_co_component(target, data.skeleton, 'skeleton');
		if(typeof data.skeleton_slot !== 'number')
			return fail(999, 'Skeleton slot should be a number.');
        var idx = Math.round(data.skeleton_slot);
        if(idx < 0)
			return fail(999, 'Specified skeleton doesn\'t have negative slots.');
        if(idx >= skeleton.skeleton_slots.length)
			return fail(999, 'Specified skeleton doesn\'t have that many slots.');
        if(skeleton.skeleton_slots[idx])
			return fail(999, 'Skeleton '+data.skeleton+' slot '+idx+' occupied by '+skeleton.skeleton_slots[idx].id+'.');

		skeleton.skeleton_slots[idx] = target.manipulator_slot;
		target.manipulator_slot.parent = skeleton;
		delete target.manipulator_slot.position;
		delete target.manipulator_slot.velocity;
		delete target.manipulator_slot.grabbed_by;
		delete target.manipulator_slot;
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
		var cc = common.walk(source);
		if(!(id in cc)) {
			return fail(10, (feature ? common.capitalize(feature) : "Object") + ' ' + id + ' is not reachable from ' +
						source.id);
		}
        if(feature && !check_feature(cc[id], feature)) return undefined;
		return cc[id];
	};

	on('manipulator repulse', function(target, data) {
		if(!check_feature(target, 'manipulator')) 
			return;
		if(typeof target.manipulator_slot === 'undefined')
			return fail(999, 'Manipulator empty.');
		if(typeof data.power !== 'number')
			return fail(999, 'Repulse power should be a number.');
		if(!Array.isArray(data.direction))
			return fail(999, 'Repulse direction should be an array.');
		if(data.direction.length != 3)
			return fail(999, 'Repulse direction should have length 3.');
		var energy_source = find_co_component(target, data.energy_source, 'battery');
		if(typeof energy_source === 'undefined') return;

		var direction = Vector.create(data.direction);
		var object = target.manipulator_slot;

		apply_thrust(object, direction, data.power);
		apply_thrust(target, direction.x(-1), data.power);
		energy_source.battery_energy -= data.power;
		
	});

	on('impulse_drive push', function(target, cmd) {
		if(!check_feature(target, 'impulse_drive')) return;

		var energy_source = find_co_component(target, cmd.energy_source, 'battery');
		if(typeof energy_source === 'undefined') return;
		var matter_store = find_co_component(target, cmd.matter_source, 'store');
		if(typeof matter_store === 'undefined') return;

		if(!resources.lte(cmd.composition, matter_store.store_stored)) {
			return fail(11, 'Ordered to grab more materials than available in store.');
		}
		var reaction_mass = resources.get_mass(cmd.composition);
		if(reaction_mass > target.impulse_drive_payload) {
			return fail(12, 'Ordered payload exceeds drive capabilities.');
		}
		if(cmd.impulse > target.impulse_drive_impulse) {
			return fail(13, 'Ordered power exceeds drive capabilities.');
		}
		var momentum = reaction_mass * cmd.impulse;

		if(momentum > energy_source.battery_energy) {
			return fail(14, 'Ordered to use more power than available in battery.');
		}

		var root = common.get_root(target);
		var d = root.position.distanceFrom(cmd.destination);
		var time = d / cmd.impulse;

		setTimeout(function() {
			socket.emit('explosion', {
				sprite: '/explosion45.png',
				duration: 1,
				position: cmd.destination
			});

			var r = d * reaction_mass * cmd.impulse / 100000 + 10;
			var hit_point = Vector.create(cmd.destination);
			var total = 0;
			var hit = [];
			var o, l, m;

			for(var hash in objects) {
				o = objects[hash];
				if(o.position) {
					l = o.position.distanceFrom(hit_point);
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
				l = o.position.distanceFrom(hit_point);
				m = resources.get_connected_mass(o);
				cumulative += m / l;
				if(cumulative > here) break;
			}
			var cc = common.walk(o); // TODO: more sophisticated
			// selection of hit location
			var arr = common.dict_to_array(cc);
			var i = Math.floor(Math.random() * arr.length);
			apply_thrust(arr[i], direction.x(-1), momentum, false);
		}, time * 1000);


		var direction = root.position.
			subtract(cmd.destination).
			toUnitVector();

		apply_thrust(target, direction, momentum, true);

		resources.subtract(matter_store.store_stored, cmd.composition);
		energy_source.battery_energy -= momentum;
		
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

	(function() {

		var random_asteroid_id = function() {
			var i = Math.floor(Math.random() * asteroids.length);
			return asteroids[i].id;
		};

		var challenge;

		var send_challlenge = function() {
			if(socket.connected) {
				challenge = random_asteroid_id();
				socket.emit('location challenge', challenge);
				setTimeout(send_challlenge, 1000);
			}
		};

		socket.on('location answer', function(ans) {
			log_in('location answer');
			if(ans.id !== challenge) {
				return fail(15, 'Answer to wrong challenge!');
			}
			var p = Vector.create(ans.position);
			var v = Vector.create(ans.velocity);

			var o = objects[challenge];
			challenge = undefined;

			if(typeof o === 'undefined') {
				return fail(16, 'You don\'t have any challenge');
			}

			var op = o.position;
			var ov = o.velocity;

			var dp = op.distanceFrom(p);
			var dv = ov.distanceFrom(v);

			var dist = 99999;
			for(hash in player.avatars) {
				var ap = common.get_position(player.avatars[hash]);
				dist = Math.min(dist, ap.distanceFrom(op));
			}

			// Otworzyć plik odpowiadający temu IP, dopisać do niego
			// dist dp dv
			fs.appendFile('./logs/' + address.address + '.log',
						  [(new Date).getTime(), dist, dp, dv].join(' ') + '\n',
						  function (err) {
							  if(err) {
								  fail(17, 'Couldn\'t append to log file on server. Call the developers...');
							  }
						  });
			
		});

		send_challlenge();

	})();
});
