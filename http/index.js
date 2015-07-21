///////////////
// Utilities //
///////////////

// Daisy-chainable HTMLElement maker
var fE = PanelUI.forgeElement;

// Best JS inheritance
var ProjectPanel = function(options) {
  PanelUI.Panel.call(this, options);
  
  this.domElement.appendChild(
    fE('a', {href: options.href}, [
      fE('img', {className: 'panel_image', src: options.image}),
    ])
  );
  
  this.domElement.appendChild(
    fE('text', {className: 'panel_text', innerHTML: options.text})
  );
  
}
ProjectPanel.prototype = Object.create(PanelUI.Panel.prototype);
ProjectPanel.prototype.constructor = ProjectPanel;

// Shim for vendor-prefixed fullscreen API
if(HTMLElement.prototype.requestFullscreen === undefined) {
  HTMLElement.prototype.requestFullscreen = HTMLElement.prototype.msRequestFullscreen || HTMLElement.prototype.mozRequestFullScreen || HTMLElement.prototype.webkitRequestFullscreen;
}
if(document.exitFullscreen === undefined) {
  document.exitFullscreen = document.msExitFullscreen || document.mozCancelFullScreen || document.webkitExitFullscreen;
}
if(document.fullscreenElement === undefined) {
  Object.defineProperty(document, 'fullscreenElement', {
    get: function() {
      return document.msFullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement;
    },
  });
}

///////////////
// Instances //
///////////////

var sidebar = new PanelUI.Sidebar();
sidebar.addButton({buttonName: 'land'    , faClass: 'fa-university', title: 'Landing page'       });
sidebar.addButton({buttonName: 'help'    , faClass: 'fa-question'  , title: 'Help'               });
sidebar.addButton({buttonName: 'fs'      , faClass: 'fa-arrows-alt', title: 'Fullscreen'         });
sidebar.addButton({buttonName: 'contrast', faClass: 'fa-adjust'    , title: 'Flip Contrast'      });
sidebar.addButton({buttonName: 'clear'   , faClass: 'fa-recycle'   , title: 'Clear local storage'});

new ProjectPanel({
  id: 'three',
  href: 'three.html',
  image: 'three_screen.jpg',
  heading: 'Template for three.js',
  text: 'Features a simple scene with a custom shader and touch + gamepad-friendly camera controls',
}).open();

var helpPanel = new PanelUI.Panel({id: 'help', heading: 'A Panel That Could Be Helpful'});
helpPanel.domElement.appendChild(fE('div', {textContent: 'But this is only a demo'}));

var darkColors = document.getElementById('dark_colors');

////////////
// Events //
////////////

sidebar.on('land', function() {
  window.location = 'index.html';
});

sidebar.on('help', function() {
  helpPanel.toggleOpen(true);
});

sidebar.on('fs', function() {
  if(document.fullscreenElement === undefined) {
    document.body.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
});

sidebar.on('contrast', function() {
  if(darkColors.parentNode === document.head) {
    document.head.removeChild(darkColors);
    localStorage.contrast = 'light';
  } else {
    document.head.appendChild(darkColors);
    localStorage.contrast = 'dark';
  }
});

sidebar.on('clear', function() {
  localStorage.clear();
});

////////////////////
// Initialization //
////////////////////

if(localStorage.contrast === 'light') {
  document.head.removeChild(darkColors);
}

///////////////
// WebSocket //
///////////////

var ws = new PersistentWS({url: window.location.protocol.replace('http', 'ws') + '//' + window.location.host});

ws.addEventListener('message', function(e) {
  console.log('Received message: ' + e.data);
  console.log(e);
});

/////////////////////
// Startup scripts //
/////////////////////

eval(localStorage.onstart); // jshint ignore:line
