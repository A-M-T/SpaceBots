
// Now we start with the tutorial code. Let's begin with defining default
// values for tutorial_finished variable - we assume that if user starts
// the game for the first time, he didn't finished the tutorial

localStorage.tutorial_finished = localStorage.tutorial_finished || "false";

// Notice that localStorage allows to store only a string value
// so we'll need to use something like
// localStorage.tutorial_finished == "true"
// to access it

// Some helper variables for tutorial functions
var tutorial_canvas, tutorial_ctx, tutorial_original_socket, tutorial_target_id;

// We'll now define some text that will be shown in the tutorial

var tutorial_strings = [
  { text: "Welcome to SpaceBots! It's a game about programming your ship that flies in space.", start: function() { //TODO: More explanation?
    console.log("Starting the tutorial!");

    tutorial_original_socket = socket;
    socket = { emit: function(msg, data) {
      if(msg == 'impulse_drive push') {
        var reaction_mass = resources.get_mass(data.composition);
        var momentum = reaction_mass * data.impulse;

        var root = common.get_root(common.get(data.target));
        var d = root.position.dist(data.destination);
        var time = d / data.impulse;

        var direction = root.position.
          subtract(data.destination).
          toUnitVector();

        var mass = resources.get_connected_mass(common.get(data.target));
        var dv = momentum / mass;
        root.velocity.add( direction.scaleTo(dv) );
      } else {
        console.error("Tried to send unknown message in tutorial mode!");
      }
    } };

    var shipid = common.uid();
    manipulator = objects[shipid] = {
      id: shipid,
      fetch_time: -1,
      integrity: 9999,
      mass: 25,
      manipulator_range: 50,
      position: vectors.create(),
      velocity: vectors.create(),
      skeleton_slots: new Array(6),
      sprite: "/hull.png",
      features: { skeleton: true, manipulator: true },
      screen_position: vectors.create(0, 0)
    };

    var objid = common.uid();
    radio = avatar = objects[shipid].skeleton_slots[0] = objects[objid] = {
      id: objid,
      fetch_time: -1,
      integrity: 9999,
      mass: 15,
      radio_range: 1000,
      sprite: "/avatar28.png",
      features: { avatar: true, radio: true },
      parent: objects[shipid]
    };

    objid = common.uid();
    impulse_drive = store = battery = objects[shipid].skeleton_slots[1] = objects[objid] = {
      id: objid,
      fetch_time: -1,
      integrity: 9999,
      mass: 75,
      sprite: "/impulse_drive.png",
      features: { impulse_drive: true, battery: true, store: true },
      parent: objects[shipid],
      battery_capacity: 9999999,
      battery_energy: 9999999,
      store_capacity: 9999,
      store_stored: new Array(100),
      impulse_drive_impulse: 3000,
      impulse_drive_payload: 3
    };
    objects[objid].store_stored[0] = 9999;

    objid = common.uid();
    objects[shipid].skeleton_slots[2] = objects[objid] = {
      id: objid,
      fetch_time: -1,
      integrity: 9999,
      mass: 100,
      sprite: "/assembler101.png",
      features: { assembler: true, refinery: true, spectrometer: true },
      parent: objects[shipid]
    };

    objid = common.uid();
    objects[shipid].skeleton_slots[3] = objects[objid] = {
      id: objid,
      fetch_time: -1,
      integrity: 9999,
      mass: 200,
      sprite: "/laboratory.png",
      features: { burning_reactor: true, enriching_reactor: true, laboratory: true },
      parent: objects[shipid]
    };
  }},
  { text: "This is your ship. Click on it to show some options!", start: function() {
    tutorial_canvas = document.createElement('canvas');
    tutorial_canvas.width  = 100;
    tutorial_canvas.height = 100;
    tutorial_canvas.style.position = "fixed";
    tutorial_canvas.style.left = window.innerWidth/2-tutorial_canvas.width/2+"px";
    tutorial_canvas.style.top = window.innerHeight/2-tutorial_canvas.height-50+"px";
    document.getElementById("overlay").appendChild(tutorial_canvas);
    tutorial_ctx = tutorial_canvas.getContext('2d');
  }, resize: function() {
    tutorial_canvas.style.left = window.innerWidth/2-tutorial_canvas.width/2+"px";
    tutorial_canvas.style.top = window.innerHeight/2-tutorial_canvas.height-50+"px";
  }, animate: function() {
    //TODO: Animate the arrow. Something like the "?" sign but in JavaScript.
    tutorial_ctx.fillStyle = "rgba(255, 0, 0, 0.75)";
    tutorial_ctx.beginPath();
    tutorial_ctx.moveTo(25, 0);
    tutorial_ctx.lineTo(75, 0);
    tutorial_ctx.lineTo(75, 75);
    tutorial_ctx.lineTo(100, 75);
    tutorial_ctx.lineTo(50, 100);
    tutorial_ctx.lineTo(0, 75);
    tutorial_ctx.lineTo(25, 75);
    tutorial_ctx.lineTo(25, 0);
    tutorial_ctx.fill();
  }, stop: function() {
    document.getElementById("overlay").removeChild(tutorial_canvas);
  }, finished: function() {
    if(document.getElementById(avatar.parent.id))
      return true;
    else
      return false;
  }},
  { text: "Left icon (<img src=\"/features/skeleton.png\">) is a list of components attached to your ship's hull. Right icon (<img src=\"/features/manipulator.png\">) is a manipulator. Click on a left icon, we'll come back to the manipulator later.",
    on_controlschange: function(target, feature) {
      if(target != common.get_root(avatar).id) return;
      tutorial_strings[tutorial_process].var_finished = (feature == "skeleton");
    }, finished: function() {
      return tutorial_strings[tutorial_process].var_finished;
    }, var_finished: false },
  { text: "There are listed all of your ship's elements. Every row starts with first 4 chars of element ID, and is followed by pictures of element's features. We'll now shortly describe each of them." },
  { text: "In the first row you have your avatar (<img src=\"/features/avatar.png\">) and radio (<img src=\"/features/radio.png\">)." },
  { text: "<img src=\"/features/avatar.png\"> Avatar is basically your gateway to the ship, that can control other elements. You can have more than one avatar on the ship, but the web interface will allow you to control only the first one." },
  { text: "<img src=\"/features/radio.png\"> Radio is a way of looking at the world around you. Without a radio, you're basically blind." },
  { text: "In the second row you have your impulse drive (<img src=\"/features/impulse_drive.png\">), battery (<img src=\"/features/battery.png\">) and store (<img src=\"/features/store.png\">)." },
  { text: "<img src=\"/features/impulse_drive.png\"> Impulse drive is an engine that will provide thrust by throwing matter out of the exhaust pipe with blazing speeds. It basically allows us to move. We'll learn how to use it in a second." },
  { text: "<img src=\"/features/store.png\"> Store will store all resources you collect. They are for example used to be thrown with impulse drive. You can refill the store by using the refinery, or stealing the resources from another ship." },
  { text: "<img src=\"/features/battery.png\"> Battery provides your ship with energy. It is used for example by impulse drive. For now the only way of recharging the battery is to steal the energy from another ship, so don't use up all of you power!" },
  { text: "In the third row you have the assembler (<img src=\"/features/assembler.png\">), refinery (<img src=\"/features/refinery.png\">) and spectrometer (<img src=\"/features/spectrometer.png\">)." },
  { text: "<img src=\"/features/refinery.png\"> Refinery is used to create materials from objects you find. They can be asteroids, other ships or even parts of your own ship! Hovewer, there isn't a GUI to use it. You need to write all of the client-side code yourself! More informations can be found in source code (\"?\" sign in the top-left)" }, //TODO: More informations
  { text: "<img src=\"/features/assembler.png\"> Assembler is used to build elements invented by laboratory" },
  { text: "<img src=\"/features/spectrometer.png\"> Spectrometer isn't implemented yet" },
  { text: "In the fourth row you have burning reactor (<img src=\"/features/burning_reactor.png\">), enriching reactor (<img src=\"/features/enriching_reactor.png\">) and laboratory (<img src=\"/features/laboratory.png\">)." },
  { text: "<img src=\"/features/laboratory.png\"> Laboratory is used to invent new elements to your ships. They are better than your default hardware. The more energy you'll put into your laboratory, the better will be blueprints for elements you'll get." },
  { text: "<img src=\"/features/burning_reactor.png\"> <img src=\"/features/enriching_reactor.png\"> Burning reactor and enriching reactor aren't implemented yet." },
  { text: "5th and 6th rows are empty and available to expand your ship" },
  { text: "Now click on the manipulator icon (<img src=\"/features/manipulator.png\">)",
    on_controlschange: function(target, feature) {
      if(target != common.get_root(avatar).id) return;
      tutorial_strings[tutorial_process].var_finished = (feature == "manipulator");
    }, finished: function() {
      return tutorial_strings[tutorial_process].var_finished;
    }, var_finished: false },
  { text: "You can see the manipulator GUI here. White, dashed line near your ship shows it's range. You can grab objects by clicking in the center. Manipulator can also attach or detach elements of your ship, but as with refinery, you can't do this in graphical interface" },
  { text: "OK, so now it's time to use our engines to move! Go back to skeleton view (<img src=\"/features/skeleton.png\">) and click on the ID of impulse drive (<img src=\"/features/impulse_drive.png\">).", finished: function() {
    if(document.getElementById(impulse_drive.id))
      return true;
    else
      return false;
  }},
  { text: "Open impule drive controls by clicking on <img src=\"/features/impulse_drive.png\"> icon.",
    on_controlschange: function(target, feature) {
      if(target != impulse_drive.id) return;
      tutorial_strings[tutorial_process].var_finished = (feature == "impulse_drive");
    }, finished: function() {
      return tutorial_strings[tutorial_process].var_finished;
    }, var_finished: false },
  { text: "You can click on any of the arrows to move in specified direction. Ice orb in the center stops the ship. Click any of the arrows now!",
    finished: function() {
      return !common.get_root(avatar).velocity.eql(vectors.create());
    }},
  { text: "Look, you're moving! Now we'll try to move to the specific target." },
  { text: "Move towards that asteroid! It you'll get stuck, click \"Reset\" button to restore state from the beginning of the exercise",
    resetable: true,
    reset: function() {
      if(tutorial_target_id !== undefined) {
        delete objects[tutorial_target_id];
      }
      common.get_root(avatar).position = vectors.create();
      common.get_root(avatar).velocity = vectors.create();
      tutorial_target_id = common.uid();
      var asteroid = objects[tutorial_target_id] = {
        id: tutorial_target_id,
        fetch_time: -1,
        position: vectors.create([-150, 0, 0]),
        velocity: vectors.create([0, 0, 0]),
        sprite: "/asteroid100.png"
      };
    }, start: function() {
      tutorial_strings[tutorial_process].reset();
    }, stop: function() {
      delete objects[tutorial_target_id];
      common.get_root(avatar).position = vectors.create();
      common.get_root(avatar).velocity = vectors.create();
    }, finished: function() {
      if(!tutorial_strings[tutorial_process].finished_var) tutorial_strings[tutorial_process].finished_var = common.get_root(avatar).position.distanceFrom(objects[tutorial_target_id].position) < 25
      return tutorial_strings[tutorial_process].finished_var;
    }, finished_var: false},
  { text: "Now let's try something harder. There is moving target - go close to it!",
    resetable: true,
    reset: function() {
      if(tutorial_target_id !== undefined) {
        delete objects[tutorial_target_id];
      }
      common.get_root(avatar).position = vectors.create();
      common.get_root(avatar).velocity = vectors.create();
      tutorial_target_id = common.uid();
      var asteroid = objects[tutorial_target_id] = {
        id: tutorial_target_id,
        fetch_time: -1,
        position: vectors.create([0, 0, -50]),
        velocity: vectors.create([0, 0, -20]),
        sprite: "/asteroid100.png"
      };
    }, start: function() {
      tutorial_strings[tutorial_process].reset();
    }, stop: function() {
      delete objects[tutorial_target_id];
      common.get_root(avatar).position = vectors.create();
      common.get_root(avatar).velocity = vectors.create();
    }, finished: function() {
      if(!tutorial_strings[tutorial_process].finished_var) tutorial_strings[tutorial_process].finished_var = common.get_root(avatar).position.distanceFrom(objects[tutorial_target_id].position) < 30;
      return tutorial_strings[tutorial_process].finished_var;
    }, finished_var: false},
  { text: "It's not so simple now: you need to move on two axes to go near the target",
    resetable: true,
    reset: function() {
      if(tutorial_target_id !== undefined) {
        delete objects[tutorial_target_id];
      }
      common.get_root(avatar).position = vectors.create();
      common.get_root(avatar).velocity = vectors.create();
      tutorial_target_id = common.uid();
      var asteroid = objects[tutorial_target_id] = {
        id: tutorial_target_id,
        fetch_time: -1,
        position: vectors.create([-150, 0, -150]),
        velocity: vectors.create([0, 0, 0]),
        sprite: "/asteroid100.png"
      };
    }, start: function() {
      tutorial_strings[tutorial_process].reset();
    }, stop: function() {
      delete objects[tutorial_target_id];
      common.get_root(avatar).position = vectors.create();
      common.get_root(avatar).velocity = vectors.create();
    }, finished: function() {
      if(!tutorial_strings[tutorial_process].finished_var) tutorial_strings[tutorial_process].finished_var = common.get_root(avatar).position.distanceFrom(objects[tutorial_target_id].position) < 50;
      return tutorial_strings[tutorial_process].finished_var;
    }, finished_var: false},
  { text: "This dashed line represents diffrence in height (Y axis). Now you need to use the green arrow to move in that direction.",
    resetable: true,
    reset: function() {
      if(tutorial_target_id !== undefined) {
        delete objects[tutorial_target_id];
      }
      common.get_root(avatar).position = vectors.create();
      common.get_root(avatar).velocity = vectors.create();
      tutorial_target_id = common.uid();
      var asteroid = objects[tutorial_target_id] = {
        id: tutorial_target_id,
        fetch_time: -1,
        position: vectors.create([0, -150, 0]),
        velocity: vectors.create([0, 0, 0]),
        sprite: "/asteroid100.png"
      };
    }, start: function() {
      tutorial_strings[tutorial_process].reset();
    }, stop: function() {
      delete objects[tutorial_target_id];
      common.get_root(avatar).position = vectors.create();
      common.get_root(avatar).velocity = vectors.create();
    }, finished: function() {
      if(!tutorial_strings[tutorial_process].finished_var) tutorial_strings[tutorial_process].finished_var = common.get_root(avatar).position.distanceFrom(objects[tutorial_target_id].position) < 50;
      return tutorial_strings[tutorial_process].finished_var;
    }, finished_var: false},
  { text: "You can close windows by middle-clicking them. Close all windows you've opened before!", finished: function() {
    var windows = document.getElementById("overlay").childNodes;
    var ok = true;
    for (var i = 0; i < windows.length; ++i) {
      var elem = windows[i];
      if(elem.id != "tutwindow" && elem.id !== undefined) {
        ok = false;
      }
    }
    return ok;
  }},
  { text: "That's all! You're now ready to enter the SpaceBots world! You can find more informations about programming the game by clicking on the \"?\" sign in the upper-left corner", stop: function() {
    socket = tutorial_original_socket;


    // Close all windows
    var windows = document.getElementById("overlay").childNodes;
    for (var i = 0; i < windows.length; ++i) {
      var elem = windows[i];
      if(elem.id != "tutwindow" && elem.id !== undefined) {
        document.getElementById("overlay").removeChild(elem);
      }
    }

    console.log("Tutorial has ended, logging in...");
  }}
];

// We need to somehow store process of the tutorial. It'll be just a variable
// with id of current text from tutorial_strings table

var tutorial_process = 0;

// Here are three functions called from HTML code: first one starts the tutorial,
// second one skips the tutorial and connect to the server

var tutorial_start = function() {

  // So, the user wants to see the tutorial. Let's show the tutorial info window.

  document.getElementById("tutwindow").style.display="table";

  // Exectute the function to start the first step (more details in tutorial_continue)

  if(tutorial_strings[0].start) tutorial_strings[0].start();

  // Set the window contents to the first tutorial text

  document.getElementById("tutwindow_text").innerHTML = tutorial_strings[0].text;

  // If the step is resetable, show the button, if not hide it

  if(tutorial_strings[tutorial_process].resetable === true) {
    document.getElementById("tutwindow_resetbutton").style.display="inherit";
  } else {
    document.getElementById("tutwindow_resetbutton").style.display="none";
  }

  // And hide the question window

  document.getElementById("tutorial").style.display="none";
};

var tutorial_skip = function() {
  // Set the localStorage.tutorial_finished variable to say that user
  // doesn't want a tutorial anymore

  localStorage.tutorial_finished = "true";

  // This line hides the question "Do you want to start the tutorial"

  document.getElementById("tutorial").style.display="none";

  // Finally, we log in to the game

  log_in();

  // That's all! We can play online!
};

// Now a function to continue to next tutorial step

var tutorial_continue = function() {
  // Check if the step is finished
  if(tutorial_strings[tutorial_process].finished) if(!tutorial_strings[tutorial_process].finished()) return;

  // If we have function to end the current step, execute it
  // This will be used for interacive exercises and arrows
  // showing interface elemets
  if(tutorial_strings[tutorial_process].stop) tutorial_strings[tutorial_process].stop();

  // Increase current step id by one

  tutorial_process++;

  // If it was a last step, end the tutorial
  if(tutorial_process == tutorial_strings.length) {
    // We basically do the same as in tutorial_skip()
    localStorage.tutorial_finished = "true";
    document.getElementById("tutwindow").style.display="none";

    // Before logging in, we'll clear objects table, because example tutorial objects shouldn't be shown in online mode
    objects = { };
    current_time = 0;
    avatar = radio = impulse_drive = store = battery = manipulator = undefined;

    log_in();
    //End the function - we don't want to load new message
    return;
  }

  // But if it wasn't, maybe the next step will be last?
  else if(tutorial_process == tutorial_strings.length - 1) {
    // Change the button to say "End the tutorial"
    document.getElementById("tutwindow_button").value = "End the tutorial and go ONLINE >";
  }

  // Set the tutorial window text to the current one

  document.getElementById("tutwindow_text").innerHTML = tutorial_strings[tutorial_process].text;

  // If the step is resetable, show the button, if not hide it

  if(tutorial_strings[tutorial_process].resetable === true) {
    document.getElementById("tutwindow_resetbutton").style.display="inherit";
  } else {
    document.getElementById("tutwindow_resetbutton").style.display="none";
  }

  // And execute function to start current step

  if(tutorial_strings[tutorial_process].start) tutorial_strings[tutorial_process].start();
};

var tutorial_reset = function() {
  if(tutorial_strings[tutorial_process].resetable !== true) return;

  if(!tutorial_strings[tutorial_process].reset) return;

  tutorial_strings[tutorial_process].reset();
}

// We should hide the tutorial question if we already finished it, shouldn't we?

if(localStorage.tutorial_finished == "true") {
  document.getElementById("tutorial").style.display="none";
} else {
  document.getElementById("tutorial").style.display="table";
}
