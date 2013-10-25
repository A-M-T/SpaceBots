(function(e){

	if(typeof exports !== 'undefined') {
		sylvester = require('sylvester');
		common = require('./common');
	}

    /*

      This module contains functions to manage 'composition' of
      objects.

      API Rules:
      
      Constructors are methods starting with 'make_'. They always
      return newly created arrays.

      Methods (actually functions) may MODIFY parameters. Only methods
      starting with 'get_' are guaranteed not to modify parameters.

      Parameters should be passed as arrays or objects with field
      'composition'.
     */

    var get_array = function(arg) {
        if(Array.isArray(arg)) return arg;
        if(typeof arg === 'object') {
            if('composition' in arg) return arg.composition;
            if('mass' in arg) return [ arg.mass ];
        }
        throw 'Argument isn\'t an array or object with composition.';
    };

    var num = function(x) {
        return (typeof x === 'number' ? x : 0);
    };

	var get_mass = e.get_mass = function(o) {
        return get_array(o).reduce(function(a, b) { return a+b; });
	};

    var init_arr = function(arr) {
		Object.defineProperty(arr, 'inspect', {
			value: function() {
				return '['+Math.round(get_mass(this))+' resources]';
			}
		});
        return arr;
    };

	var make_empty = e.make_empty = function() {
		return init_arr(new Array(100));
	};

	var make_copy = e.make_copy = function(o) {
        var arr = get_array(o);
        return init_arr(arr.slice(0));
	};

	var make_resources = e.make_resources = function(total, most_probable, range) {
		var parts = 10;
		var t1 = total / parts;
		var arr = make_empty();
		for(var i = 0; i < parts; ++i) {
			var pos = Math.round(common.rnd(most_probable, range));
			if(pos < 0 || pos >= 100) {
				--i;
				continue;
			}
			if(typeof arr[pos] === 'undefined') arr[pos] = 0;
			arr[pos] += t1;
		}
		return arr;
	};

	var valid = e.valid = function(r) {
		return r.length == 100 && r.every(function(v) { return v >= 0; });
	};

	var lte = e.lte = function(a, b) {
        return a.every(function(v, i) { return v <= num(b[i]); });
	};

	var gte = e.gte = function(a, b) {
        return b.every(function(v, i) { return v < num(a[i]); });
	};

	var get_connected_mass = e.get_connected_mass = function(o) {
		var cc = common.walk(o);
		var mass = 0;
		for(var id in cc) {
			mass += get_mass(cc[id]);
		}
		return mass;
	};

	var add  = e.add = function(o, p) {
        var arr = get_array(o);
        var brr = get_array(p);
        brr.forEach(function(v, i) { arr[i] = num(arr[i]) + v; });
	};

	var subtract  = e.subtract = function(o, p) {
        var arr = get_array(o);
        var brr = get_array(p);
        brr.forEach(function(v, i) { 
            arr[i] = num(arr[i]) - v; 
            if(arr[i] < 0) 
                throw 'Negative value after resource subtraction (at index ' + i + ')';
        });
	};

    var clear = e.clear = function(o) {
        var arr = get_array(o);
        arr.forEach(function(v, i) { delete arr[i]; });
    };

	var multiply  = e.multiply = function(o, factor) {
        if(factor < 0)
            throw 'Scaling resources by negative factor: ' + factor;
        var arr = get_array(o);
        arr.forEach(function(v, i) { arr[i] = v * factor; });
	};

})(typeof exports === 'undefined' ? this['resources'] = {} : exports);
