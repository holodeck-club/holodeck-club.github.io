/* global AFRAME THREE */
var vertices;
var idx = 0;
AFRAME.registerComponent('brush', {
  schema: {
  },

  init: function () {
    this.meshesArr = [];
    this.vertexCounter = 0;
    this.active = false;
    this.resolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
    this.obj = this.el.object3D;
    this.mesh = null;
    this.color = new THREE.Color(0xd03760);
    this.lineWidth = 0.01;
    this.lineWidthModifier = 0.0;
    this.textures = {};
    this.currentMap = 0;
    var self = this;
    // Line
    function loadTextures (textureArray) {
      var textureLoader = new THREE.TextureLoader();
      for (var i in textureArray) {
        var name = textureArray[i];
        console.info(name);
        self.textures[i] = textureLoader.load(textureArray[i], function (texture) {
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
        });
        console.log(self.textures);
      }
    }

    loadTextures(['stroke1.png', 'stroke3.png', 'stroke4.png', 'stroke5.png', 'stroke6.png', 'stroke7.png']);

    this.model = this.el.getObject3D('mesh');
    this.drawing = false;

    function updateColor (color, x, y) {
      function HSVtoRGB (h, s, v) {
        var r, g, b, i, f, p, q, t;
        if (arguments.length === 1) {
          s = h.s; v = h.v; h = h.h;
        }
        i = Math.floor(h * 6);
        f = h * 6 - i;
        p = v * (1 - s);
        q = v * (1 - f * s);
        t = v * (1 - (1 - f) * s);
        switch (i % 6) {
          case 0: r = v; g = t; b = p; break;
          case 1: r = q; g = v; b = p; break;
          case 2: r = p; g = v; b = t; break;
          case 3: r = p; g = q; b = v; break;
          case 4: r = t; g = p; b = v; break;
          case 5: r = v; g = p; b = q; break;
        }
        return {r: r, g: g, b: b};
      }

      // Use polar coordinates instead of cartesian
      var angle = Math.atan2(x, y);
      var radius = Math.sqrt(x * x + y * y);

      // Map the angle (-PI to PI) to the Hue (from 0 to 1)
      // and the Saturation to the radius
      angle = angle / (Math.PI * 2) + 0.5;
      var color2 = HSVtoRGB(angle, radius, 1.0);
      color.setRGB(color2.r, color2.g, color2.b);
    }

    this.el.addEventListener('stroke-changed', function (evt) {
      this.currentMap = evt.detail.strokeId;
      this.lineWidth = evt.detail.lineWidth * 0.05;
    }.bind(this));

    this.el.addEventListener('button-event', function (evt) {
      if (evt.detail.id === 0) {
        if (evt.detail.touched) {
          updateColor(this.color, evt.detail.axes[0], evt.detail.axes[1]);
          this.el.emit('color-changed', {color: this.color, x: evt.detail.axes[0], y: evt.detail.axes[1]});
        }
      }
      if (evt.detail.id === 2) {
        if (evt.detail.pressed && !this.gripPressed) {
          this.gripPressed = evt.detail.pressed;
          console.log('Grip!');
          // this.currentMap = (this.currentMap + 1) % Object.keys(this.textures).length;
          // this.playAnimation('pointing', buttonState.pressed);
        }
        if (!evt.detail.pressed && this.gripPressed) {
          this.gripPressed = false;
        }
      }
      if (evt.detail.id === 1) {
        this.lineWidthModifier = evt.detail.value;
        if (evt.detail.value > 0) {
          if (!this.active) {
            this.drawLine();
            this.active = true;
          }
        } else {
          this.active = false;
          this.mesh = null;
        }
      }
    }.bind(this));
  },

  tick: function (time, delta) {
    if (this.mesh) {
      for (var j = 0; j < vertices.length - 3; j += 3) {
        vertices[ j ] = vertices[ j + 6 ];
        vertices[ j + 1 ] = vertices[ j + 7 ];
        vertices[ j + 2 ] = vertices[ j + 8 ];

        vertices[ j + 3 ] = vertices[ j + 9 ];
        vertices[ j + 4 ] = vertices[ j + 10 ];
        vertices[ j + 5 ] = vertices[ j + 11 ];
      }

      if (this.active) {
        var matrixWorld = this.obj.matrixWorld;
        var position = new THREE.Vector3();
        var direction = new THREE.Vector3();
        position.setFromMatrixPosition(matrixWorld);
        var quaternion = new THREE.Quaternion();
        var translation = new THREE.Vector3();
        var scale = new THREE.Vector3();
        matrixWorld.decompose(translation, quaternion, scale);

        direction = new THREE.Vector3();
        direction.set(0, 0, 1);
        direction.applyQuaternion(quaternion);
        direction.normalize();
        var posBase = this.obj.position.clone().add(direction.clone().multiplyScalar(-0.1));

        direction = new THREE.Vector3();
        direction.set(1, 0, 0);
        direction.applyQuaternion(quaternion);
        direction.normalize();

        var posA = posBase.clone(); // this.obj.position.clone();
        var posB = posBase.clone(); // this.obj.position.clone();
        var lineWidth = this.lineWidth * this.lineWidthModifier;
        posA.add(direction.clone().multiplyScalar(lineWidth));
        posB.add(direction.clone().multiplyScalar(-lineWidth));

        idx = vertices.length - 6;

        vertices[ idx++ ] = posA.x;
        vertices[ idx++ ] = posA.y;
        vertices[ idx++ ] = posA.z;

        vertices[ idx++ ] = posB.x;
        vertices[ idx++ ] = posB.y;
        vertices[ idx++ ] = posB.z;
      }

      this.mesh.geometry.attributes.position.needsUpdate = true;
      this.mesh.geometry.computeVertexNormals();
      this.mesh.geometry.normalsNeedUpdate = true;
    }
  },

  remove: function () {
  },

  removeLastLine: function () {
    this.remove(this.meshesArr[this.meshesArr.length - 2]);
    this.meshesArr.splice(this.meshesArr.length - 2, 1);
  },

  drawLine: function () {
    this.vertexCounter = 0;

/*
    var g = new THREE.MeshLine();
    g.setGeometry(geo, function (p) {
      return p;
    });

/*
    var material = new THREE.MeshLineMaterial({
      useMap: true,
      map: this.textures[this.currentMap],
      color: this.color.clone(),
      //opacity: 1.0,
      resolution: this.resolution,
      sizeAttenuation: true,
      lineWidth: this.lineWidth,
      near: 0.001,
      far: 10000,
      depthTest: true,
      depthWrite: true,
      transparent: true,
      alphaTest: 0.4,
      side: 2,
    });
*/

    var material = new THREE.MeshBasicMaterial({
      color: 0x999999,
      side: THREE.DoubleSide
    });

    material = new THREE.MeshStandardMaterial({
      color: this.color.clone(),
      roughness: 0.5,
      metalness: 0.5,
      side: THREE.DoubleSide,
      shading: THREE.FlatShading
      // map: this.textures[this.currentMap]
      // transparent: true,
      // alphaTest: 0.5
    });
    // var material = new THREE.MeshPhongMaterial( { color: 0xdddddd, specular: 0x009900, shininess: 30, side: THREE.DoubleSide, shading: THREE.FlatShading } );

    var geometry = new THREE.BufferGeometry();
    // create a simple square shape. We duplicate the top left and bottom right
    // vertices because each vertex needs to appear once per triangle.
    vertices = new Float32Array(1000 * 3 * 2);
    var uvs = new Float32Array(1000 * 2 * 2);

    var quaternion = new THREE.Quaternion();
    var translation = new THREE.Vector3();
    var scale = new THREE.Vector3();
    var matrixWorld = this.obj.matrixWorld;

    matrixWorld.decompose(translation, quaternion, scale);
    var direction = new THREE.Vector3();
    direction.set(1, 0, 0);
    direction.applyQuaternion(quaternion);
    direction.normalize();

    direction = new THREE.Vector3();
    direction.set(0, 0, 1);
    direction.applyQuaternion(quaternion);
    direction.normalize();
    var posBase = this.obj.position.clone().add(direction.clone().multiplyScalar(-0.1));

    direction = new THREE.Vector3();
    direction.set(1, 0, 0);
    direction.applyQuaternion(quaternion);
    direction.normalize();

    var posA = posBase.clone();
    var posB = posBase.clone();
    var lineWidth = this.lineWidth * this.lineWidthModifier;
    posA.add(direction.clone().multiplyScalar(lineWidth));
    posB.add(direction.clone().multiplyScalar(-lineWidth));

    var i = 0;
    for (var j = 0; j < vertices.length / 2; j += 3) {
  /*    vertices[ j ] = this.obj.position.x;
      vertices[ j + 1 ] = this.obj.position.y;
      vertices[ j + 2 ] = this.obj.position.z;
*/
      vertices[ i++ ] = posA.x;
      vertices[ i++ ] = posA.y;
      vertices[ i++ ] = posA.z;

      vertices[ i++ ] = posB.x;
      vertices[ i++ ] = posB.y;
      vertices[ i++ ] = posB.z;
    }

    i = 0;
    for (j = 0; j < uvs.length / 2; j += 2) {
      var v = (j / 2) / (uvs.length / 2);
      uvs[ i++ ] = v;
      uvs[ i++ ] = 0;

      uvs[ i++ ] = v;
      uvs[ i++ ] = 1;
    }

    // itemSize = 3 because there are 3 values (components) per vertex
    geometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3).setDynamic(true));
    geometry.addAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    var mesh = new THREE.Mesh(geometry, material);
    mesh.drawMode = THREE.TriangleStripDrawMode;
    // mesh.drawMode = THREE.TriangleFanDrawMode;
    // mesh.drawMode = THREE.TrianglesDrawMode; // default
/*
document.querySelectorAll('[light]').forEach(function(item){var light = item.getObject3D('light');
console.log(item.id);
if (item.id=="hemisphere") return;
light.castShadow=true;
light.shadow.mapSize.width = 1024;
light.shadow.mapSize.height = 1024;

light.shadow.camera.near = 1;
light.shadow.camera.far = 4000;
light.shadow.camera.fov = 45;
})
*/

    mesh.frustumCulled = false;
    mesh.vertices = vertices;

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    var entity = document.createElement('a-entity');
    this.el.sceneEl.appendChild(entity);
    entity.object3D.add(mesh);

    console.log(mesh);

/*
    var geometry = new THREE.SphereGeometry( 5, 32, 32 );
    var material = new THREE.MeshBasicMaterial( {color: 0xffff00} );
    var sphere = new THREE.Mesh( geometry, material );
*/

    console.log(this.obj);
    this.mesh = mesh;
    this.meshesArr.push(mesh);
  }

});
