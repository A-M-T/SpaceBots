// There are some small ulitity functions used in both client and server

(function(e){

	if(typeof vectors === 'undefined') {
		vectors = require('./vectors');
	}

	// We can use this function to get random user id, when creating new account
	var uid = e.uid = function() {
		return 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/x/g, function() {
			return (Math.random() * 16).toString(16)[0];
		});
	};

  var Module = {};

  String.prototype.get = function() {
    return get(this);
  };

	// This function will traverse connected components and
	// return all of them.
	var walk = e.walk = function(start, type, dict) {
		var cc = dict || {};
    type = type || 'rigid'; // 'rigid' or 'relay'

		var browse = function(element) {
			if(!element) return;
			if(element.id in cc) return;
			cc[element.id] = element;
			if(element.connections) {
				for(var i = 0; i < element.connections.length; ++i) {
          var c = element.connections[i];
          if(!!c.features[type]) {
            cc[c.id] = c;
					  browse(element === c.a ? c.b : c.a);
          }
				}
			}
		};
		browse(start);
		return cc;
	};

	// This function will convert object mapping ids to objects into array
	// containing only objects.
	var dict_to_array = e.dict_to_array = function(dict) {
		return Object.keys(dict).map(function(key) {
			return dict[key];
		});
	};

	// This function will return random number from -1 to 1
	var rnd11 = e.rnd11 = function() {
		return Math.random() * 2 - 1;
	};

	var rnd1 = e.rnd1 = function() {
		return Math.random() * 2 - 1;
	};

	var rnd_snd = e.rnd_snd = function() {
		return (Math.random()+Math.random()+Math.random())*2-3;
	};

	var rnd = e.rnd = function(mean, stddev) {
		return rnd_snd() * stddev + mean;
	};

	var rnd_exp = e.rnd_exp = function(min, max) {
		return Math.exp(min + (max - min)*Math.random());
	};


	// Here is a small utility function. It will return object associated
	// with the argument.
	var get = e.get = function(arg) {

		// If the argument is an object, it will return it unaffected.

		if(typeof arg === 'object') return arg;

		// If it is a string, it'll return object that has the string as a
		// prefix in its id.
	
		for(var hash in objects) {
			if(hash.indexOf(arg) == 0) {
				return objects[hash];
			}
		}

		// This will make console use substantially easier - you can use
		// get('31') to retrieve first object that has id beginning with 31.
	};

	String.prototype.capitalize = function() {
		return this.charAt(0).toUpperCase() + this.slice(1);
	}

})(typeof exports === 'undefined' ? this['common'] = {} : exports);


/*
// JSON transport data

var v3 = { x: 0, y: 0, z: 0 };

var object = {

id: '0000000000000000', // 128bit hexadecimal identifier
parent: undefined, // id of object that contains it. Undefined if root
position: v3,
velocity: v3,
docs: ['https://.../'],
sprite: 'url',

composition: {
// Indexes denote element number in periodic table
// Values denote mass of this element in this object
},

mass : "sum(composition)",

integrity: 1.0, // amount of energy that would destroy this object
resistance: 1.0 // amount of energy that is ignored from each hit

};

// Mixins

// Avatar is an object that when placed inside a module,
// will gain control of this module and every descendant
// component.
var avatar = {
operations_per_second: 100
};

// Used to create trees of components.
var hub = {
slots: [], // fixed length array with held items
control: true, // whether this hub transports commands
grab_range: 0
};

// Used to detect objects at a distance
var radio = {
radio_range: 1.0
};

// Used to examine detailed information about objects
var scanner = {
scan_range: 1.0,
scan_time: 1.0
};

// Low-level MESSAGES

// This message is AUTOMATICALLY called after connection.
// There is no way to trigger it again (except reconnecting)
// It returns identifiers of all avatars available to the player

var avatars = [ null ]; // Client << Server

// This messages lets client perform avatar-based scans of
// connected components. Returns detailed data about 

var scan_component = { // Client >> Server
avatar_id: null, component_id: null
};

var scan_component_result = { // Client << Server
component: null
};

// Grabbing and releasing

var release = { // Client >> Server
avatar_id: null, hub_id: null, slot_idx: null
};

var released = { // Client << Server
hub_id: null, slot_idx: null
};

var grab = { // Client >> Server
avatar_id: null, hub_id: null, slot_idx: null, object_id: null
};

var grabbed = { // Client << Server
hub_id: null, slot_idx: null, object_id: null
};

// Radio scanning

var radio_scan = { // >>
avatar_id: null, radio_id: null
};

var radio_scan_result = { // <<
radio_id: null,
results: [{
id: null, position: v3, velocity: v3, mass: 1.0, sprite: 'url'
}]
};

// Scanners

var scanner_scan = { // >>
avatar_id: null, scanner_id: null, object_id:null
};

var scanner_scan_result = { // <<
scanner_id: null, object: null
};
*/
