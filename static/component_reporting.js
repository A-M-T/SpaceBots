
// When component scanning will be done, we will get our answer as
// 'report' message.

var got_report;
var vectors_mask = { 'position': true, 'velocity': true};
socket.on('report', got_report = function(obj) {

  // We can save it to our `objects` collection:

  if(obj.id in objects) {

    // If we already have this object saved, we should only update
    // its fields.  We do this because during the execution
    // various parts of the game will create direct references to
    // the old object and we don't want to invalidate them.

    // Some fields are always sent by the server. Their old values
    // may however remain from older reports. We should delete
    // these possibly invalid properties.

    var always_sent = { manipulator_slot: true, parent: true, position: true, velocity: true };

    for(var key in always_sent) { delete objects[obj.id][key]; }

    // Now we can update our object with new values.

    for(var key in obj) {
      objects[obj.id][key] = obj[key];
    }

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

  for(var vname in vectors_mask) {
    if(vname in obj) {
      obj[vname] = vectors.create(obj[vname]);
    }
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

        if(typeof objects[child.id] === 'undefined' || objects[child.id].position) {
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
    if(obj.id in objects) {
      socket.emit('report', { target: obj.id });
    }
  }, 10000 * (Math.random() + 1)); // time in ms

  // Now, we could check features of this object and check whether
  // it deserves special attention

  // If it is our avatar, we'll save it in the global `avatar`
  // variable.
  if(obj.id == avatar_id) {
    avatar = obj;
  }

  // If it is a radio, we'll save it into global `radio` variable...
  if(('radio' in obj.features) && (radio === undefined)) {
    radio = obj;
    // ... and schedule a radio scan right away.
    socket.emit('radio scan', { target: radio.id });
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

  if('laboratory_tech_level' in obj) {
    laboratory = obj;
  }

  if(obj.features && obj.features.refinery) {
    refinery = obj;
  }

  if(obj.features && obj.features.assembler) {
    assembler = obj;
  }
});
