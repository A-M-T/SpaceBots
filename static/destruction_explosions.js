
socket.on('destroyed', function(stub) {
  if(stub.id === avatar.id) {
    document.getElementById('overlay').appendChild(
      document.getElementById('destroyed').content.cloneNode(true));
  }
  var obj = common.get(stub.id);
  console.log("Object", obj.id, "has been destroyed");
  new Audio('/destruction.ogg').play();

  var pos = obj.position;

  var exp = {
    reported: current_time,
    position: pos,
    sprite: '/explosion45.png',
    duration: 1,
  };
  explosions.push(exp);
  new Audio('/boom'+Math.floor(Math.random()*3)+'.ogg').play();

  physics.destroy(obj);
});
