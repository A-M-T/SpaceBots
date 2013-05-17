// There are some small ulitity functions used in both client and server

(function(e){

	if(typeof Vector === 'undefined') {
		Vector = require('sylvester').Vector;
	}

	// We can use this function to get random user id, when creating new account
	var uid = e.uid = function() {
		return 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/x/g, function() {
			return (Math.random() * 16).toString(16)[0];
		});
	};

	// TODO: I'm not sure what is this, maybe Random Vector?
	var RV = e.RV = function(range) {
		return Vector.Random(3).x(2).add(Vector.create([-1,-1,-1])).x(range);
	};

	// This function will walk the object hierarchy (parents and slots) and
	// return object containing all elements found.
	var walk = e.walk = function(start, dict) {
		var cc = dict || {};
		var browse = function(element) {
			if(!element) return;
			if(element.id in cc) return;
			cc[element.id] = element;
			if(element.parent) {
				browse(element.parent);
			}
			if(element.skeleton_slots) {
				for(var i = 0; i < element.skeleton_slots.length; ++i) {
					browse(element.skeleton_slots[i]);
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

	// This function can be used to get root element of the ship by passing
	// any of ship's elements as an argument
	var get_root = e.get_root = function(x) {
		while(true) {
			if(x.parent) {
				// If this object has a parent, save it and continue
				x = x.parent;
			} else {
				// But if it hasn't got a parent, let's return this object
				return x;
			}
		}
	};

	// This function will get position of ship basing on any of it's elements
	var get_position = e.get_position = function(x) {
		while(true) {
			if(x.parent) {
				x = x.parent;
			} else if(x.position) {
				return x.position;
			} else {
				return undefined;
			}
		}
	};

	// Just like previous function, but it's user to set the position
	var set_position = e.set_position = function(x, pos) {
		while(true) {
			if(x.parent) {
				x = x.parent;
			} else {
				if(x.position) {
					x.position = pos;
				}
				return;
			}
		}
	};

	// This function will return random number from -1 to 1
	var rand = e.rand = function() {
		return Math.random() * 2 - 1;
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
var radar = {
radar_range: 1.0
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

// Radar scanning

var radar_scan = { // >>
avatar_id: null, radar_id: null
};

var radar_scan_result = { // <<
radar_id: null,
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
