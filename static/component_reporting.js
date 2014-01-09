
var reporter = {
  queue: [],
  interval: 500,
  timeout_id: undefined,
  loop: function reporter_loop() {
    reporter.timeout_id = undefined;
    var id = reporter.queue.shift();
    if(id) {
      socket.emit('report', { target: id }, reporter.callback);
    }
    reporter.schedule();
  },
  callback: function reporter_callback(status, obj) {
    if(status !== 'success') {
      console.error("Couldn't get report: " + status + ", " + JSON.stringify(obj));
      return;
    }
    
    reporter.add(obj.id);

    // We can save it to our `objects` collection:

    obj = report2object(obj);

    // Now, we could check features of this object and check whether
    // it deserves special attention

    // If it is our avatar, we'll save it in the global `avatar`
    // variable.
    if(obj.id == avatar_id) {
      avatar = obj;
    }

    // If it is a radio, we'll save it into global `radio` variable...
    if(obj.features.radio && !radio) {
      radio = obj;
      // ... and schedule a radio scan right away.
      radio_scanner.run();
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
  },
  schedule: function reporter_schedule() {
    var t = reporter.interval * (Math.random() + 1);
    reporter.timeout_id = setTimeout(reporter.loop, t);
  },
  unschedule: function reporter_schedule() {
    clearTimeout(reporter.timeout_id);
    reporter.timeout_id = undefined;
  },
  add: function reporter_add(id) {
    if(reporter.queue.indexOf(id) < 0) {
      reporter.queue.push(id);
    }
  }
};

reporter.schedule();
