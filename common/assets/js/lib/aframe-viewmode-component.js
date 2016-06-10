/* global AFRAME */
(function () {
  if ('AFRAME' in window && typeof AFRAME === 'undefined') {
    throw new Error('Component attempted to register before AFRAME was available.');
  }

  var utils = AFRAME.utils;
  var $_GET = utils.getUrlParameter;
  var COMPONENT_ENABLED = $_GET('viewmode') !== 'false';
  var DEFAULT_PROJECTION = 'stereo';
  var log = utils.debug('components:viewmode:debug');
  var warn = utils.debug('components:viewmode:warn');

  var parseMetaContent = function (tag) {
    var obj = {};
    var content = typeof tag === 'string' ? tag : tag.content;
    if (!content) { return; }
    var pairs = content.split(',');
    if (pairs.length === 1) { pairs = content.split(';'); }  // Check for `;` just in case.
    pairs.forEach(function (item) {
      var chunks = item.replace(/[\s;,]+/g, '').split('=');
      if (chunks.length !== 2) { return; }
      obj[chunks[0]] = chunks[1];
    });
    return obj;
  };

  var getProjection = function () {
    var projection = '';
    var metaViewmodeTags = document.head.querySelectorAll('meta[name="viewmode"]');
    Array.prototype.forEach.call(metaViewmodeTags, function (tag) {
      var val = parseMetaContent(tag);
      if (val && val.projection) {
        projection = val.projection;
      }
    });
    return projection;
  };

  window.addEventListener('load', function () {
    var projection = $_GET('viewmode') || getProjection();
    var attrs = projection ? {projection: projection} : '';
    var sceneTags = document.querySelectorAll('a-scene');
    Array.prototype.forEach.call(sceneTags, function (scene) {
      scene.setAttribute('viewmode', attrs);
    });
  });

  /**
   * Viewmode component for A-Frame.
   */
  AFRAME.registerComponent('viewmode', {
    dependencies: ['vr-mode-ui'],

    schema: {
      enabled: {default: COMPONENT_ENABLED},
      projection: {default: DEFAULT_PROJECTION}
    },

    init: function () {
      log('init');
    },

    handleViewmodeChange: function () {
      log('autoload');
      var scene = this.el;
      var projection = this.data.projection;
      log('using viewmode projection "' + projection + '"');

      var enterVR = function () {
        return scene.enterVR().then(function () {
          log('viewmode entering VR');
          return projection;
        }).catch(function (err) {
          warn(err.message);
          console.error(err.message);
          return err;
        });
      };

      var exitVR = function () {
        return scene.exitVR().then(function () {
          log('viewmode exiting VR');
          return projection;
        }).catch(function (err) {
          warn(err.message);
          console.error(err.message);
        });
      };

      if (projection === 'stereo') {
        log(scene.vreffect);
        log(scene.renderStarted);
        // scene.addEventListener('renderstart', function () {
        //   log('viewmode renderstart');
        //   scene.enterVR();
        // });
        if (navigator.getVRDisplays) {
          return navigator.getVRDisplays().then(enterVR);
        } else if (navigator.getVRDevices) {
          return navigator.getVRDevices().then(enterVR);
        } else {
          return enterVR();
        }
      }

      if (projection === 'mono') {
        if (navigator.getVRDisplays) {
          return navigator.getVRDisplays().then(exitVR);
        } else if (navigator.getVRDevices) {
          return navigator.getVRDevices().then(exitVR);
        } else {
          return exitVR();
        }
      }
    },

    update: function () {
      log('update 1');
      if (!this.data.enabled) { return; }
      log('update 2');
      this.handleViewmodeChange();
    },

    remove: function () {
      log('viewmode remove');
      this.data.projection = DEFAULT_PROJECTION;
      this.handleViewmodeChange();
    }
  });
})();
