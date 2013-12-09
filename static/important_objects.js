
var avatar_id;

// Excercise: check your avatar id by typing "avatar_id" in the
// console window. Avatar id, unlike player id can be made public - it
// simply identifies your avatar in the game. When other players will
// see your avatar on the radio, it will report the same avatar
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

// This function will get an object and integrate it into global
// database in the `objects` variable.

var vector_keys = { 'position': true, 'velocity': true};
var register_object = function register_object(obj, always_sent) {
  var key;

  if(obj.id in objects) {

    // If we already have this object saved, we should only update
    // its fields.  We do this because during the execution
    // various parts of the game will create direct references to
    // the old object and we don't want to invalidate them.

    // Some fields are always sent by the server. Their old values
    // may however remain from older reports. We should delete
    // these possibly invalid properties.

    var old = objects[obj.id];
    
    if(always_sent) {
      for(key in always_sent) {
        delete old[key];
      }
    }

    for(key in obj) old[key] = obj[key];

    // We should erase all references to the received
    // object. After all the data was copied, it could only
    // introduce mess in the code.

    obj = old;
  } else {
    objects[obj.id] = obj;
  }

  // We should record the moment we got our report.

  obj.fetch_time = current_time;

  // Position and velocity information will be sent as arrays: [x,
  // y, z]. We can convert them using `sylvester` library into
  // vectors. This way they will be easier to use.

  for(key in vector_keys) if(key in obj) obj[key] = vectors.create(obj[key]);

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

        if(typeof objects[child.id] === 'undefined' || objects[child.id].position) {
          objects[child.id] = child;
        }

        reporter.add(child.id)

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
    reporter.add(obj.parent.id);
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

  return obj;

};

// Certain objects that we will most probably use all the time are
// also worth saving. Each of them will be more deeply described in
// appropiate section later on.

var avatar;

// Radio will map our surroundings. Without a decent radio, we are
// basically blind.

var radio;

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

var refinery, laboratory, assembler;
