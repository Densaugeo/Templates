THREE.Densaugeo = {}

// meshMaker = new MeshMaker();
// meshMaker.mesh = new THREE.Mesh(someGeometry, someMaterial);
// meshMaker.addTo = THREE.Scene or THREE.Object3D;
// meshMaker.make({position: THREE.Vector3, euler: THREE.Euler, scale: THREE.Vector3});
//
// Mesh is the mesh to be placed, addTo is an object to add it to. Properties may be passed to the new mesh, either as named arguments
// or by setting them as properties of meshMaker.meshProperties. Properties given as named arguments take precedence over those on
// meshMaker.meshProperties. Properties passed from meshMaker.meshProperties will have their .clone() functiosn called if available;
// properties passed as named arguments are always passed directly
//
// Setting forceMatrix switches off THREE.js matrix auto-updates and causes MeshMaker
// to build matrices from position, rotation, and scale
//
// Before use, meshMaker.mesh must be defined. addTo is optional. Then, meshes may be
// instantiated in one of two ways (or a combination of these):
//
// Using arguments:
// meshMaker.make({position: new THREE.Vector3(0, 0, 0), euler: new THREE.Euler(0, 0, 0), foo: 'bar'});
//
// Using defaults:
// meshMaker.meshProperties.position = new THREE.Vector3(0, 0, 0);
// meshMaker.meshProperties.euler = new THREE.Euler(0, 0, 0);
// meshMaker.meshProperties.foo = 'bar';
// meshMaker.make();
THREE.Densaugeo.MeshMaker = function() {
  this.meshProperties = {};
  
  this.mesh = undefined;
  
  this.addTo = undefined;
  
  this.forceMatrix = false;
}

THREE.Densaugeo.MeshMaker.prototype.make = function(args) {
  // To make a mesh, you must have a mesh. This mesh is assumed to be a THREE.Mesh
  var mesh = this.mesh.clone();
  if(!(mesh instanceof THREE.Mesh)) throw new Error('THREE.Densaugeo.MeshMaker.mesh must be a THREE.Mesh');
  
  // I don't make any assumptions about what addTo points at.  This will try to run anything with an 'add' function you want to give it
  if(this.addTo && typeof this.addTo.add === 'function') this.addTo.add(mesh);
  
  // Given arguments take precedence, followed by the MeshMaker's meshProperties, and then whatever the mesh already has
  // These should behave as expected on their own, with the exception of MeshMaker's meshProperties, which need to be cloned for separation
  for(var i in this.meshProperties) {
    if(args[i] === undefined) {
      if(typeof this.meshProperties[i].clone === 'function') {
        mesh[i] = this.meshProperties[i].clone();
      }
      else {
        mesh[i] = this.meshProperties[i];
      }
    }
  }
  for(var i in args) {
    mesh[i] = args[i];
  }
  
  if(this.forceMatrix) {
    mesh.matrixAutoUpdate = false;
    
    var matrix = args.matrix || this.meshProperties.matrix;
    
    if(matrix instanceof THREE.Matrix4) {
      mesh.matrix = matrix;
    }
    // If matrix is not specified, then recompose the matrix from components
    else {
      var position = args.position     || this.meshProperties.position;
      var quaternion = args.quaternion || this.meshProperties.quaternion;
      var euler = args.euler           || this.meshProperties.euler;
      var scale = args.scale           || this.meshProperties.scale;
      
      // If quaternion is not specified but Euler angle is, build quaternion from Euler angle
      if(quaternion == null) {
        if(euler != null) {
          quaternion = (new THREE.Quaternion).setFromEuler(euler);
        }
      }
      
      mesh.matrix.compose(position || mesh.position, quaternion || mesh.quaternion, scale || mesh.scale);
    }
    
    mesh.matrixWorldNeedsUpdate = true;
  }
  
  return mesh;
}



// A JSONLoader with a LoadAll method. LoadAll loads from an array of urls, then call the callback
// with objects full of geometries and materials stored under their corresponding urls
//
// new THREE.Densaugeo.JSONMultiLoader.loadall(['url1', 'url2'], function(geometries, materialses) {
//   geometries.url1;        // Returns geometry for url1
//   geometries['url2']      // Returns geometry for url2
// }, '/myTextrurePath/');
THREE.Densaugeo.JSONMultiLoader = function(showStatus) {
  THREE.JSONLoader.call(this, showStatus);
}

THREE.Densaugeo.JSONMultiLoader.prototype = Object.create(THREE.JSONLoader.prototype);

THREE.Densaugeo.JSONMultiLoader.prototype.loadAll = function(urls, callback, texturePath) {
  var count = urls.length;
  var geometries = {};
  var materialses = {};
  
  for(var i = 0; i < urls.length; ++i) with({i: i}) {
    try {
      this.load(urls[i], function(geometry, materials) {
        geometries[urls[i]] = geometry;
        materialses[urls[i]] = materials;
        
        --count;
        if(count === 0) callback(geometries, materialses);
      }, texturePath);
    }
    catch(error) {
      console.warn(error);
      --count;
    }
  }
  
  if(count === 0) callback(geometries, materialses);
}




// THREE.Matrix4 manipulators. Most of these used to be in THREE, but were removed
// (probably to reduce file size)
THREE.Matrix4.prototype.translateX = function(x) {var a = this.elements; a[12] += a[0]*x; a[13] += a[1]*x; a[14] += a[ 2]*x; return this}
THREE.Matrix4.prototype.translateY = function(y) {var a = this.elements; a[12] += a[4]*y; a[13] += a[5]*y; a[14] += a[ 6]*y; return this}
THREE.Matrix4.prototype.translateZ = function(z) {var a = this.elements; a[12] += a[8]*z; a[13] += a[9]*z; a[14] += a[10]*z; return this}

// panKey        - Keyboard panning speed in units/ms
// panMouse      - Mouse panning speed in units/px
// rotationKey   - Keyboard rotation speed in radians/ms
// rotationMouse - Mouse rotation speed in radians/px
// dolly         - Dolly speed in units/click

THREE.Densaugeo.FreeControls = function(camera, domElement, options) {
  var self = this;
  if(domElement == null) {
    throw new TypeError('Error in THREE.Densaugeo.Freecontrols constructor: domElement must be supplied');
  }
  
  this.panKeySpeed        = options && options.panKeySpeed        || 0.01 ;
  this.panMouseSpeed      = options && options.panMouseSpeed      || 0.1  ;
  this.rotationKeySpeed   = options && options.rotationKeySpeed   || 0.001;
  this.rotationMouseSpeed = options && options.rotationMouseSpeed || 0.002;
  this.dollySpeed         = options && options.dollySpeed         || 1    ;
  
  camera.matrixAutoUpdate = false;
  camera.rotation.order = 'ZYX';
  
  var inputs = {}; // This particular ; really is necessary
  var xPrevious = 0;
  var yPrevious = 0;
  
  document.addEventListener('keydown', function(event) {
    inputs[event.keyCode] = true;
  });
  
  document.addEventListener('keyup', function(event) {
    delete inputs[event.keyCode];
  });
  
  // FF doesn't support standard mousewheel event
  document.addEventListener('mousewheel', function(event) {
    camera.matrix.translateZ(-event.wheelDelta*self.dollySpeed/360);
  });
  document.addEventListener('DOMMouseScroll', function(event) {
    camera.matrix.translateZ(event.detail*self.dollySpeed/3);
  });
  
  // Context menu interferes with mouse control
  domElement.addEventListener('contextmenu', function(event) {
    event.preventDefault();
  });
  
  // Only load mousemove handler while mouse is depressed
  domElement.addEventListener('mousedown', function(event) {
    if(event.which === 3) {
      domElement.addEventListener('mousemove', panHandler);
    }
    else {
      var requestPointerLock = domElement.requestPointerLock || domElement.mozRequestPointerLock || domElement.webkitRequestPointerLock;
      requestPointerLock.call(domElement);
    }
  });
  
  domElement.addEventListener('mouseup', function() {
    domElement.removeEventListener('mousemove', panHandler);
  });
  
  var pointerLockHandler = function(event) {
    var pointerLockElement = document.pointerLockElement || document.mozPointerLockElement || document.webkitPointerLockElement;
    
    if(pointerLockElement === domElement) {
      document.addEventListener('mousemove', rotHandler);
    }
    else {
      document.removeEventListener('mousemove', rotHandler);
    }
  }
  
  document.addEventListener('pointerlockchange'      , pointerLockHandler);
  document.addEventListener('mozpointerlockchange'   , pointerLockHandler);
  document.addEventListener('webkitpointerlockchange', pointerLockHandler);
  
  var panHandler = function(event) {
    var x = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
    var y = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
    
    camera.matrix.translateX(-x*self.panMouseSpeed);
    camera.matrix.translateY( y*self.panMouseSpeed);
  }
  
  var rotHandler = function(event) {
    document.title = event.movementX;
    var x = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
    var y = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
    
    camera.matrix.multiply(new THREE.Matrix4().makeRotationX(-y*self.rotationMouseSpeed));
    
    var position = THREE.Vector3.prototype.setFromMatrixPosition(camera.matrix);
    camera.matrix.multiplyMatrices(new THREE.Matrix4().makeRotationZ(-x*self.rotationMouseSpeed), camera.matrix);
    camera.matrix.setPosition(position);
  }
  
  var touchX = 0;
  var touchY = 0;
  
  // Touchmove events do not work when directly added, they have to be added by a touchstart listener
  // I think this has to do with the default touch action being scrolling
  domElement.addEventListener('touchstart', function(event) {
    touchX = event.touches[0].clientX;
    touchY = event.touches[0].clientY;
    
    domElement.addEventListener('touchmove', touchHandler);
  });
  
  domElement.addEventListener('touchend', function() {
    domElement.removeEventListener('touchmove', touchHandler);
  });
  
  var touchHandler = function(event) {
    event.preventDefault();
    
    var movement = {movementX: event.touches[0].clientX - touchX, movementY: event.touches[0].clientY - touchY};
    
    if(event.touches.length === 1) {
      rotHandler(movement);
    }
    else {
      panHandler(movement);
    }
    
    touchX = event.touches[0].clientX;
    touchY = event.touches[0].clientY;
  }
  
  var keydownHandlers = {
    65: function(time) {camera.matrix.translateX(-time*self.panKeySpeed)}, // A - Strafe camera left
    68: function(time) {camera.matrix.translateX( time*self.panKeySpeed)}, // D - Strafe camera right
    87: function(time) {camera.matrix.translateZ(-time*self.panKeySpeed)}, // W - Move camera forward
    83: function(time) {camera.matrix.translateZ( time*self.panKeySpeed)}, // S - Move camera backward
    69: function(time) {camera.matrix.elements[14] += time*self.panKeySpeed}, // E - Strafe camera up (in global coords)
    67: function(time) {camera.matrix.elements[14] -= time*self.panKeySpeed}, // C - Strafe camera down (in global coords)
    
    38: function(time) {camera.matrix.multiply(new THREE.Matrix4().makeRotationX( self.rotationKeySpeed*time))}, // Up arrow - Turn camera up
    40: function(time) {camera.matrix.multiply(new THREE.Matrix4().makeRotationX(-self.rotationKeySpeed*time))}, // Down arrow - Turn camera down
    37: function(time) {
      var position = THREE.Vector3.prototype.setFromMatrixPosition(camera.matrix);
      camera.matrix.multiplyMatrices(new THREE.Matrix4().makeRotationZ( self.rotationKeySpeed*time), camera.matrix);
      camera.matrix.setPosition(position);
    }, // Left arrow - Turn camera left
    39: function(time) {
      var position = THREE.Vector3.prototype.setFromMatrixPosition(camera.matrix);
      camera.matrix.multiplyMatrices(new THREE.Matrix4().makeRotationZ(-self.rotationKeySpeed*time), camera.matrix);
      camera.matrix.setPosition(position);
    } // Right arrow - Turn camera right
  }
  
  var timePrevious = Date.now();
  var time = 0;
  
  var camLoop = function() {
    time = Date.now() - timePrevious;
    timePrevious += time;
    
    for(var i in inputs) {
      keydownHandlers[i] && keydownHandlers[i](time);
    }
    
    camera.matrixWorldNeedsUpdate = true;
    
    requestAnimationFrame(camLoop);
  }
  camLoop();
}
