
var radio_scanner = {
  interval: 1000,
  timeout_id: undefined,
  callbacks: [],
  has_callback: function(cb) {
    return radio_scanner.callbacks.indexOf(cb) >= 0;
  },
  add_callback: function(cb) {
    if(radio_scanner.callbacks.indexOf(cb) < 0) {
      radio_scanner.callbacks.push(cb);
    }
  },
  remove_callback: function(cb) {
    var i = radio_scanner.callbacks.indexOf(cb);
    radio_scanner.callbacks.splice(i, 1);
  },
  loop: function radio_loop() {
    radio_scanner.timeout_id = undefined;

    socket.emit('radio scan', {
      target: radio.id
    });

    radio_scanner.schedule();
  },
  schedule: function radio_scanner_schedule() {
    if(radio_scanner.timeout_id) throw "Radio loop already running";
    var t = radio_scanner.interval;
    radio_scanner.timeout_id = setTimeout(radio_scanner.loop, t);
  },
  unschedule: function radio_scanner_schedule() {
    clearTimeout(radio_scanner.timeout_id);
    radio_scanner.timeout_id = undefined;
  },
  run: function radio_scanner_run() {
    radio_scanner.schedule();
  },
  result: function radio_scanner_result(result) {

    // When radio scanning is done, we get the array containing all items
    // found within the `radio_range`. Each object found will have only
    // most basic fields - id, position, velocity and sprite.
    
    // Let's integrate new information into our own structures. We
    // will do it the same way as in 'report' handler.

    result.forEach(function(e) { register_object(e) });

    // After each radio update, we are up-to date with all objects
    // positions and we are able to execute some additional action that is
    // guaranteed to operate on correct values. We will store this action
    // in `radio_scanner.callbacks`.

    for(var i = 0; i < radio_scanner.callbacks.length; ++i) {
      var cb = radio_scanner.callbacks[i];
      cb();
    };

  }
};

socket.on('radio result', radio_scanner.result);

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
