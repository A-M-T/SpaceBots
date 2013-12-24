
socket.on('destroyed', function(stub) {
  if(stub.id === avatar.id) {
    document.getElementById('overlay').appendChild(
      document.getElementById('destroyed').content.cloneNode(true));
  }
  var obj = common.get(stub.id);
  console.log("Object", obj.id, "has been destroyed");
  new Audio('/destruction.ogg').play();
  var desc = document.getElementById(obj.id);
  if(desc) {
    desc.remove();
  }

  var pos = common.get_root(obj).position;
  var vel = common.get_root(obj).velocity;

  var exp = {
    reported: current_time,
    position: pos,
    sprite: '/explosion45.png',
    duration: 1,
  };
  explosions.push(exp);
  new Audio('/boom'+Math.floor(Math.random()*3)+'.ogg').play();

  if(obj.hub_slots) {
    for(var i = 0; i < obj.hub_slots.length; ++i) {
      var orphan = obj.hub_slots[i];
      if(orphan) {
        orphan.parent = undefined;
        orphan.velocity = vectors.create(vel);
        orphan.position = vectors.create(pos);
        obj.hub_slots[i] = undefined;
      }
    }
  }

  if(obj.parent) {
    var me = obj.parent.hub_slots.indexOf(obj);
    obj.parent.hub_slots[me] = undefined;
    obj.parent = undefined;
  }

  delete objects[obj.id];
});
