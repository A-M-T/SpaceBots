
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

  return send('impulse_drive push', {
    target: impulse_drive.id,
    energy_source: battery.id,
    matter_source: store.id,
    composition: composition,
    impulse: impulse,
    destination: [ x, y, z ]
  });
  
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

  var current_v = impulse_drive.velocity;

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
    return do_impulse(
      target[0],
      target[1],
      target[2],
      change_v_l / delta_v_l
    );
  } else {
    return do_impulse.apply(undefined, target);
  }
};

var get_position_now = function get_position_now(x) {
  if(x.velocity) {
    return vectors.create(x.position).add(x.velocity, current_time - x.fetch_time);
  } else {
    return x.position;
  }
};

var destination = null;
var navigation_center = null;
var navigation_cancelled = null;
var navigation_succeeded = null;

var navigate_tick = function() {
  // Now let's calculate how fast we are moving relative to our
  // destination and the direction we should move towards...
  var engine_pos = get_position_now(navigation_center);
  var engine_vel = navigation_center.velocity;

  var target_velocity = vectors.create();
  var distance = 0;

  if(destination.position) {
    var target_pos = get_position_now(destination);
    var diff = vectors.create(target_pos).subtract(engine_pos);
    distance = diff.len();
    target_velocity.add(diff, 0.1);
  }

  if(destination.velocity) {
    target_velocity.add( destination.velocity );

    if(distance < 10) {
      target_velocity = destination.velocity;
    }
  }

  var velocity_diff = engine_vel.dist(target_velocity);
  if(velocity_diff > 0.5) {
    speed_step(target_velocity).catch(function(error) {
      console.error("Error during navigation", error);
      radio_scanner.remove_callback(navigate_tick);
      navigation_cancelled();
      destination = navigation_center = navigation_cancelled = navigation_succeeded = null;
    });
  }

  if((distance < 10) && (velocity_diff < 0.5)) {
    radio_scanner.remove_callback(navigate_tick);
    console.log("Destination reached.");
    radio_scanner.remove_callback(navigate_tick);
    navigation_succeeded();
    destination = navigation_center = navigation_cancelled = navigation_succeeded = null;
  }

};

var toggle_maneuver = function toggle_maneuver() {
  
  if(radio_scanner.has_callback(navigate_tick)) {
    console.log("Maneuver aborted!");
    radio_scanner.remove_callback(navigate_tick);
    navigation_cancelled();
    destination = navigation_center = navigation_cancelled = navigation_succeeded = null;
    return null;
  } else {
    return new Promise(function(resolve, reject) {
      console.log("Maneuver initiated");
      radio_scanner.add_callback(navigate_tick);
      navigation_cancelled = reject;
      navigation_succeeded = resolve;
    });
  }
  
};


var stop = function stop() {
  navigation_center = impulse_drive;
  destination = { velocity: vectors.zero };
  return toggle_maneuver();
};

var navigate = function navigate(dest, center) {
  navigation_center = common.get(center) || impulse_drive;
  destination = common.get(dest);
  return toggle_maneuver();
};
