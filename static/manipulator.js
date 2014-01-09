
var grab = function(x, y, z) {
  var json = { target: manipulator.id };
  if(x || y || z) json.position = [x, y, z];
  socket.emit('manipulator grab', json)
};

socket.on('manipulator grabbed', function(data) {
  var stub = data.manipulator_slot
  objects[data.id].manipulator_slot = objects[stub.id];
});

var release = function() {
  socket.emit('manipulator release', {target:manipulator.id});
};

socket.on('manipulator released', function(data) {
  delete objects[data.id].manipulator_slot;
});

var attach = function(hub, slot) {
  hub = common.get(hub);
  socket.emit('manipulator attach', {target: manipulator.id, hub: hub.id, hub_slot: slot});
};

socket.on('manipulator attached', function(data) {
  var s = common.get(data.hub.id);
  var o = common.get(data.object.id);
  var m = common.get(data.manipulator.id);
  s.hub_slots[data.slot] = o;
  o.parent = s;
  delete o.position;
  delete o.velocity;
  delete o.grabbed_by;
  delete m.manipulator_slot;
  socket.emit('report', { target: o.id });
});

var detach = function(hub, slot) {
  var s = common.get(hub);
  socket.emit('manipulator detach', {target: manipulator.id, hub: s.id, hub_slot: slot});
};

socket.on('manipulator detached', function(data) {
  var s = common.get(data.hub.id);
  var o = common.get(data.object.id);
  var m = common.get(data.manipulator.id);

  m.manipulator_slot = o;
  s.hub_slots[idx] = null;
  delete o.parent;
  o.grabbed_by = m;
  o.position = vectors.create(m.position);
  o.velocity = vectors.create(m.velocity);
});

var repulse = function(x, y, z, power) {
  power = power || manipulator.integrity;
  socket.emit('manipulator repulse', {
    target: manipulator.id,
    energy_source: battery.id,
    power: power,
    direction: [x, y, z]
  });
};
