
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

// TODO: document

var relative_to_absolute = function(vector) {
  var p = get_position_now(avatar);
  return [
    p[0] - vector[0] * 500,
    p[1] - vector[1] * 500,
    p[2] - vector[2] * 500
  ]
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
    destination: [ x, y, z ]
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

  var change_v = vectors.create(desired_v).subtract(current_v);

  // Let's calculate, how long this change actually is...

  var change_v_l = change_v.len();

  // And what direction it has.

  var direction = vectors.create(change_v).normalize();

  // If our speed change is achievable, we could reduce engine power to
  // save some resources.
  var achievable = change_v_l < delta_v_l;

  var target = relative_to_absolute(direction);

  if(achievable) {
    do_impulse(
      target[0],
      target[1],
      target[2],
      change_v_l / delta_v_l
    );
    return false;
  } else {
    do_impulse.apply(undefined, target);
    return true;
  }
};

var stop = function() {
  if(radio_scanner.has_callback(navigate_tick)) {

    // It callback is already running, let's abort stopping by
    // clearing it.

    radio_scanner.remove_callback(navigate_tick);
    console.log("Maneuver aborted!");

  } else {

    // The callback isn't set. Let's set it.

    destination = { velocity: vectors.zero };
    radio_scanner.add_callback(navigate_tick);
    console.log("Stopping initiated");

  }
};

var get_position_now = function get_position_now(x) {
  var root = common.get_root(common.get(x));
  if('velocity' in root) {
    return vectors.create(root.position).add(root.velocity, current_time - root.fetch_time);
  } else {
    return root.position;
  }
};

var destination = null;
var destination_callback = null;

var navigate_tick = function() {
  // Now let's calculate how fast we are moving relative to our
  // destination and the direction we should move towards...
  var engine_pos = get_position_now(impulse_drive);
  var target_pos;
  if('position' in destination) {
    target_pos = get_position_now(destination);
  }

  var target_velocity = vectors.create();
  var distance = 0;

  if(target_pos) {
    var diff = vectors.create(target_pos).subtract(engine_pos);
    distance = diff.len();
    target_velocity.add(diff, 0.1);
  }

  if('velocity' in destination) {
    target_velocity.add( destination.velocity );

    if(distance < 10) {
      target_velocity = destination.velocity;
    }
  }

  var my_velocity = common.get_root(impulse_drive).velocity;
  var velocity_diff = my_velocity.dist(target_velocity);
  if(velocity_diff > 0.5) {
    speed_step(target_velocity);
  }

  if((distance > 10) || (velocity_diff > 0.5)) {
    radio_scanner.add_callback(navigate_tick);
  } else {
    radio_scanner.remove_callback(navigate_tick);
    var c = destination_callback;
    if(c) {
      destination_callback = null;
      c();
    }
    console.log("Destination reached.");
  }

};

var navigate = function(dest, cb) {
  destination = common.get(dest);
  destination_callback = cb;

  if(radio_scanner.has_callback(navigate_tick)) {
    radio_scanner.remove_callback(navigate_tick);
    console.log("Maneuver aborted!");
  } else {
    radio_scanner.add_callback(navigate_tick);
    console.log("Maneuver initiated");
  }

};
