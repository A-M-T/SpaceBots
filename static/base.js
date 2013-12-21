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

// Logging function

var log = console.log.bind(console);
var error = console.log.bind(error);
var info = console.log.bind(info);
var warn = console.log.bind(warn);

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

var run_script = function(data, title) {

  // Create new html element for the script

  var script = document.createElement('script');

  if(title) script.title = title;

  // Set the script to async - it will run when it'll be ready,
  // without blocking the browser.

  script.async = true;

  // Set the url to proper address

  script.src = data;

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

// Now we can iterate over all URLs and add them to the website:

(function() {
  var script_set = JSON.parse(localStorage.custom_scripts || '{}');
  for(var name in script_set) {
    run_script(script_set[name]);
  }; 
})();
