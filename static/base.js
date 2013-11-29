// Extend Element with utility functions...

Element.prototype.fadeOut = function() {
  this.style['-webkit-animation'] = 'slideOut 500ms';
  this.addEventListener('webkitAnimationEnd', function() {
    this.remove();
  });
};

Element.prototype.remove = function() {
  this.parentElement.removeChild(this);
};

NodeList.prototype.remove = HTMLCollection.prototype.remove = function() {
  for(var i = 0, len = this.length; i < len; i++) {
    if(this[i] && this[i].parentElement) {
      this[i].parentElement.removeChild(this[i]);
    }
  }
};

NodeList.prototype.text = HTMLCollection.prototype.text = function(text) {
  for(var i = 0, len = this.length; i < len; i++) {
    if(this[i]) {
      this[i].textContent = text;
    }
  }
};

// On-screen console

(function() {
  var make_logger = function(style, command) {
    return function() {
      var c = document.getElementById('console');
      var m = document.createElement('div');
      if(style) m.classList.add(style);
      var t = Array.prototype.join.call(arguments, ' ');
      m.innerText = t;
      c.appendChild(m);
      setTimeout(function() {
        m.fadeOut();
      }, 3000 + 100 * t.length);
      command.apply(this, arguments);
    }
  };
  console.log = make_logger(null, console.log);
  console.info = make_logger('info', console.info);
  console.warn = make_logger('warn', console.warn);
  console.error = make_logger('error', console.error);
})();


// We will start by running custom startup scripts. Initially there
// won't be any of them but you can create them, put them on the
// internet and use them to help you in the game.

// We will use special object called `localStorage` that persists over
// browser sessions. This object is avialable by default but its
// properties might not be set to proper values. If the set of custom
// scripts is undefined, we can set it to empty array:

// Note that we saved our array as a string. LocalStorage can save
// only string values. We will use `JSON.parse` to convert them back
// into usable form.
// TODO: write docs for editors

// There is one important security issue here - the game is played
// over secured https and scripts usually are located on non-secured
// sites. If you want to load them anyway, use appropiate setting in
// your browser. In the case of Chromium this would be:

// chromium --allow-running-insecure-content

// If you are developing local scripts (accessed using file:// instead
// of http://) you can force browser to ignore security restrictions
// by running it with appropiate settings. In the case of Chromium
// this would be:

// chromium --allow-file-access

// Enough about plugins. Let's get back to the game.



var run_script = function(data) {

  // Create new html element for the script

  var script = document.createElement('script');

  // Let's check if this script is a reference to other address.
  // If it's contents start with 'http', it is probably a url.

  if(data.substr(0,4) === 'http') {

    // Set the script to async - it will run when it'll be ready,
    // without blocking the browser.

    script.async = true;

    // Set the url to proper address

    script.src = data;

  } else {

    // In the case that our custom_script was plain code, we set
    // the script contents.

    script.textContent = data;

  }

  // Finally, let's insert our script into the page.

  // This line will actually load and run the script. If you got
  // 404, then probably url you entered in
  // `localStorage.custom_scripts` is down.

  document.body.appendChild(script);

  // After script was run, we can remove it to keep the page
  // clean.
  // This should work even for async scripts that hasn't been
  // yet downloaded.

  // document.body.removeChild(script);
};

var make_script_editor = function(name) {

  var element = document.getElementById("editor").content.cloneNode(true);
  element = element.firstChild;
  document.getElementById('overlay').appendChild(element);
  if(name) element.querySelector('.title').textContent = name;

  var editor = ace.edit(element.querySelector('.script'));
  editor.setTheme("ace/theme/monokai");
  editor.getSession().setMode("ace/mode/javascript");

  var save = element.querySelector('img.save');
  save.onclick = function() {
    var obj = JSON.parse(localStorage.custom_scripts);
    var name = element.querySelector('.title').textContent.trim();
    obj[name] = editor.getValue();
    localStorage.custom_scripts = JSON.stringify(obj);
    make_script_button(name);
  };

  var run = element.querySelector('img.run');
  run.onclick = function() {
    run_script(editor.getValue());
  };

  return editor;

};

var make_script_button = function(name) {
  var button;
  var q = document.querySelectorAll('#scripts .button');
  for(var i in q) {
    var b = q[i];
    if(b.textContent === name) {
      button = b;
      break;
    }
  }
  if(!button) {
    button = document.createElement('div');
    button.classList.add('button');
    button.textContent = name;
    var list = document.getElementById('scripts');
    list.appendChild(button);
    button.onclick = function(event) {
      if(event.button === 0) {
        var editor = make_script_editor(name);
        var obj = JSON.parse(localStorage.custom_scripts);
        editor.setValue(obj[name]);
        editor.clearSelection();
        editor.focus();
      } else if(event.button === 1) {
        if(confirm('Are you sure you want to delete script "'+button.textContent+'"?')) {
          var script_set = JSON.parse(localStorage.custom_scripts);
          delete script_set[button.textContent];
          localStorage.custom_scripts = JSON.stringify(script_set);
          document.getElementById('scripts').removeChild(button);
        }
      }
    };
  }
  return button;
};

var script_new = function() {
  make_script_editor().focus();
};

// Now we can iterate over all URLs and add them to the website:

// Run custom scripts

(function() {
  if(!localStorage.custom_scripts) {
    var default_scripts = {
      "Connection": "/connection.js",
      "GUI": "/gui.js"
    };

    localStorage.custom_scripts = '{}';

    var load_next_script = function() {
      for (var name in default_scripts) break;
      if(name) {
        var path = default_scripts[name];
        console.log('Bootstrapping "' + name + '" from ' + path);
        delete default_scripts[name];
        var client = new XMLHttpRequest();
        client.open('GET', path);
        client.onreadystatechange = function() {
          if (client.readyState==4) {
            var obj = JSON.parse(localStorage.custom_scripts);
            obj[name] = client.responseText;
            localStorage.custom_scripts = JSON.stringify(obj);
            make_script_button(name);
            run_script(obj[name]);
            load_next_script();
          }
        };
        client.send();
      } 
    };
    load_next_script();
  } else {
    var script_set = JSON.parse(localStorage.custom_scripts);
    for(var name in script_set) {
      make_script_button(name);
      run_script(script_set[name]);
    }; 
  }
})();

// Window management - closing, dragging and resizing

var find_parent = function(element, className) {
  while(!element.classList.contains(className)) {
    element = element.parentElement;
    if(element == null) {
      return undefined;
    }
  }
  return element;
};

var topmostZ = 1;

document.addEventListener('mousedown', function(e) {
  if(e.button === 1) {
    var window = find_parent(e.target, 'window');
    if(window) {
      window.remove();
    }
    e.stopPropagation();
    e.preventDefault();
  } else if(e.button === 0) {
    if (e.target.classList.contains('run') && e.target.parentNode.classList.contains('command')) {
      var command = e.target.parentNode;

      if(e.ctrlKey) {
        eval(command.textContent);
      } else {
        var ed;
        var eds = document.querySelectorAll('.script');
        for(var i = 0; i < eds.length; ++i) {
          ed = ace.edit(eds[i]);
          if(ed.isFocused()) break;
          ed = undefined;
        }
        if(!ed) {
          ed = make_script_editor("Temp");
          //ed.clearSelection();
          ed.focus();
        }
        console.log(command.textContent);
        ed.insert(command.textContent);
      }

      e.preventDefault();
      e.stopPropagation();
    } else if(e.target.classList.contains('drag')) {
      e.target.classList.add('pressed');
      e.target.parentNode.style['z-index'] = ++topmostZ;
      var drag = {
        dragged: e.target.parentNode,
        x: e.x,
        y: e.y
      };

      var drag_function = function(e) {
        var dx = e.x - drag.x;
        var dy = e.y - drag.y;
        drag.dragged.style.left = drag.dragged.offsetLeft + dx + 'px';
        drag.dragged.style.top = drag.dragged.offsetTop + dy + 'px';
        drag.x = e.x;
        drag.y = e.y;
      }

      document.addEventListener('mousemove', drag_function, true);

      document.addEventListener('mouseup', function(e) {
        document.removeEventListener('mousemove', drag_function, true);
        e.target.classList.remove('pressed');
      }, true);

      e.preventDefault();
      e.stopPropagation();
    } else if(e.target.classList.contains('resize')) {
      e.target.classList.add('pressed');
      var resize = {
        resized: e.target.parentNode,
        x: e.x,
        y: e.y
      };
      resize.left = e.target.classList.contains('left');
      resize.top = e.target.classList.contains('top');
      resize.right = e.target.classList.contains('right');
      resize.bottom = e.target.classList.contains('bottom');

      var resize_function = function(e) {
        var dx = e.x - resize.x;
        var dy = e.y - resize.y;
        if(resize.right)
          resize.resized.style.width = resize.resized.offsetWidth + dx + 'px';
        if(resize.bottom)
          resize.resized.style.height = resize.resized.offsetHeight + dy + 'px';
        if(resize.left) {
          resize.resized.style.left = resize.resized.offsetLeft + dx + 'px';
          resize.resized.style.width = resize.resized.offsetWidth - dx + 'px';
        }
        if(resize.top) {
          resize.resized.style.top = resize.resized.offsetTop + dy + 'px';
          resize.resized.style.height = resize.resized.offsetHeight - dy + 'px';
        }
        resize.x = e.x;
        resize.y = e.y;

        var ed;
        if(ed = resize.resized.querySelector('.ace_editor')) {
          ace.edit(ed).resize();
        }
      };

      document.addEventListener('mousemove', resize_function, true);

      document.addEventListener('mouseup', function() {
        document.removeEventListener('mousemove', resize_function, true);
        e.target.classList.remove('pressed');
      }, true);

      e.preventDefault();
      e.stopPropagation();
    }
  }
}, false);
