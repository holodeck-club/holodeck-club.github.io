/* global AFRAME THREE*/
AFRAME.registerComponent('collider', {
  schema: {},

  init: function () {
  },

  update: function () {
    var sceneEl = this.el.sceneEl;
    var mesh = this.el.getObject3D('mesh');
    var object3D = this.el.object3D;
    var originPoint = this.el.object3D.position.clone();
    for (var vertexIndex = 0; vertexIndex < mesh.geometry.vertices.length; vertexIndex++) {
      var localVertex = mesh.geometry.vertices[vertexIndex].clone();
      var globalVertex = localVertex.applyMatrix4(object3D.matrix);
      var directionVector = globalVertex.sub(object3D.position);

      var ray = new THREE.Raycaster(originPoint, directionVector.clone().normalize());
      var collisionResults = ray.intersectObjects(sceneEl.object3D.children, true);
      collisionResults.forEach(hit);
    }
    function hit (collision) {
      if (collision.object === object3D) {
        return;
      }
      if (collision.distance < directionVector.length()) {
        if (!collision.object.el) { return; }
        collision.object.el.emit('hit');
      }
    }
  }
});

AFRAME.registerComponent('bullet', {
  schema: {
    direction: {type: 'vec3'},
    speed: {default: 10.0}
  },

  init: function () {
    this.direction = new THREE.Vector3(this.data.direction.x, this.data.direction.y, this.data.direction.z);
  },
  tick: function (time, delta) {
    var pos = this.el.getAttribute('position');
    var newPosition = new THREE.Vector3(pos.x, pos.y, pos.z).add(this.direction.clone().multiplyScalar(this.data.speed * delta / 1000));
    this.el.setAttribute('position', newPosition);

    // megahack
    this.el.object3D.lookAt(this.direction.clone().multiplyScalar(1000));

    var enemies = document.querySelectorAll('[enemy]');
    for (var i = 0; i < enemies.length; i++) {
      if (newPosition.distanceTo(enemies[i].object3D.position) < 2) {
        enemies[i].emit('hit');
      }
    }
  },

  remove: function () {

/*    if (!this.model) { return; }
    this.el.removeObject3D('mesh');*/
  }
});
