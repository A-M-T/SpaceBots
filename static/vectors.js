/*

Vectors.js is simple and efficient javascript math library utilizing native,
typed arrays.

Copyright (C) 2013  Marek Rogalski

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

(function(e){

	// Constructors

	e.create = function(first) {
		if(typeof first === 'object')
			return new Float32Array(first);
		if(typeof first === 'undefined')
			return new Float32Array([0, 0, 0]);
		if(typeof first === 'number')
			return new Float32Array(arguments);
		return new Float32Array(3);
	};

  e.zero = e.create();

	e.random1 = function(s) {
		s = s || 1;
		return e.create(Math.random(), Math.random(), Math.random()).scale(s);
	};

	e.random2 = function(s) {
		s = s || 1;
		return e.create(Math.random()*2-1, Math.random()*2-1, Math.random()*2-1).scale(s);
	};

	// Modifier functions


	Float32Array.prototype.make_random2 = function(s) {
		s = s || 1;
    for(var i = 0; i < this.length; ++i) {
      this[i] = (Math.random()*2-1) * s;
    }
    return this;
	};

	Float32Array.prototype.add = function(x, mul) {
    mul = mul || 1;
		for(var i = 0; i < this.length; ++i) {
			this[i] += x[i] * mul;
		}
		return this;
	};

	Float32Array.prototype.subtract = function(x) {
		for(var i = 0; i < this.length; ++i) {
			this[i] -= x[i];
		}
		return this;
	};

	Float32Array.prototype.neg = function() {
		for(var i = 0; i < this.length; ++i) {
			this[i] = -this[i];
		}
		return this;
	};

	Float32Array.prototype.scale = function(s) {
		for(var i = 0; i < this.length; ++i) {
			this[i] *= s;
		}
		return this;
	};

	Float32Array.prototype.scaleTo = function(l) {
		var curr = this.len();
		return this.scale( l / curr );
	};

	Float32Array.prototype.normalize = function() {
		return this.scaleTo(1);
	};

	// Getters

	Float32Array.prototype.len = function() {
		var sum = 0;
		for(var i = 0; i < this.length; ++i) {
			sum += this[i] * this[i];
		}
		return Math.sqrt(sum);
	};

	Float32Array.prototype.dist = function(x) {
    if(arguments.length > 1)
      x = Array.prototype.slice.call(arguments, 0);
		var sum = 0, d;
		for(var i = 0; i < this.length; ++i) {
			d = this[i] - x[i];
			sum += d * d;
		}
		return Math.sqrt(sum);
	};

	Float32Array.prototype.eql = function(x) {
    if(arguments.length > 1)
      x = Array.prototype.slice.call(arguments, 0);
		var sum = 0, d;
		for(var i = 0; i < this.length; ++i) {
			d = this[i] - x[i];
			sum += d * d;
		}
		return Math.sqrt(sum) < 0.001;
	};

  Float32Array.prototype.toJSON = function() {
    return Array.prototype.slice.call(this, 0);
  };

})(typeof exports === 'undefined' ? this['vectors'] = {} : exports);

