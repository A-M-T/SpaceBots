
// Welcome to SpaceBots, game where robots controlled by AI and human
// players compete to create thriving industry, accumulate resources
// and secure rare and efficient machines.

// This game is meant to be operated from built-in browser
// console. You can invoke it depending on your browser:

// Chrome: Shift + Ctrl + J
// Firefox: Shift + Ctrl + K (you may disable CSS and Network buttons)

// Once you are in the browser console, click on a link to
// 'client.js':

console.log('Click on a link to client.js:');

// If you have done everything properly, you should be reading the
// same file but from the inside of your browser :)

// We will show you how to interact with the game. Let's start with
// disabling this annoying question mark.

// Here are the lines that _may_ hide it:

if(localStorage.inhibitIntro) {
	document.getElementById('intro').style.display = 'none';
}

// Go to the console, type following command:
// localStorage.inhibitIntro = 'true';
// ... and refresh the page.

// Simple isn't it? You have just enabled the 'if' statement a few
// lines upwards from here :D 

// How to show help again? Go into the console and type:

// help()

// You will constantly be using Javascript to learn game mechanics, to
// automate boring chores and to write any tools you like that help
// you in the game.  We will teach you how to do it, don't worry if
// you are a javascript newbie.

// It is a good idea to take at least a short course on javascript
// before reading rest of the source code. This way you will
// understand the basics.  Examples from the code will help you even
// better understand the language.

// The code is filled with excercises so you can really understand
// mechanics governing various parts of the game. In the meantime you
// will learn some really neat programming tricks, so even if you are
// an expert programmer, taking this tutorial will have some benefit.

// Having said all the basics nessessary, we can begin the tour of the
// source code.

// We will start by running custom startup scripts. Initially there
// won't be any of them but you can create them, put them on the
// internet and use them to help you in the game.

// We will use special object called `localStorage` that persists over
// browser sessions. This object is avialable by default but its
// properties might not be set to proper values. If the set of custom
// scripts is undefined, we can set it to empty array:

localStorage.custom_scripts = localStorage.custom_scripts || "[]";

// Note that we saved our array as a string. LocalStorage can save
// only string values. We will use `JSON.parse` to convert them back
// into usable form.

// Now we can iterate over all URLs and add them to the website:

JSON.parse(localStorage.custom_scripts).forEach(function(url) {

	// Create new html element for the script

	var script = document.createElement('script');

	// Set the script to async - it will run when it'll be ready.

	script.async = true;

	// Set the url to proper address

	script.src = url;

	// Find any valid element that already is on the site (contents of
	// body might still being loaded when this code is run). First
	// script is a safe choice.

	var first_script = document.getElementsByTagName('script')[0];

	// Finally, insert script before the first script.

	// This line will actually load and run the script. If you got
	// 404, then probably url you entered in
	// `localStorage.custom_scripts` is down.

	first_script.parentNode.insertBefore(script, first_script);

});

// As you can see, the custom scripts are loaded from arbitrary urls -
// this means that you can create "public" scripts and give their
// addresses to other players. When you or others update the scripts,
// new versions will start to work right away. These few lines are
// actually quite handy.

// There is one important security issue here - the game is played
// over secured https and scripts usually are located on non-secured
// sites. If you want to load them anyway, use appropiate setting in
// your browser. In the case of Chromium this would be:

// chromium --allow-running-insecure-content

// If you are developing local scripts (accessed using file:// instead
// of http://) you can force browser to ignore security restrictions
// by running it with appropiate settings. In the case of Chromium
// this would be:

// chromium --allow-file-access

// Enough about plugins. Let's get back to the game.

// The game is operated through a live connection with its
// server. Here is the line that uses socket.io library to create
// this connection.

var socket = io.connect();

// We won't use socket.io directly anymore. All communication with
// server will be done by sending and receiving messages using just
// created socket.

// After connection we should log in. Here we have a function to
// log in to the game

var log_in = function() {
	// We don't have an account yet. A player is identified by a long
	// (32 characters) hexadecimal number called id. SpaceBots uses
	// such identifiers for most of the stuff found in the game. We
	// can create new id with `uid` function from `common` module.

	localStorage.player_id = localStorage.player_id || common.uid();

	// We store id in localStorage. This way you will log into the
	// same account each time you visit the page.

	// Excercise: calculate, how big is the probability that this
	// newly generated number could collide with random id of other
	// player. You can do it now.

	// Tip: find a calculator that can handle very small numbers.

	// As number of players is much higher than one (offline players
	// also count) the probability of id collision raises.

	// Excercise: calculate how much players should there be to raise
	// the probability of collision to 1%?

	// Tip: google for birthday paradox

	// Now that we have an id, we can send it to the server.

	socket.emit('log in', { player_id: localStorage.player_id });
};

// Now we start with the tutorial code. Let's begin with defining default
// values for tutorial_finished variable - we assume that if user starts
// the game for the first time, he didn't finished the tutorial

localStorage.tutorial_finished = localStorage.tutorial_finished || "false";

// Notice that localStorage allows to store only a string value
// so we'll need to use something like
// localStorage.tutorial_finished == "true"
// to access it

// Some helper variables for tutorial functions
var tutorial_canvas, tutorial_ctx, tutorial_original_socket, tutorial_target_id;

// We'll now define some text that will be shown in the tutorial

//TODO
var tutorial_strings = [
{ text: "Welcome to SpaceBots! Blablablablabla", start: function() {
	console.log("Starting the tutorial!");
	
	tutorial_original_socket = socket;
	socket = { emit: function(msg, data) {
		if(msg == 'impulse_drive push') {
			var reaction_mass = resources.get_mass(data.composition);
			var momentum = reaction_mass * data.impulse;
		
			var root = common.get_root(common.get(data.target));
			var d = root.position.distanceFrom(data.destination);
			var time = d / data.impulse;

			var direction = root.position.
				subtract(data.destination).
				toUnitVector();

			var mass = resources.get_connected_mass(common.get(data.target));
			var dv = momentum / mass;
			root.velocity = root.velocity.add( direction.toUnitVector().x(dv) );
		} else {
			console.error("Tried to send unknown message in tutorial mode!");
		}
	} };
	
	var shipid = common.uid();
	manipulator = objects[shipid] = {
		id: shipid,
		fetch_time: -1,
		integrity: 9999,
		mass: 25,
		manipulator_range: 50,
		position: $V([0,0,0]),
		velocity: $V([0,0,0]),
		skeleton_slots: new Array(6),
		sprite: "/hull.png",
		features: { skeleton: true, manipulator: true },
		screen_position: $V([0,0])
	};
	
	var objid = common.uid();
	radar = avatar = objects[shipid].skeleton_slots[0] = objects[objid] = {
		id: objid,
		fetch_time: -1,
		integrity: 9999,
		mass: 15,
		radar_range: 1000,
		sprite: "/avatar.png",
		features: { avatar: true, radar: true },
		parent: objects[shipid]
	};
	
	objid = common.uid();
	impulse_drive = store = battery = objects[shipid].skeleton_slots[1] = objects[objid] = {
		id: objid,
		fetch_time: -1,
		integrity: 9999,
		mass: 75,
		sprite: "/impulse_drive.png",
		features: { impulse_drive: true, battery: true, store: true },
		parent: objects[shipid],
		battery_capacity: 9999999,
		battery_energy: 9999999,
		store_capacity: 9999,
		store_stored: new Array(100),
		impulse_drive_impulse: 3000,
		impulse_drive_payload: 3
	};
	objects[objid].store_stored[0] = 9999;
	
	objid = common.uid();
	objects[shipid].skeleton_slots[2] = objects[objid] = {
		id: objid,
		fetch_time: -1,
		integrity: 9999,
		mass: 100,
		sprite: "/assembler.png",
		features: { assembler: true, refinery: true, spectrometer: true },
		parent: objects[shipid]
	};
	
	objid = common.uid();
	objects[shipid].skeleton_slots[3] = objects[objid] = {
		id: objid,
		fetch_time: -1,
		integrity: 9999,
		mass: 200,
		sprite: "/laboratory.png",
		features: { burning_reactor: true, enriching_reactor: true, laboratory: true },
		parent: objects[shipid]
	};
}},
{ text: "This is your ship. Click on it to show some options!", start: function() {
	tutorial_canvas = document.createElement('canvas');
	tutorial_canvas.width  = 100;
	tutorial_canvas.height = 100;
	tutorial_canvas.style.position = "fixed";
	tutorial_canvas.style.left = window.innerWidth/2-tutorial_canvas.width/2+"px";
	tutorial_canvas.style.top = window.innerHeight/2-tutorial_canvas.height-50+"px";
	document.getElementById("overlay").appendChild(tutorial_canvas);
	tutorial_ctx = tutorial_canvas.getContext('2d');
}, resize: function() {
	tutorial_canvas.style.left = window.innerWidth/2-tutorial_canvas.width/2+"px";
	tutorial_canvas.style.top = window.innerHeight/2-tutorial_canvas.height-50+"px";
}, animate: function() {
	//TODO: Animate the arrow. Something like the "?" sign but in JavaScript.
	tutorial_ctx.fillStyle = "rgba(255, 0, 0, 0.75)";
	tutorial_ctx.beginPath();
	tutorial_ctx.moveTo(25, 0);
	tutorial_ctx.lineTo(75, 0);
	tutorial_ctx.lineTo(75, 75);
	tutorial_ctx.lineTo(100, 75);
	tutorial_ctx.lineTo(50, 100);
	tutorial_ctx.lineTo(0, 75);
	tutorial_ctx.lineTo(25, 75);
	tutorial_ctx.lineTo(25, 0);
	tutorial_ctx.fill();
}, stop: function() {
	document.getElementById("overlay").removeChild(tutorial_canvas);
}, finished: function() {
	if(document.getElementById(avatar.parent.id))
		return true;
	else
		return false;
}},
{ text: "Left icon (<img src=\"/features/skeleton.png\">) is a list of components attached to your ship's hull. Right icon (<img src=\"/features/manipulator.png\">) is a manipulator. Click on a left icon, we'll come back to the manipulator later.",
on_controlschange: function(target, feature) {
	if(target != common.get_root(avatar).id) return;
	tutorial_strings[tutorial_process].var_finished = (feature == "skeleton");
}, finished: function() {
	return tutorial_strings[tutorial_process].var_finished;
}, var_finished: false },
{ text: "There are listed all of your ship's elements. Every row starts with first 4 chars of element ID, and is followed by pictures of element's features. We'll now shortly describe each of them." },
{ text: "In the first row you have your avatar (<img src=\"/features/avatar.png\">) and radar (<img src=\"/features/radar.png\">)." },
{ text: "<img src=\"/features/avatar.png\"> Avatar is basically your gateway to the ship, that can control other elements. You can have more than one avatar on the ship, but the web interface will allow you to control only the first one." },
{ text: "<img src=\"/features/radar.png\"> Radar is a way of looking at the world around you. Without a radar, you're basically blind." },
{ text: "In the second row you have your impulse drive (<img src=\"/features/impulse_drive.png\">), battery (<img src=\"/features/battery.png\">) and store (<img src=\"/features/store.png\">)." },
{ text: "<img src=\"/features/impulse_drive.png\"> Impulse drive is an engine that will provide thrust by throwing matter out of the exhaust pipe with blazing speeds. It basically allows us to move. We'll learn how to use it in a second." },
{ text: "<img src=\"/features/battery.png\"> Battery provides your ship with energy. It is used for example by impulse drive. There isn't any way of recharging the battery implemented yet - so use the energy reasonably!" },
{ text: "<img src=\"/features/store.png\"> Store will store all resources you collect. They are for example used to be thrown with impulse drive. There isn't any way of refilling the store implemented yet - so use the resources reasonably!" },
{ text: "In the third row you have the assembler (<img src=\"/features/assembler.png\">), refinery (<img src=\"/features/refinery.png\">) and spectrometer (<img src=\"/features/spectrometer.png\">). They all aren't implemented yet." },
{ text: "In the fourth row you have burning reactor (<img src=\"/features/burning_reactor.png\">), enriching reactor (<img src=\"/features/enriching_reactor.png\">) and laboratory (<img src=\"/features/laboratory.png\">). They also aren't implemented yet." },
{ text: "5th and 6th rows are empty and available to expand your ship" },
{ text: "OK, so now it's time to use our engines to move! Click on the ID of impulse drive (<img src=\"/features/impulse_drive.png\">).", finished: function() {
	if(document.getElementById(impulse_drive.id))
		return true;
	else
		return false;
}},
{ text: "Open impule drive controls by clicking on <img src=\"/features/impulse_drive.png\"> icon.",
on_controlschange: function(target, feature) {
	if(target != impulse_drive.id) return;
	tutorial_strings[tutorial_process].var_finished = (feature == "impulse_drive");
}, finished: function() {
	return tutorial_strings[tutorial_process].var_finished;
}, var_finished: false },
{ text: "You can click on any of the arrows to move in specified direction. Ice orb in the center stops the ship. Click any of the arrows now!",
finished: function() {
	return !common.get_root(avatar).velocity.eql($V([0,0,0]));
}},
{ text: "Look, you're moving! Now we'll try to move to the specific target." },
{ text: "Move towards that asteroid! It you'll get stuck, click \"Reset\" button to restore state form the beginning of the exercise",
resetable: true,
reset: function() {
	if(tutorial_target_id !== undefined) {
		delete objects[tutorial_target_id];
	}
	common.get_root(avatar).position = $V([0,0,0]);
	common.get_root(avatar).velocity = $V([0,0,0]);
	tutorial_target_id = common.uid();
	var asteroid = objects[tutorial_target_id] = {
		id: tutorial_target_id,
		fetch_time: -1,
		position: $V([-150, 0, 0]),
		velocity: $V([0, 0, 0]),
		screen_position: $V([0,0]),
		sprite: "/asteroid100.png"
	};
}, start: function() {
	tutorial_strings[tutorial_process].reset();
}, stop: function() {
	delete objects[tutorial_target_id];
	common.get_root(avatar).position = $V([0,0,0]);
	common.get_root(avatar).velocity = $V([0,0,0]);
}, finished: function() {
	if(!tutorial_strings[tutorial_process].finished_var) tutorial_strings[tutorial_process].finished_var = common.get_root(avatar).position.distanceFrom(objects[tutorial_target_id].position) < 25
	return tutorial_strings[tutorial_process].finished_var
}, finished_var: false},
{ text: "TODO" },
{ text: "That's all! You're now ready to enter the SpaceBots world!", stop: function() {
	socket = tutorial_original_socket;
	console.log("Tutorial has ended, logging in...");
}}
];

// We need to somehow store process of the tutorial. It'll be just a variable
// with id of current text from tutorial_strings table

var tutorial_process = 0;

// Here are three functions called from HTML code: first one starts the tutorial,
// second one skips the tutorial and connect to the server

var tutorial_start = function() {

    // So, the user wants to see the tutorial. Let's show the tutorial info window.
    
    document.getElementById("tutwindow").style.display="table";
    
    // Exectute the function to start the first step (more details in tutorial_continue)
    
    if(tutorial_strings[0].start) tutorial_strings[0].start();
    
    // Set the window contents to the first tutorial text
    
    document.getElementById("tutwindow_text").innerHTML = tutorial_strings[0].text;
    
	// If the step is resetable, show the button, if not hide it
	
	if(tutorial_strings[tutorial_process].resetable === true) {
		document.getElementById("tutwindow_resetbutton").style.display="inherit";
	} else {
		document.getElementById("tutwindow_resetbutton").style.display="none";
	}
    
    // And hide the question window
    
    document.getElementById("tutorial").style.display="none";
};

var tutorial_skip = function() {
    // Set the localStorage.tutorial_finished variable to say that user
    // doesn't want a tutorial anymore
    
    localStorage.tutorial_finished = "true";
    
    // This line hides the question "Do you want to start the tutorial"
    
    document.getElementById("tutorial").style.display="none";
    
    // Finally, we log in to the game
    
    log_in();
    
    // That's all! We can play online!
};

// Now a function to continue to next tutorial step

var tutorial_continue = function() {
	// Check if the step is finished
	if(tutorial_strings[tutorial_process].finished) if(!tutorial_strings[tutorial_process].finished()) return;

	// If we have function to end the current step, execute it
	// This will be used for interacive exercises and arrows
	// showing interface elemets
	if(tutorial_strings[tutorial_process].stop) tutorial_strings[tutorial_process].stop();
	
	// Increase current step id by one

	tutorial_process++;
	
	// If it was a last step, end the tutorial
	if(tutorial_process == tutorial_strings.length) {
		// We basically do the same as in tutorial_skip()
		localStorage.tutorial_finished = "true";
		document.getElementById("tutwindow").style.display="none";
		
		// Before logging in, we'll clear objects table, because example tutorial objects shouldn't be shown in online mode
		objects = { };
		current_time = 0;
		avatar = radar = impulse_drive = store = battery = manipulator = undefined;
		
		log_in();
		//End the function - we don't want to load new message
		return;
	}
	
	// But if it wasn't, maybe the next step will be last?
	else if(tutorial_process == tutorial_strings.length - 1) {
		// Change the button to say "End the tutorial"
		document.getElementById("tutwindow_button").value = "End the tutorial and go ONLINE >";
	}
	
	// Set the tutorial window text to the current one
	
	document.getElementById("tutwindow_text").innerHTML = tutorial_strings[tutorial_process].text;
	
	// If the step is resetable, show the button, if not hide it
	
	if(tutorial_strings[tutorial_process].resetable === true) {
		document.getElementById("tutwindow_resetbutton").style.display="inherit";
	} else {
		document.getElementById("tutwindow_resetbutton").style.display="none";
	}
	
	// And execute function to start current step
	
	if(tutorial_strings[tutorial_process].start) tutorial_strings[tutorial_process].start();
};

var tutorial_reset = function() {
	if(tutorial_strings[tutorial_process].resetable !== true) return;
	
	if(!tutorial_strings[tutorial_process].reset) return;
	
	tutorial_strings[tutorial_process].reset();
}

// We should hide the tutorial question if we already finished it, shouldn't we?

if(localStorage.tutorial_finished == "true") {
    document.getElementById("tutorial").style.display="none";
} else {
    document.getElementById("tutorial").style.display="table";
}

// Now back to the networking stuff!

// We use the 'connect' event to execute action right after
// connection is created.

socket.on('connect', function () {

    // If user already finished the tutorial, let's log in instantly
    // after connecting
    
    if(localStorage.tutorial_finished == "true") {
        log_in();
    }
});

// In the case something goes wrong (eventually it will) - server
// returns 'fail' message. It contains some basic information about
// error that have occured.  We'll simply print it in the console
// window.

socket.on('fail', function(report) {

	var msg = [
		'Error ',
		report.code,
		' in "',
		report.source,
		'": ',
		report.message
	].join('');

	console.error(msg);
	
});

// After properly logging in, server will send us a list of
// "avatars". They are little machines that can't do anything on their
// own but instead - they rely on controlling other machines. Avatars
// are our only way of controlling the world.

var avatar_id;

socket.on('avatar list', function (avatar_ids) {

	// Although you can have much more than one avatar, the basic
	// interface included on this site, allows you to control only the
	// first one - later you could extend it to allow control over a
	// fleet of avatars or write scripts to utilize additional ones as
	// autonomus radars, mining or combat robots.

	avatar_id = avatar_ids[0];

	// In order to get some basic informations about our avatar, we
	// will isue `report` command. Report will provide information
	// about avatar location, parts that it is connected with and
	// other interesting information.

	socket.emit('report', {
		target: avatar_id
	});

});

// Excercise: check your avatar id by typing "avatar_id" in the
// console window. Avatar id, unlike player id can be made public - it
// simply identifies your avatar in the game. When other players will
// see your avatar on the radar, it will report the same avatar
// id. The same rule applies to all game objects - they all have ids.

// Now, that we are waiting for the server to return our avatar
// status, we can prepare an object that will hold our knowledge about
// the world in the game:

var objects = {};

// "Pantha rhei" - everything changes. Whenever we get data from the
// server, this data is valid at the moment it is generated. It should
// be useful to remember when we got this data. On order to do so, we
// will need a clock. We will hold it in this variable:

var current_time = 0;

// Certain objects that we will most probably use all the time are
// also worth saving. Each of them will be more deeply described in
// appropiate section later on.

var avatar;

// Radar will map our surroundings. Without a decent radar, we are
// basically blind.

var radar;

// Drive will provide us with thrust. Without drive, we wouldn't be
// able to move a bit. There are various kinds of drives. Initially
// you will get impulse drive - not very efficient but it can also be
// used as a defense mechanism.

var impulse_drive;

// Store and battery will store resources and energy.

var store, battery;

// Manipulator can grab and throw various objects. It can't generate
// thrust as big as impulse drive but is able to grab any object.

var manipulator;

// Later on we will use other kinds of objects - batteries, reactors,
// weapons, labs, various secret modules and even create our own,
// custom components.

// Ok, let's get back to scanning our machine.

// When component scanning will be done, we will get our answer as
// 'report' message.

socket.on('report', function(obj) {

	// We can save it to our `objects` collection:

	if(obj.id in objects) {

		// If we already have this object saved, we should only update
		// its fields.  We do this because during the execution
		// various parts of the game will create direct references to
		// the old object and we don't want to invalidate them.

		// Some fields are always sent by the server. Their old values
		// may however remain from older reports. We should delete
		// these possibly invalid properties.

		var always_sent = { manipulator_slot: true, parent: true };

		for(var key in always_sent) { delete objects[obj.id][key]; }

		// Now we can update our object with new values.

		for(var key in obj) { objects[obj.id][key] = obj[key]; }

		// We should erase all references to the received
		// object. After all the data was copied, it could only
		// introduce mess in the code.

		obj = objects[obj.id];

	} else { objects[obj.id] = obj; }

	// We should record the moment we got our report.

	obj.fetch_time = current_time;

	// Position and velocity information will be sent as arrays: [x,
	// y, z]. We can convert them using `sylvester` library into
	// vectors. This way they will be easier to use.

	if(obj.position) {
		obj.position = $V(obj.position);
	}
	if(obj.velocity) {
		obj.velocity = $V(obj.velocity);
	}

	// Now, we can check what other components our `obj` is connected
	// to. Various components can have child elements. They are saved
	// in `skeleton_slots` field. Child elements connected through
	// `skeleton_slots` can communicate, exchange resources and power.

	if('skeleton_slots' in obj) {

		obj.skeleton_slots.forEach(function(child) {

			// `skeleton_slots` form an array. However - not every
			// index is filled. We check it now:

			if(child && child.id) {

				// Child components and various other items are
				// reported by the server as "stubs". They are objects
				// that have only one property defined: `id`. It makes
				// communication more efficient - if you already have
				// information about this particular object, the
				// server doesn't waste any bandwidth to send it
				// again. If you don't have any info then you can
				// request it using 'report' message.

				// When we already have the object scanned - we don't
				// need to issue 'report' command any more.
				
				if(typeof objects[child.id] === 'undefined') {
					objects[child.id] = child;
					socket.emit('report', { target: child.id });
				}

				// This way we will get 'scan report' for the next
				// component, and the next one, and so on.

				// This nifty trick will scan all the component hierarchy
				// that is under our control.

			}
		});
	}

	// Besides child elements, any object can control its own
	// parent. We will do basically the same thing as with
	// `skeleton_slots`. Only difference is that an object can have at
	// most one parent so we don't need to iterate over the array.

	if(obj.parent &&
	   obj.parent.id && 
	   typeof objects[obj.parent.id] === 'undefined') {
		objects[obj.parent.id] = obj.parent;
		socket.emit('report', { target: obj.parent.id });
	}

	// When manipulators hold other objects, they have stubs with
	// their ids in manipulator_slot. If we don't have any information
	// about these held objects, we should mark them in our objects
	// set:

	if(obj.manipulator_slot &&
	   obj.manipulator_slot.id && 
	   typeof objects[obj.manipulator_slot.id] === 'undefined') {
		objects[obj.manipulator_slot.id] = obj.manipulator_slot;
	}

	// Our object will have stub as a parent, stub as a held object
	// (if this is manipulator) and more stubs as its children. We can
	// fix it by replacing them with objects from `objects` set.

	if(obj.parent) {
		obj.parent = objects[obj.parent.id];
	}

	if(obj.skeleton_slots) {
		obj.skeleton_slots = obj.skeleton_slots.map(function(el) {
			return el ? objects[el.id] : el;
		});
	}

	if(obj.manipulator_slot) {
		obj.manipulator_slot = objects[obj.manipulator_slot.id];
	}

	// Now, that we are scanning our object, we could schedule a
	// rescan - just to be safe - to run every 10 seconds.
	setTimeout(function() {
		socket.emit('report', { target: obj.id });
	}, 10000 * (Math.random() + 1)); // time in ms

	// Now, we could check features of this object and check whether
	// it deserves special attention

	// If it is our avatar, we'll save it in the global `avatar`
	// variable.
	if(obj.id == avatar_id) {
		avatar = obj;
	}

	// If it is a radar, we'll save it into global `radar` variable...
	if(('radar' in obj.features) && (radar === undefined)) {
		radar = obj;
		// ... and schedule a radar scan right away.
		socket.emit('radar scan', {	target: radar.id });
	}

	// If this object is capable of hauling mass with high velocities,
	// we'll save it into impulse_drive variable for later use.
	if(('impulse_drive_payload' in obj) && (impulse_drive === undefined)) {
		impulse_drive = obj;
	}

	// We could alse remember our resource and energy stores:
	if(('store_stored' in obj) && (store === undefined)) {
		store = obj;
	}
	if(('battery_energy' in obj) && (battery === undefined)) {
		battery = obj;
	}

	// We can use any object with manipulator_range to manipulate
	// other objects
	if('manipulator_range' in obj) {
		manipulator = obj;
	}
});

// When radar scanning is done, we get the array containing all items
// found within the `radar_range`. Each object found will have only
// most basic fields - id, position, velocity and sprite.

socket.on('radar result', function(result) {

	// Let's integrate new information into our own structures. We
	// will do it the same way as in 'report' handler.

	result.forEach(function(object) {
		if(objects[object.id]) {
			for(var key in object) {
				objects[object.id][key] = object[key];
			}
		} else {
			objects[object.id] = object;
		}

		var local = objects[object.id];
		local.fetch_time = current_time;
		local.position = $V(local.position);
		if(local.velocity) local.velocity = $V(local.velocity);
	});
	
	// Same as with the reports, radar also should do rescans - after all
	// not everything moves along straight lines.

	setTimeout(function() {
		socket.emit('radar scan', {
			target: radar.id
		});

		// Radar rescans will be performed more often than avatar
		// scans - every second.
		
	}, 1000);
});

// Server will periodically ask questions about locations of various
// objects. This is part of location prediction minigame that will
// help you make better predictions about their trajectories.

socket.on('location challenge', function(q) {
	if(q in objects) {
		socket.emit('location answer', {
			id: q,
			position: objects[q].position.elements,
			velocity: objects[q].velocity.elements
		});
	}
});

// Whenever we have to specify, which materials are we going to waste, we will
// use this function. There are numerous reasons to waste materials - creating
// decoys, using mass as a propellant and others yet undisclosed.

var get_resources_for_waste = function(n) {
	
	// First - we create empty resource array. Each entry in this array
	// specifies amount of given element: from hydrogen (0) to fermium (99)

	var comp = resources.make_empty();

	// Let's use maximum amount of hydrogen.

	comp[0] = n;

	// Using hydrogen as a waste mass is a blatant profligacy - it
	// can be used as a fuel for reactor - and expelled only after burning
	// into iron - the least energetic element.

	// Excercise: use localStorage.custom_scripts to add a script with
	// your own copy of get_resources_for_waste(). Use more clever
	// resource allocation - first use iron, then cobalt, then mangan
	// etc. Up to full payload.

	return comp;
};

// Our first command will perform single full-powered impulse using
// our impulse drive toward direction indicated in parameters - x, y
// and z. With mass and speed specified by fraction of drive capabilities.

var do_impulse = function(x,y,z,mass,speed) {

	// Ok, impulse drives - this is the one that we will use - provide
	// thrust by throwing matter out of the exhaust pipe with blazing
	// speeds. The amount and velocity of matter depend on parameters:
	// impulse_drive_payload ind impulse_drive_impulse.

	var payload = impulse_drive.impulse_drive_payload * (mass || 1);

	// Unit of impulse is speed. Similarly to payload, we scale impulse
	// using parameter provided.

	var impulse = impulse_drive.impulse_drive_impulse * (speed || 1);
	var composition = get_resources_for_waste(payload);

	// Last step of our impulse is to send command to the drive.

	socket.emit('impulse_drive push', {
		target: impulse_drive.id,
		energy_source: battery.id,
		matter_source: store.id,
		composition: composition,
		impulse: impulse,
		destination: [
			camera.e(1) - x * 1000,
			camera.e(2) - y * 1000,
			camera.e(3) - z * 1000
		]
	});

	// Excercise: the above command uses camera location as an origin
	// for specifying target location. In your own implementation of
	// impulse try using position of avatar instead.
};

// This function will modify our speed towards desired velocity. If the
// desired velocity have been achieved, it will return false. If it still
// needs some refinements, it will return true.

var speed_step = function(desired_v) {

	// Let's calculate, how much momentum is provided by a full impulse:

	var payload = impulse_drive.impulse_drive_payload;
	var impulse = impulse_drive.impulse_drive_impulse;
	var momentum = payload * impulse;

	// Actual speed difference depends on mass of our ship. Heavy ships
	// need bigger engines. Lighter ships can jump around like little
	// devils. Let's calculate how much would that be in our case...

	var ship_mass = resources.get_connected_mass(impulse_drive);

	var delta_v_l = momentum / ship_mass;

	// Now we know, what our engine is capable of. Now let's check how
	// much resources we should actually use...

	var current_v = common.get_root(avatar).velocity;

	// Actual change of speed should be directed from our current velocity
	// towards desired one.

	var change_v = desired_v.subtract(current_v);

	// Let's calculate, how long this change actually is...

	var change_v_l = change_v.modulus();

	// And what direction it has.

	var direction = change_v.toUnitVector();

	// If our speed change is achievable, we could reduce engine power to 
	// save some resources.
	var achievable = change_v_l < delta_v_l;

	if(achievable) {
		do_impulse(
			direction.e(1),
			direction.e(2),
			direction.e(3),
			change_v_l / delta_v_l
		);
		return false;
	} else {
		do_impulse.apply(undefined, direction.elements);
		return true;
	}
};

// Now, we can think about how to stop us from moving.
// Let's start by declaring variable for stopping timer ID
var stop_timer = 0;
// Then, we can create main stopping function.
var stop_tick = function() {

	// It should do a single impulse directed towards reducing our speed.

	if(speed_step($V([0,0,0]))) {

		// If it hasn't finished, we have to shedule it again.

		// The timer can't run too quickly, because of 10 commands per
		// second limit.

		stop_timer = setTimeout(stop_tick, 300);

	} else {

		stop_timer = 0;
		console.log("Stopping finished");

	}

	// TODO: Every execution of this line doubles the object rescan speed
	// Stopping doesn't look too good visually with so slow rescans
	// BTW, this was meant to be 'radar scan'
	//socket.emit('report', { target: common.get_root(avatar).id });

};

// This function will be executed after clicking on stop orb.
// Its only function will be to set up our stop_tick timer.

var stop = function() {
	if(stop_timer == 0) {

		// The timer isn't running. Let's start it immediatly after
		// return from this function.

		console.log("Stopping initiated");
		stop_timer = setTimeout(stop_tick, 0);

	} else {

		// It timer is already running, let's abort stopping by
		// clearing scheduled timer.

		console.log("Aborted stopping!");
		clearTimeout(stop_timer);
		stop_timer = 0;

	}
};

var manipulator_grab = function() {
	socket.emit('manipulator grab', {
		target: manipulator.id
	});
};

socket.on('manipulator grabbed', function(data) {
	var stub = data.manipulator_slot
	objects[data.id].manipulator_slot = objects[stub.id];
});

var do_repulse = function(x, y, z, power) {
	power = power || manipulator.integrity;
	socket.emit('manipulator repulse', {
		target: manipulator.id,
		energy_source: battery.id,
		power: power,
		direction: [x, y, z]
	});
};

var navigate = function(destination) {
	destination = common.get(destination);

	// Now let's calculate how fast we are moving relative to our
	// destination and the direction we should move towards...
	var engine_pos = common.get_position(impulse_drive).now();
	var target_pos = common.get_position(destination).now();

	var diff = (new space.Position).v(function(d) {
		this[d] = target_pos[d] - engine_pos[d];
	}).p(function(d) {
		this[d] = target_pos[d] - engine_pos[d];
	});

	var distance = diff.length();

	console.log(diff);

};

// TODO!!!
var broadcast = function(msg) {
	socket.emit('broadcast', msg);
};

socket.on('broadcast', function(message) {
	console.log("Broadcast: " + message);
});

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
              function(f) { setTimeout(f, 1000 / 60); };

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
var camera = $V([0, 0, 0]);

// Now we can write the function that maps 3d points to screen coordinates.
var worldToScreen = function(p) {
	// First, we get the 3d coordinates relative to `camera`.
	var d = p.subtract(camera);
	var x = d.e(1), y = d.e(2), z = d.e(3);

	// Then, we calculate position using projection described earlier.
	return $V([
		x * XZ_width  - z * XZ_width      + canvas.width  / 2,
		x * XZ_height + z * XZ_height - y + canvas.height / 2
	]);
};

// Here are some drawing functions for various primitives on the screen:

// Here is the line between `a` and `b`:
var line = function(a, b) {
	ctx.beginPath();
	ctx.moveTo(a.e(1), a.e(2));
	ctx.lineTo(b.e(1), b.e(2));
	ctx.stroke();
};

// This function will draw slightly flattened ellipse at screen coordinates `x`,
// `y` with width `w`.
var ellipse = function(x, y, w) {
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

// Here is the function that will draw gradient background with black lines
// representing axes:
var background = function() {

	var x = canvas.width/2, y = canvas.height/2;
	
	var r = Math.sqrt(x*x + y*y);
	
	var grd = ctx.createRadialGradient(x, y, 20, x, y, r);
	grd.addColorStop(0, '#aaa');
	grd.addColorStop(0.2, '#556');
	grd.addColorStop(0.4, '#334');
	grd.addColorStop(1, '#422');
	
	ctx.fillStyle = grd;
	ctx.rect(0, 0, canvas.width, canvas.height);
	ctx.fill();

	ctx.strokeStyle = 'black';
	ctx.lineWidth = .5;
	line($V([x - 1000, y - 500]), $V([x + 1000, y + 500]));
	line($V([x - 1000, y + 500]), $V([x + 1000, y - 500]));
	line($V([x, y - 500]), $V([x, y + 500]));

};

// This function will draw "shadow" from lines. It will help visualise, where
// the point is in 3d space.
var shadow = function(p, color) {
	// `b` is the base of point `p` - it has the same coordinates (this is
	// achieved by using `p` as a prototype) except coordinate `y` which is set
	// to 0.
	var b = p.dup();
	b.elements[1] = camera.elements[1];
	var bp = worldToScreen(b);

	ctx.strokeStyle=color;
	ctx.fillStyle=color;
	ctx.setLineDash([5]);
	line(worldToScreen(p), bp);
	ctx.setLineDash([0]);
	//line(bp, worldToScreen(camera));

	ellipse(bp.e(1), bp.e(2), 10);
};

// When drawing images from the internet, we could cache their contents to
// download them only once. We will do this in this object. It's keys are
// going to be urls and values - images downloaded from the internet.
var image_cache = {};

var explosions = [];
socket.on('explosion', function(data) {
	data.reported = current_time;
	data.position = $V(data.position);
	explosions.push(data);
});

var get_current_pos = function(obj, time) {
	obj = common.get(obj);
	time = time || current_time;
	var r = common.get_root(obj);
	var p = r.position;
	if(r.velocity) p = p.add(r.velocity.x(time - r.fetch_time));
	return p;
};

var stars = [];
var scale = { current: 1, target: 1 };

var get_image = function(url) {
	if(!(url in image_cache)) {
		image_cache[url] = new Image;
		image_cache[url].src = url;
	}
	return image_cache[url];
};

var get_frame_count = function(filename) {
	var match = /(\d+)\.png$/.exec(filename);
	if(match) {
		return Number(match[1]);
	}
	return 1;
};

// Finally, this is function that will draw everything on the screen.
var tick = function(time) {


	// First - we convert time from milliseconds to seconds.
	time = time / 1000;

	// Next, we schedule next execution of `tick`.
	animate(tick);

	// The drawing begins with clearing canvas by filling it with background.
	background(time);

	var now = (new Date).getTime();

	// If we have avatar, we will move camera by 1/10th the distance towards it.
	if(avatar) {
		var ship = common.get_root(avatar);
		if(ship.position) {
			var targ = ship.position;
			if(ship.velocity) {
				targ = targ.add(ship.velocity.x(time - ship.fetch_time));
			}
			camera = camera.add(targ.subtract(camera).x(.1));
		}
	}

	scale.current += (scale.target - scale.current) / 5;

	ctx.save();
	ctx.translate(canvas.width / 2, canvas.height / 2);
	ctx.scale(scale.current, scale.current);
	ctx.translate(-canvas.width / 2, -canvas.height / 2);

	if(radar) {
		ctx.strokeStyle = 'red';
		ctx.lineWidth = radar.radar_range / 80;
		ctx.setLineDash([radar.radar_range / 20]);
		ctx.beginPath();
		ctx.arc(canvas.width/2, canvas.height/2, radar.radar_range, 0, 2 * Math.PI, true);
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
		var pos = worldToScreen(s.position);
		ctx.beginPath();
		ctx.arc(pos.e(1), pos.e(2), 2*a / scale.current, 0, 2*Math.PI, false);
		ctx.fill();
		if(s.age >= star_life) {
			stars.splice(i, 1);
			--i;
		}
	}
	ctx.globalAlpha = 1;

	if(Math.random() < 0.5) {
		stars.push({
			age: 0,
			position: camera.add(common.RV(500/scale.current))
		});
	}

	var arr = common.dict_to_array(objects).filter(function(o) { 
		return 'position' in o;
	});
	arr.sort(function(a, b) {
		
		return a.position.e(1) +
			a.position.e(2) / 100 +
			a.position.e(3) -
			b.position.e(1) -
			b.position.e(2) / 100 -
			b.position.e(3);
	});

	// Now, we draw every object from the `objects` set
	for(var i = 0; i < arr.length; ++i) {
		var obj = arr[i];

		var anomaly = false;
		if(time - obj.fetch_time > 2) {
			ctx.globalAlpha = Math.max(1 - (time - obj.fetch_time - 2)/10, 0.5);
		}

		if(time - obj.fetch_time > 5) {
			var ap = get_current_pos(avatar);
			if(get_current_pos(obj).distanceFrom(ap) < radar.radar_range) {
				anomaly = true;
			}
		}
		
		var pos = obj.position;
		if(obj.velocity) {
			pos = pos.add(obj.velocity.x(time - obj.fetch_time));
		}
		shadow(pos, 'white');
		obj.screen_position = worldToScreen(pos);
		
		var sprite_url = obj.sprite || '/unknown.png';
		var sprite = get_image(sprite_url);

		var frames = get_frame_count(sprite_url);

		var fw = sprite.width / frames;
		var fh = sprite.height;

		var sx = (Math.round(time * 30) % frames) * fw;
		var sy = 0;
		
		ctx.drawImage(
			sprite,
			sx, sy, fw, fh,
			obj.screen_position.e(1) - fw/2,
			obj.screen_position.e(2) - fh/2,
			fw, fh
		);

		ctx.globalAlpha = 1;

		if(anomaly) {
			var tw = ctx.measureText('?').width;
			ctx.save();
			ctx.fillStyle = '#34416c';
			ctx.font = 'bold 30px Dosis';
			ctx.strokeStyle = 'white';
			ctx.lineWidth = 3;
			ctx.strokeText('?', obj.screen_position.e(1) - tw/2, obj.screen_position.e(2));
			ctx.fillText('?', obj.screen_position.e(1) - tw/2, obj.screen_position.e(2));
			ctx.restore();
		}
	}

	draw_explosions(time);

	if(manipulator) {
		ctx.strokeStyle = 'white';
		ctx.setLineDash([1, 8]);
		ctx.lineDashOffset = time * 2;
		ctx.lineWidth = 2;
		ctx.lineCap = 'round';
		if(radar) {
			ctx.beginPath();
			ctx.arc(canvas.width/2, canvas.height/2, manipulator.manipulator_range, 0, 2 * Math.PI, false);
			ctx.stroke();
		}
		ctx.lineDashOffset = 0;
		ctx.setLineDash([1,0]);

		if(manipulator.manipulator_slot) {
			var pos_a = common.get_position(manipulator.manipulator_slot);
			var pos_b = common.get_position(manipulator);
			if(pos_a.distanceFrom(pos_b) > manipulator.manipulator_range) {
				delete manipulator.manipulator_slot.grabbed_by;
				delete manipulator.manipulator_slot;
			}
		}

		if(manipulator.manipulator_slot) {
			ctx.strokeStyle = 'black';
			ctx.lineWidth = 3;
			line(manipulator.screen_position, manipulator.manipulator_slot.screen_position);
			ctx.strokeStyle = '#00ffaa';
			ctx.lineWidth = 2;
			line(manipulator.screen_position, manipulator.manipulator_slot.screen_position);
		}
	}
	

	current_time = time;
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
	
	// Update fetch_time and position if in tutorial mode
	if(document.getElementById("tutwindow").style.display != "none") {
		for(var obj in objects) {
			if(objects[obj].position) objects[obj].position = get_current_pos(objects[obj]);
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
			e.screen_position = worldToScreen(e.position);

			shadow(e.position, 'rgba(255,0,0,'+(1 - dt / e.duration)+')');

			var fw = sprite.width / frames;
			var fh = sprite.height;
			var sx = Math.round(frames * dt / e.duration) * fw;
			var sy = 0;

			ctx.drawImage(
				sprite,
				sx, sy, fw, fh,
				e.screen_position.e(1) - fw/2,
				e.screen_position.e(2) - fh/2,
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

			Object.keys(child.features).forEach(function(feature) {
				var icon = document.createElement('img');
				icon.src = '/features/' + feature + '.png';
				icon.setAttribute('title', feature);
				item.appendChild(icon);
			});

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

controls.radar = function(elem, object) {
	elem.appendChild(document.createTextNode('Radar range: ' + Math.round(object.radar_range)));
};

controls.manipulator = function(elem, object) {
	elem.innerHTML = '<img src="/manipulator_axes.png" class="axes">';
	var img = elem.querySelector('img');
	img.setAttribute('usemap', '#manipulator_map');
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
	elem.innerHTML = '<img src="/axes.png" class="axes">';
	var img = elem.querySelector('img');
	img.setAttribute('usemap', '#impulse_drive_map');

	/*
	*/
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

		document.getElementById('overlay').appendChild(details);
		
		
	}
	details.style['z-index'] = top_index++;

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

document.addEventListener('click', function(e) {

}, true);

var find_parent = function(element, className) {
	while(!element.classList.contains(className)) {
		element = element.parentElement;
		if(element == null) {
			return undefined;
		}
	}
	return element;
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
		console.log('stopping propagation');
		e.stopPropagation();
	}
}, true);

document.addEventListener('mousedown', function(e) {

	var details = find_parent(e.target, 'details');

	if(details && e.button == 1) {
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
			
		} else if(details) {
			drag = {
				dragged: details,
				x: e.x,
				y: e.y
			};
			e.preventDefault();
			e.stopPropagation();
		}
	}
}, false);

document.addEventListener('mouseup', function(e) {
	drag = undefined;
}, true);

canvas.addEventListener('mousedown', function(e) {
	var half_canvas = $V([canvas.width, canvas.height]).x(.5);
	if(e.button == 0) {
		var clicked;
		var closest = 30;
		for(var hash in objects) {
			var o = objects[hash];
			if(o.screen_position) {
				
				var p = o.screen_position.subtract(half_canvas).x(scale.current).add(half_canvas);
				var d = p.distanceFrom($V([e.x, e.y]));
				if(d < closest) {
					closest = d;
					clicked = o;
				}
			}
		}
		if(clicked) {
			show_details_for(clicked, e);
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
	background();

	document.getElementById("tutorial").style.left = (window.innerWidth/2 - 150)+"px";
	document.getElementById("tutorial").style.top = (window.innerHeight/2 - 50)+"px";
	
	// Execute resize function from the tutorial
	
	if(tutorial_process < tutorial_strings.length && tutorial_strings[tutorial_process].resize) tutorial_strings[tutorial_process].resize();
};
onresize();

function help() {
	document.getElementById('intro').classList.add('notransition');

	var div = document.createElement('div');
	div.classList.add('editor');
	div.classList.add('details');

	var subdiv = document.createElement('div');
	subdiv.style.height = '100%';

	
	
	var editor = ace.edit(subdiv);
	editor.setTheme("ace/theme/monokai");
	editor.getSession().setMode("ace/mode/javascript");
	editor.setReadOnly(true);

	document.getElementById('overlay').appendChild(div);
	div.appendChild(subdiv);
	var client = new XMLHttpRequest();
	client.open('GET', '/client.js');
	client.onreadystatechange = function() {
		editor.setValue(client.responseText);
		editor.clearSelection();
		editor.scrollToLine(0, false, false);
	};
	client.send();
}
