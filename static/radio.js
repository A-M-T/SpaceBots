
// When radio scanning is done, we get the array containing all items
// found within the `radio_range`. Each object found will have only
// most basic fields - id, position, velocity and sprite.

// After each radio update, we are up-to date with all objects
// positions and we are able to execute some additional action that is
// guaranteed to operate on correct values. We will store this action
// in `radio_callback`.
var radio_callback;
socket.on('radio result', function radio_result(result) {

  // Let's integrate new information into our own structures. We
  // will do it the same way as in 'report' handler.

  result.forEach(function(e) { register_object(e) });

  if(typeof radio_callback === 'function') {
    try {
      radio_callback();
    } catch(e) {
      radio_callback = undefined;
      console.error(e);
    }
  }

  // Same as with the reports, radio also should do rescans - after all
  // not everything moves along straight lines.

  setTimeout(function() {
    socket.emit('radio scan', {
      target: radio.id
    });

    // Radio rescans will be performed more often than avatar
    // scans - every second.

  }, 1000);
});

var messages = {};
var broadcast = function(msg) {
  socket.emit('radio broadcast', { target: avatar.id, message: msg });
};

socket.on('broadcast', function(data) {
  var id = data.source.id;
  if(!messages[id]) messages[id] = [];
  messages[id].unshift({ text: JSON.stringify(data.message), time: current_time });
  console.log("Broadcast from " + data.source.id + ": " + JSON.stringify(data.message));
});
