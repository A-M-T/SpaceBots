(function(e){

	var resources = require('./resources'),
      common    = require('./common');

	var chances = {
		'avatar': 5,
		'laser': 100,

		'radio': 100,
		'spectrometer': 100,

		'burning_reactor': 100,
		'enriching_reactor': 100,
		'fission_reactor': 100,
		'fusion_reactor': 100,

		'store': 100,
		'battery': 100,

		'laboratory': 100,

		'assembler': 100,
		'refinery': 100,

		'manipulator': 100,
		'impulse_drive': 100
	};

  var sprites = {
    //'assembler': '/assembler101.png',
    //'avatar': '/avatar28.png',
    'battery': '/battery37.png'
  };

	var clone = function(obj) {
		var target = {};
		for (var i in obj) target[i] = obj[i];
		return target;
	};

	var rchoice = function(obj) {
		var sum = 0, key, pos;
		for(key in obj) sum += obj[key];
		pos = Math.floor(Math.random() * sum);
		sum = 0;
		key = undefined;
		for(key in obj) {
			sum += obj[key];
			if(sum >= pos) {
				delete obj[key];
				return key;
			}
		}
		delete obj[key];
		return key;
	};

	var to_one = function(zero, half, current) {
		var b = half - 2;
		var a = -b - zero;
		return Math.max(0, Math.min(1, a / (current + b) + 1));
	};

	// returns true if additional feature should be chosen
	var test_level = function(level) {
		return Math.random() < to_one(10, 50, level);
	};

	var random_features = function(level) {
		var ret = [];
		var left = clone(chances);
		ret.push(rchoice(left));
		while(test_level(level)) {
			var f = rchoice(left);
			if(f) {
				ret.push(f);
			} else {
				break;
			}
		}
		return ret;
	};

	var count_features = function(blueprint) {
		var sum = 0;
		for(var i in blueprint) {
			if(typeof blueprint[i] === 'object') {
				sum += 1;
			}
		}
		return sum;
	};

	var tradeoffs_base = {
		mass: function(b, v) {
			var nf = count_features(b);
			return nf * nf * 25 / Math.max(1, v);
		},
		integrity: function(b, v) { return (v+1) * 10000; }
	};

	var tradeoffs = {
		impulse_drive: {
			payload: function(b, v) { return v; },
			impulse: function(b, v) { return v * 1000; },
			//stealth: function(b, v) { return to_one(0, 50, v); }
		},
		radio: {
			range: function(b, v) { return v * 500; },
			//stealth: function(b, v) { return to_one(0, 50, v); }
		},
		avatar: {
			//range: function(b, v) {
			//	return Math.round(Math.pow(v, 0.4));
			//},
			//sensitivity: function(b, v) { return Math.sqrt(v) / 2; }
		},
		manipulator: {
			range: function(b, v) { return v * 10; }
		},
		store: {
			capacity: function(b, v) { return v * 1000; }
		},
		battery: {
			capacity: function(b, v) { return v * 1000000; }
		},
		spectrometer: {
			range: function(b, v) { return v; },
			//stealth: function(b, v) { return to_one(0, 50, v); }
		},
		refinery: {
			efficiency: function(b, v) { return to_one(0, 50, v); }
		},
		laboratory: {
			tech_level: function(b, v) { return v; },
			slots: function(b, v) {
				return new Array(Math.round(Math.pow(v, 0.5)));
			}
		},
		assembler: {
			speed: function(b, v) { return Math.sqrt(v); },
			material_efficiency: function(b, v) {
				return to_one(0, 50, v);
			},
			power_efficiency: function(b, v) { return to_one(0, 50, v); }
		},
		laser: {
			range: function(b, v) { return v * 1000; },
			power: function(b, v) { return Math.max(0, (v-10) * 100); },
			//stealth: function(b, v) { return to_one(0, 50, v); }
		},
		enriching_reactor: {
			capacity: function(b, v) { return v; },
			efficiency: function(b, v) { return to_one(0, 50, v); }
		},
		burning_reactor: {
			capacity: function(b, v) { return v; },
			efficiency: function(b, v) { return to_one(0, 50, v); }
		},
		fusion_reactor: {
			capacity: function(b, v) { return v; },
			efficiency: function(b, v) { return to_one(0, 50, v); }
		},
		fission_reactor: {
			capacity: function(b, v) { return v; },
			efficiency: function(b, v) { return to_one(0, 50, v); }
		}
	};

	var constructors = {
		store: function(b, o) {
			o.store_stored = resources.make_empty();
		},
		battery: function(b, o) {
			o.battery_energy = 0;
		}
	};

	var walk = function(obj, type, cb) {
		var objs = [obj];
		while(objs.length) {
			var o = objs.pop();
			for(var i in o) {
				if(typeof o[i] === type) {
					cb(o, i, o[i]);
				} else if(typeof o[i] === 'object') {
					objs.push(o[i]);
				}
			}
		}
	};

	/*
	 Functions that convert experience points to level and vice versa.
	 */
	var pts = function(level) { return Math.pow(10, level/10); };
	var lvl = function(points) { return 10 * Math.log(points) / Math.LN10; };

	/*
	 Creates blueprint with equally assigned feature levels such that
	 their points sum to `level` points.
	 */
	var make_blueprint = function(features, level) {
		var blueprint = clone(tradeoffs_base);
		for(var i in features) {
			var f = features[i];
			blueprint[f] = clone(tradeoffs[f]);
		}
		var sum = 0;
		walk(blueprint, 'function', function(o, f, n) { sum += 1; });
		var mul = pts(level) / sum;
		walk(blueprint, 'function', function(o, f, n) {
			o[f] = lvl(mul);
		});
		return blueprint;
	};

	var randomize_blueprint = function(blueprint) {
		var b = {};
		for(var k in blueprint) {
			var feature = blueprint[k];
			if(typeof feature === 'number') {
				b[k] = blueprint[k] * (Math.random() + .5);
			} else if(typeof feature === 'object') {
				b[k] = randomize_blueprint(blueprint[k]);
			}
		}
		return b;
	};

	var mod = function(level, points) {
		return lvl(Math.max(1, pts(level) + points));
	};

	var upgrade_blueprint = function(blueprint, a, b, level) {
		var count = 0;
		walk(blueprint, 'number', function() { ++count; });
		var points = pts(level);
		var dec = - points / count;
		var inc = points;

		var up = {};
		for(var k in blueprint) {
			var feature = blueprint[k];
			if(typeof feature === 'number') {
				if(k == a) {
					up[k] = mod(blueprint[k], inc);
				} else {
					up[k] = mod(blueprint[k], Math.random() * dec);
				}
			} else if(typeof feature === 'object') {
				up[k] = {};
				for(var l in blueprint[k]) {
					if(k == a && l == b) {
						up[k][l] = mod(blueprint[k][l], inc);
					} else {
						up[k][l] = mod(blueprint[k][l], Math.random() * dec);
					}
				}
			}
		}
		return up;
	};

	var estimate_time = function(blueprint) {
		var points = 0;
		walk(blueprint, 'number', function(o, f, n) { points += pts(n); });
		return lvl(points);
	};

	var estimate_materials = function(blueprint) {
		if(typeof blueprint.resources === 'undefined') {
			var mass = tradeoffs_base.mass(blueprint, blueprint.mass);

			var points = 0;
			var low = blueprint.mass;
			var high = blueprint.mass;
			walk(blueprint, 'number', function(o, f, n) {
				points += pts(n);
				high = Math.max(high, n);
				low = Math.min(low, n);
			});
			var range = high - low;
			var level = lvl(points);
			blueprint.resources = resources.make_resources(mass, 28, range);
		}
		return blueprint.resources;
	};

	// TODO: dodać zasoby?
	var realize_blueprint = function(blueprint) {
		var object = {}, func, val;
		var kl = Object.keys(blueprint).length - 2;
		object.features = {};
		object.id = common.uid();
    object.connections = [];
		object.composition = estimate_materials(blueprint);

		for(var feature in blueprint) {
			if(typeof blueprint[feature] === 'object') {
				if(Array.isArray(blueprint[feature])) continue;
				object.features[feature] = true;

				if(typeof object.sprite === 'undefined') {
          if(feature in sprites) {
            object.sprite = sprites[feature];
          } else {
					  object.sprite = '/' + feature + '.png';
          }
				}

				for(var prop in blueprint[feature]) {
					val = blueprint[feature][prop];
					func = tradeoffs[feature][prop];
					object[feature + '_' + prop] = func(blueprint, val);
				}
			} else if(typeof blueprint[feature] === 'number') {
				func = tradeoffs_base[feature];
				val = blueprint[feature];
				object[feature] = func(blueprint, val);
			}

			if(constructors[feature]) {
				constructors[feature](blueprint, object);
			}
		}

		return object;
	};

	var make = function(features, level) {
		features = features.split(' ');
		var b = make_blueprint(features, level);
		b = randomize_blueprint(b);
		return realize_blueprint(b);
	};

	e.random_features = random_features;
	e.estimate_materials = estimate_materials;
	e.make_blueprint = make_blueprint;
	e.randomize_blueprint = randomize_blueprint;
	e.upgrade_blueprint = upgrade_blueprint;
	e.realize_blueprint = realize_blueprint;
	e.make = make;
	e.mod = mod;

	/*

	var l = 30;
	var f = random_features(l);
	console.log("Features:", f);
	var bp = make_blueprint(f, l);
	console.log("Blueprint:", bp);
	bp = randomize_blueprint(bp);
	console.log("Randomized:", bp);
	bp = upgrade_blueprint(bp, 'mass', null, l);
	console.log("Upgraded:", bp);
	console.log("Materials:", estimate_materials(bp));
	var o = realize_blueprint(bp);
	console.log("Object:", o);

	*/

})(typeof exports === 'undefined' ? this['blueprints'] = {} : exports);

