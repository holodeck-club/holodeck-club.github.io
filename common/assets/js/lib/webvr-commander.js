/* global CustomEvent, define, module */
(function () {
  var webvrCommander = {
    activeVRDisplay: null,
    allVRDisplays: [],
    updateVRDisplays: updateVRDisplays,
    audio: function () {},
    speech: function () {},
    storage: storage,
    utils: {},
    version: '1.0.0'
  };

  var updateVRDisplays = webvrCommander.updateVRDisplays = function () {
    if (!navigator.getVRDisplays) {
      return;
    }
    navigator.getVRDisplays().then(function (displays) {
      webvrCommander.allVRDisplays = displays;
      var activeVRDisplay;
      webvrCommander.activeVRDisplay = displays.filter(function (display) {
        return display.isPresenting;
      })[0] || null;
    });
  };

  updateVRDisplays();
  window.addEventListener('vrdisplayconnected', updateVRDisplays);
  window.addEventListener('vrdisplaydisconnected', updateVRDisplays);
  window.addEventListener('vrdisplaypresentchange', function () {
    updateVRDisplays();
    if (window.WEBVR_VOICE_NAV) {
      window.WEBVR_VOICE_NAV.toggle();
    }
  });

  /**
   * Fires a custom DOM event.
   *
   * @param {Element} el Element on which to fire the event.
   * @param {String} name Name of the event.
   * @param {Object=} [data={bubbles: true, {detail: <el>}}]
   *   Data to pass as `customEventInit` to the event.
   */
  var fireEvent = webvrCommander.utils.fireEvent = function (el, name, data) {
    data = data || {};
    data.detail = data.detail || {};
    data.detail.target = data.detail.target || el;
    var evt = new CustomEvent(name, data);
    evt.target = el;
    el.dispatchEvent(evt);
    return evt;
  };

  /**
   * Wraps sessionStorage/localStorage.
   *
   * Automatically serialises and deserialises JSON.
   * Has handler for when storage gets full.
   *
   * @param {Object=} [opts={persistent: false, {detail: <el>}}]
   *   Data to pass as options.
   */
  var storage = webvrCommander.utils.storage = function (opts) {
    opts = opts || {};
    var STORAGE_STORE = opts.persistent ? window.localStorage : window.sessionStorage;
    if ('store' in opts) {
      STORAGE_STORE = opts.store;
    }

    var STORAGE_KEY_PREFIX = opts.keyPrefix || 'webvr_commander';

    if (!STORAGE_STORE) {
      throw 'Could not use storage type provided!';
    }

    function formatKey (key) {
      return STORAGE_KEY_PREFIX + ':' + key;
    }

    return {
      clear: function () {
        try {
          STORAGE_STORE['clear']();
        } catch (e) {
          console.warn('[webvr-commander][storage] Could not clear', e);
          return;
        }
      },
      getItem: function (key) {
        var value;
        try {
          value = STORAGE_STORE['getItem'](formatKey(key));
        } catch (e) {
          console.warn('[webvr-commander][storage] Could not get', key, 'item', e);
          return;
        }
        // Handle nulls/stray values.
        try {
          return JSON.parse(value);
        } catch (e) {
          return value;
        }
      },
      removeItem: function (key) {
        try {
          STORAGE_STORE['removeItem'](formatKey(key));
        } catch (e) {
          console.warn('[webvr-commander][storage] Could not remove', key, 'item', e);
        }
      },
      setItem: function (key, value) {
        try {
          STORAGE_STORE['setItem'](formatKey(key), JSON.stringify(value));
        } catch (e) {
          // Clear localStorage if the quota was reached.
          if (e.name === 'QuotaExceededError' ||
              e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            console.log('storage full, clearing');
            STORAGE_STORE['clear']();
            fireEvent(window, 'vr-storage-full-cleared');
            window.location.reload();
          } else {
            console.warn('[webvr-commander][storage] Could not set', key, 'item', e);
          }
        }
      }
    };
  };

  if (typeof define === 'function' && define.amd) {
    define('webvr-commander', WEBVR_COMMANDER);
  } else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
    module.exports = webvrCommander;
  } else if (window) {
    window.WEBVR_COMMANDER = webvrCommander;
  }
})();
