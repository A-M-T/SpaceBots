
var avatar_id;

// Excercise: check your avatar id by typing "avatar_id" in the
// console window. Avatar id, unlike player id can be made public - it
// simply identifies your avatar in the game. When other players will
// see your avatar on the radio, it will report the same avatar
// id. The same rule applies to all game objects - they all have ids.

// Now, that we are waiting for the server to return our avatar
// status, we can prepare an object that will hold our knowledge about
// the world in the game:

var objects = physics.objects;

// "Pantha rhei" - everything changes. Whenever we get data from the
// server, this data is valid at the moment it is generated. It should
// be useful to remember when we got this data. On order to do so, we
// will need a clock. We will hold it in this variable:

var current_time = 0;

// This function will get an object and integrate it into global
// database in the `objects` variable.

var report2object = function report2object(obj) {
  var key;

  if(objects[obj.id]) {

    // If we already have this object saved, we should only update
    // its fields.  We do this because during the execution
    // various parts of the game will create direct references to
    // the old object and we don't want to invalidate them.

    // Some fields are always sent by the server. Their old values
    // may however remain from older reports. We should delete
    // these possibly invalid properties.

    var old = objects[obj.id];
    
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
  // y, z]. We can convert them into vectors. This way they will be
  // easier to use.

  if(obj.position) obj.position = vectors.create(obj.position);
  if(obj.velocity) obj.velocity = vectors.create(obj.velocity);

  // Now, we can check what other components our `obj` is connected
  // to. Connections are saved in `connections` field.

  if(obj.connections) obj.connections = obj.connections.map(stub2object);
  if(obj.a) obj.a = stub2object(obj.a);
  if(obj.b) obj.b = stub2object(obj.b);

  return obj;

};

var stub2object = function(stub) {
  reporter.add(stub.id);
  return objects[stub.id] || (objects[stub.id] = stub);
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
