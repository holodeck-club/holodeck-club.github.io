/* global THREE AFRAME  */

// Take this functions out
// Parabolic motion equation, y = p0 + v0*t + 1/2at^2
function ParabolicCurveScalar (p0, v0, a, t) {
  return p0 + v0 * t + 0.5 * a * t * t;
}

// Parabolic motion equation applied to 3 dimensions
function ParabolicCurve (p0, v0, a, t) {
  var ret = new THREE.Vector3();
  ret.x = ParabolicCurveScalar(p0.x, v0.x, a.x, t);
  ret.y = ParabolicCurveScalar(p0.y, v0.y, a.y, t);
  ret.z = ParabolicCurveScalar(p0.z, v0.z, a.z, t);
  return ret;
}

AFRAME.registerComponent('teleport', {
  schema: {

  },

  init: function () {
    this.active = false;
    this.resolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
    this.obj = this.el.object3D;
    this.mesh = null;
    this.hitPoint = new THREE.Vector3();
    this.hit = false;
    this.floor = document.getElementById('ground').getObject3D('mesh');
    this.numberPointsInCurve = 25;
    this.raycaster = new THREE.Raycaster();
    this.nonHitColor = new THREE.Color(1, 0, 0);
    this.hitColor = new THREE.Color(0.6, 1, 0.6);
    // this.hitEntity = document.getElementById('hit');
    this.hitEntity = this.createHitEntity();
    this.hitEntity.setAttribute('visible', false);
    this.createLine();

    this.el.addEventListener('button-event', function (evt) {
      if (evt.detail.id === 0 && evt.detail.pressed) {
        if (!this.active) {
          // Prepare jumping
          this.active = true;
        }
      }
      if (evt.detail.id === 0 && !evt.detail.pressed) {
        if (this.active) {
          // Jump!

          // Hide the hit point and the curve
          this.active = false;
          this.hitEntity.setAttribute('visible', false);
          this.mesh.visible = false;

          if (!this.hit) {
            // Touchpad released but not hit point
            return;
          }

          // @todo Create this aux vectors outside
          var cameraEl = document.querySelector('a-scene').camera.el;
          var camPosition = new THREE.Vector3().copy(cameraEl.getAttribute('position'));
          var newCamPosition = new THREE.Vector3(this.hitPoint.x, camPosition.y, this.hitPoint.z);
          cameraEl.setAttribute('position', newCamPosition);

          // Find the hands and move them proportionally
          var hands = document.querySelectorAll('a-entity[hand-controls]');
          for (var i = 0; i < hands.length; i++) {
            var position = hands[ i ].getAttribute('position');
            var pos = new THREE.Vector3().copy(position);
            var diff = camPosition.clone().sub(pos);
            var newPosition = newCamPosition.clone().sub(diff);
            hands[ i ].setAttribute('position', newPosition);
          }
        }
      }
    }.bind(this));
  },

  tick: function (time, delta) {
    if (this.mesh && this.active) {
      this.mesh.visible = true;

      var geo = this.mesh.geo;
      var g = this.mesh.g;

      var p0 = this.obj.position.clone();
      var matrixWorld = this.obj.matrixWorld;
      var quaternion = new THREE.Quaternion();
      var translation = new THREE.Vector3();
      var scale = new THREE.Vector3();
      matrixWorld.decompose(translation, quaternion, scale);
      var direction = new THREE.Vector3(0, -0.1, -0.9);
      direction.applyQuaternion(quaternion);
      var v0 = direction.multiplyScalar(2);
      var a = new THREE.Vector3(0, -1.2, 0);
      var last = p0.clone();
      var next;

      // Set default status as non-hit
      this.material.uniforms.color.value.copy(this.nonHitColor);
      this.hitEntity.setAttribute('visible', false);
      this.hit = false;

      for (var i = 0; i < geo.length; i += 3) {
        var t = i / (geo.length / 3);
        next = ParabolicCurve(p0, v0, a, t);

        // Update the raycaster with the length of the current segment last->next
        var lastNext = next.clone().sub(last);
        var dirLastNext = lastNext.normalize();
        this.raycaster.far = dirLastNext.length();
        this.raycaster.set(last, dirLastNext);

        // Check intersection with the floor
        var intersects = this.raycaster.intersectObject(this.floor);

        if (intersects.length > 0) {
          var point = intersects[0].point;
          this.material.uniforms.color.value.copy(this.hitColor);
          this.hitEntity.setAttribute('position', point);
          this.hitEntity.setAttribute('visible', true);
        }

        if (intersects.length > 0 && !this.hit) {
          this.hit = true;
          this.hitPoint.copy(intersects[0].point);

          // If hit, just fill the rest of the points with the hit point and break the loop
          for (var j = i; j < geo.length; j += 3) {
            geo[ j ] = this.hitPoint.x;
            geo[ j + 1 ] = this.hitPoint.y;
            geo[ j + 2 ] = this.hitPoint.z;
          }
          break;
        } else {
          geo[ i ] = next.x;
          geo[ i + 1 ] = next.y;
          geo[ i + 2 ] = next.z;
        }
        last.copy(next);
      }
      g.setGeometry(geo);
    }
  },

  createLine: function () {
    var geo = new Float32Array(this.numberPointsInCurve * 3);
    var g = new THREE.MeshLine();
    g.setGeometry(geo, function (p) {
      return p;
    });

    this.material = new THREE.MeshLineMaterial({
      useMap: false,
      color: new THREE.Color(1, 1, 0),
      opacity: 1.0,
      resolution: this.resolution,
      sizeAttenuation: true,
      lineWidth: 0.01,
      near: 0.001,
      far: 10000
    });

    var mesh = new THREE.Mesh(g.geometry, this.material);
    mesh.frustumCulled = false;
    mesh.geo = geo;
    mesh.g = g;

    // @todo Add some component to the line entity
    var entity = document.createElement('a-entity');
    this.el.sceneEl.appendChild(entity);
    entity.object3D.add(mesh);

    this.mesh = mesh;
  },

  createHitEntity: function () {
    var hitEntity = document.createElement('a-entity');
    document.querySelector('a-scene').appendChild(hitEntity);

    var torus = document.createElement('a-entity');
    torus.setAttribute('geometry', {primitive: 'torus', radius: 0.25, radiusTubular: 0.01});
    torus.setAttribute('rotation', {x: 90, y: 0, z: 0});
    torus.setAttribute('material', {shader: 'flat', color: '#9f9', side: 'double'});
    hitEntity.appendChild(torus);

    var cylinder = document.createElement('a-entity');
    cylinder.setAttribute('geometry', {primitive: 'cylinder', radius: 0.25, height: 0.25, openEnded: true});
    cylinder.setAttribute('position', {x: 0, y: 0.125, z: 0});
    cylinder.setAttribute('material', {color: '#9f9', side: 'double', src: 'url(gradient.png)', transparent: true, depthTest: false});
    hitEntity.appendChild(cylinder);

    return hitEntity;
  }

});
