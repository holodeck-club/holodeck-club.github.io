/* global THREE AFRAME  */
AFRAME.registerComponent('ground-loader', {
  update: function () {
    var objectLoader;
    var object3D = this.el.object3D;
    if (this.objectLoader) { return; }
    objectLoader = this.objectLoader = new THREE.ObjectLoader();
    objectLoader.load('http://localhost:9000/examples/showcase/teleport/models/ground.json', function (obj) {
      obj.children.forEach(function (value) {
        if (value instanceof THREE.Mesh) {
          value.geometry.computeFaceNormals();
          value.geometry.computeVertexNormals();
          value.receiveShadow = true;
          value.material.shading = THREE.FlatShading;
        }
      });
      object3D.add(obj);
    });
  }
});
