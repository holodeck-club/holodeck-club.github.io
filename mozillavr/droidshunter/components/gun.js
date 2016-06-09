/* global AFRAME THREE */
AFRAME.registerComponent('gun', {
  schema: {
    on: { default: 'click' }
  },

  init: function () {
    this.model = this.el.getObject3D('mesh');
    this.life = this.data.lifespan;
    this.canShoot = true;

    var self = this;
    this.el.addEventListener('button-event', function (evt) {
      if (evt.detail.id === 1 && evt.detail.pressed) {
        if (self.canShoot) {
          self.shoot();
          self.canShoot = false;
          setTimeout(function () { self.canShoot = true; }, 500);
        }
      }
    });
  },

  shoot: function () {
    var el = this.el;
    var matrixWorld = el.object3D.matrixWorld;
    var position = new THREE.Vector3();
    var direction = new THREE.Vector3();
    position.setFromMatrixPosition(matrixWorld);
    var entity = document.createElement('a-entity');

    var quaternion = new THREE.Quaternion();
    var translation = new THREE.Vector3();
    var scale = new THREE.Vector3();
    matrixWorld.decompose(translation, quaternion, scale);

    direction.set(0, -0.9, -1);
    direction.applyQuaternion(quaternion);
    direction.normalize();

    entity.setAttribute('bullet', {direction: direction});

    // direction.multiply(position);
    // position.z+=0.01;
    var inc = new THREE.Vector3(0.0, -0.03, -0.1);
    inc.applyQuaternion(quaternion);
    position.add(inc);
    entity.setAttribute('position', position);
/*
    console.log({
      x: THREE.Math.radToDeg(rotation.x),
      y: THREE.Math.radToDeg(rotation.y),
      z: THREE.Math.radToDeg(rotation.z)
    });
*/
    entity.setAttribute('geometry', {primitive: 'box', width: 0.03, height: 0.03, depth: 0.1});
    entity.setAttribute('material', {shader: 'standard', color: '#ff0'});
    entity.id = 'bullet';
    el.sceneEl.appendChild(entity);
  },

  tick: function (time, delta) {
  },

  update: function () {

/*
    var self = this;
    var el = this.el;
    var src = this.data;

    if (!src) { return; }

    this.remove();
    this.model = new THREE.BlendCharacter();

    this.model.load(src, function () {
      el.setObject3D('mesh', self.model);
      el.emit('model-loaded', {format: 'blend', model: self.model});
      self.model.castShadow = true;
      self.model.receiveShadow = true;
      self.model.material.shading = THREE.FlatShading;
      self.model.geometry.computeBoundingBox();
    });
    */
  },

  remove: function () {
/*    if (!this.model) { return; }
    this.el.removeObject3D('mesh');*/
  }
});
