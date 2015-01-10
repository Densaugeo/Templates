THREE.Densaugeo = {}

// Chainable builder for THREE.Object3D stuff
// Forces matrix use, because THREE.js .position and similar properties are flaky
// Converts arrays to THREE.Vector3 or THREE.Euler for position, euler, and scale properties
// f3D(THREE.Object3D, {position: [1, 2, 3]}, [child_one, child_two])
// 'type' argument may be either a constructor or a clonable object
THREE.Densaugeo.forgeObject3D = function forgeObject3D(type, properties, children) {
  var o3D = typeof type === 'function' ? new type() : type.clone();
  
  if(properties.position instanceof Array) {
    properties.position = new THREE.Vector3().fromArray(properties.position);
  }
  
  if(properties.euler instanceof Array) {
    properties.euler = new THREE.Euler().fromArray(properties.euler);
  }
  
  if(properties.scale instanceof Array) {
    properties.scale = new THREE.Vector3().fromArray(properties.scale);
  }
  
  for(var i in properties) {
    o3D[i] = properties[i];
  }
  
  o3D.matrixAutoUpdate = false;
  
  if(properties.matrix instanceof THREE.Matrix4) {
    o3D.matrix = properties.matrix;
  }
  else {
    if(properties.euler && properties.quaternion == null) {
      properties.quaternion = new THREE.Quaternion().setFromEuler(properties.euler);
    }
    
    // Since o3D's relevant properties are already overwritten from the properties argument, they can be used on their own
    o3D.matrix.compose(properties.position || o3D.position, properties.quaternion || o3D.quaternion, properties.scale || o3D.scale);
  }
  
  o3D.matrixWorldNeedsUpdate = true;
  
  if(children) {
    for(var i = 0, endi = children.length; i < endi; ++i) {
      o3D.add(children[i]);
    }
  }
  
  return o3D;
}

// forgeObject3D specialized for making meshes. Expects geometry and material to be prepared in advence
// forgeMesh.geometries.yourModel = someGeometry;
// forgeMesh.materials.yourModel = someMaterial;
// forgeMesh('yourModel', {position: [-5, 0, 5]}, [child_one, child_two]);
THREE.Densaugeo.forgeMesh = function forgeMesh(modelName, properties, children) {
  if(THREE.Densaugeo.forgeMesh.geometries[modelName] == null) {
    throw new Error('No geometry in THREE.Densaugeo.forgeMesh.geometries for model name "' + modelName + '".');
  }
  if(THREE.Densaugeo.forgeMesh.materials [modelName] == null) {
    throw new Error('No material in THREE.Densaugeo.forgeMesh.materials for model name "'  + modelName + '".');
  }
  
  properties.geometry = THREE.Densaugeo.forgeMesh.geometries[modelName];
  properties.material = THREE.Densaugeo.forgeMesh.materials [modelName];
  
  return THREE.Densaugeo.forgeObject3D(THREE.Mesh, properties, children);
}
THREE.Densaugeo.forgeMesh.geometries = {};
THREE.Densaugeo.forgeMesh.materials  = {};

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

// Helper function to conveniently flat-shade all sub-materials in a face material. Chainable
THREE.MeshFaceMaterial.prototype.makeFlat = function() {
  for(var i = 0, endi = this.materials.length; i < endi; ++i) {
    this.materials[i].shading = THREE.FlatShading;
  }
  
  return this;
}

// THREE.Matrix4 manipulators. Most of these used to be in THREE, but were removed
// (probably to reduce file size)
THREE.Matrix4.prototype.translateX = function(x) {var a = this.elements; a[12] += a[0]*x; a[13] += a[1]*x; a[14] += a[ 2]*x; return this}
THREE.Matrix4.prototype.translateY = function(y) {var a = this.elements; a[12] += a[4]*y; a[13] += a[5]*y; a[14] += a[ 6]*y; return this}
THREE.Matrix4.prototype.translateZ = function(z) {var a = this.elements; a[12] += a[8]*z; a[13] += a[9]*z; a[14] += a[10]*z; return this}

// panKeySpeed           - Units/ms
// panMouseSpeed         - Units/px
// rotationKeySpeed      - Radians/ms
// rotationMouseSpeed    - Radians/px
// rotationAccelSpeed    - Radians/radian
// dollySpeed            - Units/click
// touchThrottleSpeed    - Units/ms per px displaced
// joystickPanSpeed      - Units/ms per fraction displaced
// joystickRotSpeed      - Radians/ms per fraction displaced
// joystickThrottleSpeed - Units/ms per fraction displaced

THREE.Densaugeo.FreeControls = function(camera, domElement, options) {
  var self = this;
  
  if(domElement == null) {
    throw new TypeError('Error in THREE.Densaugeo.FreeControls constructor: domElement must be supplied');
  }
  
  for(var i in options) {
    this[i] = options[i];
  }
  
  camera.matrixAutoUpdate = false;
  camera.rotation.order = 'ZYX';
  
  var inputs = {}; // This particular ; really is necessary
  
  document.addEventListener('keydown', function(e) {
    inputs[e.keyCode] = true;
  });
  
  document.addEventListener('keyup', function(e) {
    delete inputs[e.keyCode];
  });
  
  // FF doesn't support standard mousewheel event
  document.addEventListener('mousewheel', function(e) {
    camera.matrix.translateZ(-e.wheelDelta*self.dollySpeed/360);
  });
  document.addEventListener('DOMMouseScroll', function(e) {
    camera.matrix.translateZ(e.detail*self.dollySpeed/3);
  });
  
  // Context menu interferes with mouse control
  domElement.addEventListener('contextmenu', function(e) {
    e.preventDefault();
  });
  
  // Only load mousemove handler while mouse is depressed
  domElement.addEventListener('mousedown', function(e) {
    if(e.shiftKey) {
      var requestPointerLock = domElement.requestPointerLock || domElement.mozRequestPointerLock || domElement.webkitRequestPointerLock;
      requestPointerLock.call(domElement);
    } else if(e.which === 1) {
      domElement.addEventListener('mousemove', mousePanHandler);
    } else if(e.which === 3) {
      domElement.addEventListener('mousemove', mouseRotHandler);
    }
  });
  
  domElement.addEventListener('mouseup', function() {
    domElement.removeEventListener('mousemove', mousePanHandler);
    domElement.removeEventListener('mousemove', mouseRotHandler);
  });
  
  domElement.addEventListener('mouseleave', function() {
    domElement.removeEventListener('mousemove', mousePanHandler);
    domElement.removeEventListener('mousemove', mouseRotHandler);
  });
  
  var pointerLockHandler = function(e) {
    var pointerLockElement = document.pointerLockElement || document.mozPointerLockElement || document.webkitPointerLockElement;
    
    if(pointerLockElement === domElement) {
      document.addEventListener('mousemove', mouseRotHandler);
    } else {
      document.removeEventListener('mousemove', mouseRotHandler);
    }
  }
  
  document.addEventListener('pointerlockchange'      , pointerLockHandler);
  document.addEventListener('mozpointerlockchange'   , pointerLockHandler);
  document.addEventListener('webkitpointerlockchange', pointerLockHandler);
  
  var mousePanHandler = function(e) {
    translateX += (e.movementX || e.mozMovementX || e.webkitMovementX || 0)*self.panMouseSpeed;
    translateY -= (e.movementY || e.mozMovementY || e.webkitMovementY || 0)*self.panMouseSpeed;
  }
  
  var mouseRotHandler = function(e) {
    rotateGlobalZ -= (e.movementX || e.mozMovementX || e.webkitMovementX || 0)*self.rotationMouseSpeed;
    rotateX       -= (e.movementY || e.mozMovementY || e.webkitMovementY || 0)*self.rotationMouseSpeed;
  }
  
  // Touchmove events do not work when directly added, they have to be added by a touchstart listener
  // I think this has to do with the default touch action being scrolling
  domElement.addEventListener('touchstart', function(e) {
    e.preventDefault();
    
    if(e.touches.length === 1) {
      accelActive = true;
      
      var rect = domElement.getBoundingClientRect();
      var lateralFraction = (e.touches[0].clientX - rect.left)/rect.width;
      
      if(lateralFraction < 0.9) {
        touchZeroPrevious = e.touches[0];
        domElement.addEventListener('touchmove', TouchHandler);
      } else {
        throttleZero = e.touches[0].clientY;
        domElement.addEventListener('touchmove', touchThrottleHandler);
      }
    } else if(e.touches.length === 2) {
      touchOnePrevious = e.touches[1];
    }
  });
  
  domElement.addEventListener('touchend', function(e) {
    if(e.touches.length === 0) {
      domElement.removeEventListener('touchmove', TouchHandler);
      domElement.removeEventListener('touchmove', touchThrottleHandler);
      touchThrottle = rotationRateAlpha = rotationRateBeta = 0;
      accelActive = false;
    }
  });
  
  var TouchHandler = function(e) {
    e.preventDefault(); // Should be called at least on every touchmove event
    
    translateX += (e.touches[0].clientX - touchZeroPrevious.clientX)*self.panTouchSpeed;
    translateY -= (e.touches[0].clientY - touchZeroPrevious.clientY)*self.panTouchSpeed;
    
    touchZeroPrevious = e.touches[0];
    
    if(e.touches.length === 2) {
      rotateX       -= (e.touches[1].clientY - touchOnePrevious.clientY)*self.rotatationTouchSpeed;
      rotateGlobalZ -= (e.touches[1].clientX - touchOnePrevious.clientX)*self.rotatationTouchSpeed;
      
      touchOnePrevious = e.touches[1];
    }
  }
  
  var touchThrottleHandler = function(e) {
    e.preventDefault(); // Should be called at least on every touchmove event
    
    touchThrottle = (e.touches[0].clientY - throttleZero)*self.touchThrottleSpeed;
    
    if(e.touches.length === 2) {
      translateX += (e.touches[1].clientX - touchOnePrevious.clientX)*self.panTouchSpeed;
      translateY -= (e.touches[1].clientY - touchOnePrevious.clientY)*self.panTouchSpeed;
      
      touchOnePrevious = e.touches[1];
    }
  }
  
  var accelHandler = function(e) {
    if(accelActive) {
      // Constant = Math.PI/180/1000
      rotationRateAlpha = e.rotationRate.alpha*0.000017453292519943296*self.rotationAccelSpeed;
      rotationRateBeta  = e.rotationRate.beta *0.000017453292519943296*self.rotationAccelSpeed;
    }
  }
  
  // Attach devicemotion listener on startup because attaching it during a touchstart event is horribly buggy in FF
  window.addEventListener('devicemotion', accelHandler);
  
  var gamepads = [];
  
  window.addEventListener('gamepadconnected', function(e) {
    gamepads.push(e.gamepad);
  });
  
  window.addEventListener('gamepaddisconnected', function(e) {
    if(gamepads.indexOf(e.gamepad) > -1) {
      gamepads.splice(gamepads.indexOf(e.gamepad), 1);
    }
  });
  
  var touchZeroPrevious;
  var touchOnePrevious;
  var throttleZero, touchThrottle = 0;
  var rotationRateAlpha = 0, rotationRateBeta = 0, accelActive = false;
  
  var timePrevious = Date.now();
  var time = 0;
  
  // Working variables for camLoop
  var translateX = 0, translateY = 0, translateZ = 0, translateGlobalZ = 0, rotateX = 0, rotateGlobalZ = 0, axes;
  
  var camLoop = function() {
    time = Date.now() - timePrevious;
    timePrevious += time;
    
    if(inputs[self.keyStrafeLeft ]) translateX       -= time*self.panKeySpeed;
    if(inputs[self.keyStrafeRight]) translateX       += time*self.panKeySpeed;
    if(inputs[self.keyForward    ]) translateZ       -= time*self.panKeySpeed;
    if(inputs[self.keyBackward   ]) translateZ       += time*self.panKeySpeed;
    if(inputs[self.keyStrafeUp   ]) translateGlobalZ += time*self.panKeySpeed;
    if(inputs[self.keyStrafeDown ]) translateGlobalZ -= time*self.panKeySpeed;
    if(inputs[self.keyTurnUp     ]) rotateX          += time*self.rotationKeySpeed;
    if(inputs[self.keyTurnDown   ]) rotateX          -= time*self.rotationKeySpeed;
    if(inputs[self.keyTurnLeft   ]) rotateGlobalZ    += time*self.rotationKeySpeed;
    if(inputs[self.keyTurnRight  ]) rotateGlobalZ    -= time*self.rotationKeySpeed;
    
    for(var i = 0, endi = gamepads.length; i < endi; ++i) {
      axes = gamepads[i].axes;
      
      if(Math.abs(axes[0]) > 0.05) translateX    += axes[0]*time*self.joystickPanSpeed;
      if(Math.abs(axes[1]) > 0.05) translateY    -= axes[1]*time*self.joystickPanSpeed;
      if(Math.abs(axes[3]) > 0.05) rotateGlobalZ -= axes[3]*time*self.joystickRotSpeed;
      if(Math.abs(axes[4]) > 0.05) rotateX       -= axes[4]*time*self.joystickRotSpeed;
      
      if(axes[2] > -0.95 || axes[5] > -0.95) translateZ -= (axes[5] - axes[2])*time*self.joystickThrottleSpeed;
    }
    
    if(translateX) {
      camera.matrix.translateX(translateX);
    }
    
    if(translateY) {
      camera.matrix.translateY(translateY);
    }
    
    if(translateZ || touchThrottle) {
      camera.matrix.translateZ(translateZ + time*touchThrottle);
    }
    
    if(translateGlobalZ) {
      camera.matrix.elements[14] += translateGlobalZ;
    }
    
    if(rotateX || rotationRateBeta) {
      camera.matrix.multiply(new THREE.Matrix4().makeRotationX(rotateX - time*rotationRateBeta));
    }
    
    if(rotateGlobalZ || rotationRateAlpha) {
      // Global Z rotation retains global position
      var position = THREE.Vector3.prototype.setFromMatrixPosition(camera.matrix);
      camera.matrix.multiplyMatrices(new THREE.Matrix4().makeRotationZ(rotateGlobalZ + time*rotationRateAlpha), camera.matrix);
      camera.matrix.setPosition(position);
    }
    
    camera.matrixWorldNeedsUpdate = true;
    
    requestAnimationFrame(camLoop);
    
    translateX = translateY = translateZ = translateGlobalZ = rotateX = rotateGlobalZ = 0;
  }
  camLoop();
}
with({p: THREE.Densaugeo.FreeControls.prototype}) {
  p.panKeySpeed = 0.01;
  p.rotationKeySpeed = 0.001;
  p.panMouseSpeed = 0.1;
  p.rotationMouseSpeed = 0.002;
  p.panTouchSpeed = 0.1;
  p.rotatationTouchSpeed = 0.002;
  p.rotationAccelSpeed = 1;
  p.dollySpeed = 1;
  p.touchThrottleSpeed = 0.0005;
  p.joystickPanSpeed = 0.05;
  p.joystickRotSpeed = 0.003;
  p.joystickThrottleSpeed = 0.05;
  p.keyTurnLeft = 37; // Left arrow
  p.keyTurnRight = 39; // Right arrow
  p.keyTurnUp = 38; // Up arrow
  p.keyTurnDown = 40; // Down arrow
  p.keyStrafeLeft = 65; // A
  p.keyStrafeRight = 68; // D
  p.keyStrafeUp = 69; // E
  p.keyStrafeDown = 67; // C
  p.keyForward = 87; // W
  p.keyBackward = 83; // S
}
