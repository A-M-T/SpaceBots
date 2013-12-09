
var invent = function(slot, energy) {
  socket.emit('laboratory invent', { target: laboratory.id, slot: slot, battery: battery.id, energy: energy });
};

socket.on('laboratory invented', function(data) {
  var slots = objects[data.laboratory.id].laboratory_slots
  slots[data.slot] = data.blueprint;
  var details = document.getElementById(data.laboratory.id);
  if(details) {
    details.querySelector('.laboratory_slots').innerHTML = stringify(slots);
  }
});

var abandon = function(slot) {
  socket.emit('laboratory abandon', { target: laboratory.id, slot: slot });
};

socket.on('laboratory abandoned', function(data) {
  var slots = objects[data.laboratory.id].laboratory_slots;
  slots[data.slot] = null;
  var details = document.getElementById(data.laboratory.id);
  if(details) {
    details.querySelector('.laboratory_slots').innerHTML = stringify(slots);
  }
});
