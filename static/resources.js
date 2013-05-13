(function(e){

	if(typeof exports !== 'undefined') {
		sylvester = require('sylvester');
		common = require('./common');
	}

	var rnd_snd = function() {
		return (Math.random()+Math.random()+Math.random())*2-3;
	};

	var rnd = function(mean, stddev) {
		return rnd_snd() * stddev + mean;
	};

	var rnd_exp = function(top) {
		return Math.exp(Math.random() * top);
	};

	var make_resources = e.make_resources = function(total, most_probable, range) {
		var parts = 10;
		var t1 = total / parts;
		var arr = new Array(100);
		Object.defineProperty(arr, 'inspect', {
			value: function() {
				return '['+Math.round(total)+' resources with median at '+most_probable+']';
			}
		});
		for(var i = 0; i < parts; ++i) {
			var pos = Math.round(rnd(most_probable, range));
			if(pos < 0 || pos >= 100) {
				--i;
				continue;
			}
			if(typeof arr[pos] === 'undefined') arr[pos] = 0;
			arr[pos] += t1;
		}
		return arr;
	};

	var make_asteroid = e.make_asteroid = function() {
		return {
			id: common.uid(),
			features: {},
			composition: make_resources(rnd_exp(5), 14, 20),
			sprite: '/asteroid100.png',
			position: sylvester.Vector.Zero(3),
			velocity: sylvester.Vector.Zero(3)
		};
	};

	var valid = e.valid = function(r) {
		return r.length == 100;
	};

	var lte = e.lte = function(a, b) {
		for(var i = 0; i < 100; ++i) {
			if(a[i] > b[i]) {
				return false;
			}
		}
		return true;
	};

	var gte = e.gte = function(a, b) {
		for(var i = 0; i < 100; ++i) {
			if(a[i] < b[i]) {
				return false;
			}
		}
		return true;
	};

	var get_mass = e.get_mass = function(arr) {
		var sum = 0
		for(var i = 0; i < 100; ++i) {
			if(typeof arr[i] === 'number') {
				sum += arr[i];
			}
		}
		return sum;
	};

	var get_connected_mass = e.get_connected_mass = function(o) {
		var cc = common.walk(o);
		var mass = 0;
		for(var id in cc) {
			if(cc[id].mass) {
				mass += cc[id].mass;
			} else if(cc[id].composition) {
				mass += get_mass(cc[id].composition);
			}
		}
		return mass;
	};

	var make_empty = e.make_empty = function() {
		return new Array(100);
	};

	var subtract  = e.subtract = function(from, what) {
		for(var i = 0; i < 100; ++i) {
			if(typeof from[i] === 'number' && typeof what[i] === 'number') {
				from[i] -= what[i];
			}
		}
	};

})(typeof exports === 'undefined' ? this['resources'] = {} : exports);

