
var estimate = function(slot) {
  socket.emit('assembler estimate', { target: assembler.id, laboratory: laboratory.id, slot: slot });
};

socket.on('assembler estimated', function(data) {
  console.log('Assemblet estimated blueprint to', data.materials);
});

var build = function(slot) {
  socket.emit('assembler build', { 
    target: assembler.id,
    laboratory: laboratory.id,
    slot: slot,
    store: store.id
  });
};

socket.on('assembler built', function(data) {
  got_report(data.object);
  console.log("Assembler has built " + JSON.stringify(data.object, null, '  '));
});
