(function(e){

	if(typeof exports !== 'undefined') {
	  var resources = require('./resources'),
	      common = require('./common');
  }

  var objects = e.objects = {};
    
  var destroy = e.destroy = function(object) {

    if(object.connections) {
      object.connections.forEach(function(c) {
        var other = (object === c.a ? c.b : c.a).connections;
        other.splice(other.indexOf(c), 1);
        delete objects[c.id];
      });
    }

    if(object.a) object.a.connections.splice(object.a.connections.indexOf(object), 1);
    if(object.b) object.b.connections.splice(object.b.connections.indexOf(object), 1);

    delete objects[object.id];

  };

  var damage = e.damage = function damage(object, value) {
    if(value <= object.integrity) return false;
    object.integrity -= (value - object.integrity) * Math.random();
    if(object.integrity <= 0) {
      destroy(object);
      return true;
    }
    return false;
  };

  var thrust_dfs = function(object, thrust_source, speed) {

    var mass = object.mass || resources.get_mass(object.composition);
    if(object.connections) {
      object.connections.forEach(function(conn) {
        if(conn != thrust_source) {
          mass += thrust_dfs(conn, object, speed);
        }
      });
    }
    if(object.a && (object.a !== thrust_source)) {
      mass += thrust_dfs(object.a, object, speed);
    }
    if(object.b && (object.b !== thrust_source)) {
      mass += thrust_dfs(object.b, object, speed);
    }
    var energy = mass * speed;
    if(damage(object, energy)) {
      mass = 0;
    }
    return mass;

  }


  var thrust = e.thrust = function(object, momentum) {

    var mass = resources.get_connected_mass(object);
	  var cc = common.walk(object, 'rigid');
	  for(var id in cc) {
      if(cc[id].velocity) {
        cc[id].velocity.add( momentum, 1 / mass );
      }
    }
    thrust_dfs(object, object, momentum.len() / mass);

  };
  
})(typeof exports === 'undefined' ? this['physics'] = {} : exports);

