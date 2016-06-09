/* global THREE AFRAME */
'use strict';

function TextAnimatedCanvas (text, fontSize, w, h, color, bg, bold, textAlign) {
  THREE.Object3D.call(this);
  this.myFontSize = fontSize;
  this.w = w;
  this.h = h;
  this.myColor = color;
  this.bg = bg;
  this.bold = bold;
  this.myTextAlign = textAlign;

  this.totalLines = 1;

  this.canvas = document.createElement('canvas');
  this.canvas.style.fontFamily = 'Helvetica';

  this.canvas.width = this.w;
  this.canvas.height = this.h;

  var texture = this.drawText(text);
  var materialTextCanvas = new THREE.MeshLambertMaterial({
    side: THREE.DoubleSide,
    emissive: 0xffffff,
    emissiveIntensity: 100,
    depthWrite: false,
    depthTest: true,
    transparent: true,
    opacity: 0.4,
    map: texture
  });
  this.mesh = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(w / 100, h / 100),
    materialTextCanvas
  );

  this.add(this.mesh);
}

TextAnimatedCanvas.prototype = Object.create(THREE.Object3D.prototype);

TextAnimatedCanvas.prototype.updateText = function (text) {
  this.mesh.material.map = this.drawText(text);
};

TextAnimatedCanvas.prototype.drawText = function (text) {
  this.text = text;
  this.characters = text.length;
  var context = this.canvas.getContext('2d');
  context.clearRect(0, 0, this.canvas.width, this.canvas.height);

  if (this.bg) {
    context.fillStyle = 'rgba(0,0,0,0.2)';
    context.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  if (this.bold) {
    context.font = 'bold ' + this.myFontSize + 'px Helvetica';
  } else {
    context.font = 'normal ' + this.myFontSize + 'px Helvetica';
  }

  context.fillStyle = this.myColor;

  if (this.myTextAlign === 'right') {
    context.textAlign = 'right';
  } else if (this.myTextAlign === 'left') {
    context.textAlign = 'left';
  } else {
    context.textAlign = 'center';
  }

  context.textBaseline = 'top';

  if (this.myTextAlign === 'right') {
    this.wrapTextCanvas(context, text, this.canvas.width, 0, this.canvas.width, this.myFontSize * 1.1);
  } else if (this.myTextAlign === 'left') {
    this.wrapTextCanvas(context, text, 0, 0, this.canvas.width, this.myFontSize * 1.1);
  } else {
    this.wrapTextCanvas(context, text, this.canvas.width / 2, 0, this.canvas.width, this.myFontSize * 1.1);
  }

  // use canvas contents as a texture
  var texture = new THREE.Texture(this.canvas);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  return texture;
};

TextAnimatedCanvas.prototype.wrapTextCanvas = function (context, text, x, y, maxWidth, lineHeight) {
  var paragraphs = text.split('<br>');
  var words = [];
  for (var n = 0; n < paragraphs.length; n++) {
    var wordsParag = paragraphs[n].split(' ');
    for (var m = 0; m < wordsParag.length; m++) {
      words.push(wordsParag[m]);
    }
    words.push('//');
  }
  // console.log(words);
  var line = '';

  for (n = 0; n < words.length; n++) {
    var testLine = line + words[n] + ' ';
    var metrics = context.measureText(testLine);
    var testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0 || words[ n ] === '//') {
      context.fillText(line, x, y);
      if (words[ n ] === '//') {
        line = '';
      } else {
        line = words[ n ] + ' ';
        this.totalLines++;
      }
      y += lineHeight;
    } else {
      line = testLine;
    }
  }

  context.fillText(line, x, y);
};

AFRAME.registerComponent('counter', {
  schema: {
    direction: {type: 'vec3'},
    speed: {default: 10}
  },

  init: function () {
    this.level = 0;
    this.points = 0;
    this.lifes = 5;

    this.score = new TextAnimatedCanvas('', 32, 512, 512, '#ffffff', false, false, 'center');
    this.updateScore();
    this.score.position.y = -1;
    this.el.setObject3D('mesh', this.score);

    this.el.sceneEl.addEventListener('player-hit', this.playerHit.bind(this));
    this.el.sceneEl.addEventListener('enemy-hit', this.enemyHit.bind(this));
  },

  playerHit: function () {
    this.lifes--;
    if (this.lifes === 0) {
      this.el.emit('game-over');
      this.lifes = 0;
    }
    this.updateScore();
  },

  enemyHit: function () {
    this.points++;
    this.updateScore();
  },

  updateScore: function () {
    var scoreText = 'score: ' + this.points + ' \n lifes: ' + this.lifes;
    this.score.updateText(scoreText);
  },

  tick: function (time, delta) {
    // console.log(this.points, this.lifes);
  },

  remove: function () {

/*    if (!this.model) { return; }
    this.el.removeObject3D('mesh');*/
  }
});
