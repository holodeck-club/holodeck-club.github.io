/* global CustomEvent, define, location, module */
(function () {
  // Service workers require HTTPS (http://goo.gl/lq4gCo). If we're running on a real web server
  // (as opposed to localhost on a custom port, which is whitelisted), then change the protocol to HTTPS.
  if ((!location.port || location.port === '80') && location.protocol !== 'https:') {
    location.protocol = 'https:';
  }

  if ('serviceWorker' in navigator) {

    // Helper function which returns a promise which resolves once the service worker registration
    // is past the "installing" state.
    function waitUntilInstalled (registration) {
      return new Promise(function (resolve, reject) {
        if (registration.installing) {
          // If the current registration represents the "installing" service worker, then wait
          // until the installation step (during which the resources are pre-fetched) completes
          // to display the file list.
          registration.installing.addEventListener('statechange', function (e) {
            if (e.target.state === 'installed') {
              resolve();
            } else if (e.target.state === 'redundant') {
              reject();
            }
          });
        } else {
          // Otherwise, if this isn't the "installing" service worker, then installation must have been
          // completed during a previous visit to this page, and the resources are already pre-fetched.
          // So we can show the list of files right away.
          resolve();
        }
      });
    }

    // navigator.serviceWorker.register('/sw.js', {scope: './'})
    //   .then(waitUntilInstalled)
    //   .then(function () {
    //     console.log('service worker installed!');
    //   }).catch(function (err) {
    //     console.log('service worker failed!', err);
    //   });
  }

  var webvrCommander = {
    activeVRDisplay: null,
    allVRDisplays: [],
    updateVRDisplays: updateVRDisplays,
    audio: function () {},
    speech: function () {},
    db: null,
    utils: {
      storage: storage
    },
    version: '1.0.0'
  };

  var updateVRDisplaysCalled = false;

  var updateVRDisplays = webvrCommander.updateVRDisplays = function () {
    if (!navigator.getVRDisplays) {
      return;
    }
    return navigator.getVRDisplays().then(function (displays) {
      if (!displays) { return; }

      webvrCommander.allVRDisplays = displays;
      var activeVRDisplay = webvrCommander.activeVRDisplay = displays.filter(function (display) {
        return display.isPresenting;
      })[0] || null;

      // Persist which display is currently presenting so that
      // the next page will know to which display to present.
      //
      // TODO: Use an` <iframe>` with a Service Worker to store
      // in `window.caches` and then `postMessage` the info back
      // (instead of relying on `sessionStorage` for this origin).
      //
      // TODO: Address in spec `navigator.activeVRDisplay` vs.
      // `navigator.activeVRDisplay`. And make sure it persists
      // between (cross-origin) page navigations, but not browser
      // sessions (à la browser history/{push,pop}State).
      if (activeVRDisplay && db) {
        db.setItem('activeVRDisplay', {
          displayId: activeVRDisplay.displayId,
          displayName: activeVRDisplay.displayName
        });
      } else {
        db.removeItem('activeVRDisplay');
      }

      if (updateVRDisplaysCalled) {
        return;
      }

      var previouslyActiveVRDisplay = db.getItem('activeVRDisplay');
      if (previouslyActiveVRDisplay) {
        var display;
        var displayStr;
        for (var i = 0; i < displays.length; ++i) {
          display = displays[i];
          displayStr = display.displayId + ':' + display.displayName;
          if (displayStr === previouslyActiveVRDisplay) {
            alert('vrdisplaypresentready');
            fireEvent(window, 'vrdisplaypresentready', {detail: {vrdisplay: display}});
            return;
          }
        }
      }

      updateVRDisplaysCalled = true;
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
    var keyPrefix = opts.keyPrefix || 'temp';
    var myStorage = opts.persistent ? window.localStorage : window.sessionStorage;
    if ('store' in opts) {
      myStorage = opts.store;
    }
    if (!myStorage) {
      throw 'Could not use storage type provided!';
    }
    function formatKey (key) {
      return keyPrefix + ':' + key;
    }
    return {
      clear: function () {
        try {
          myStorage['clear']();
        } catch (e) {
          console.warn('[webvr-commander][storage] Could not clear', e);
          return;
        }
      },
      getItem: function (key) {
        var value;
        try {
          value = myStorage['getItem'](formatKey(key));
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
          return myStorage['removeItem'](formatKey(key));
        } catch (e) {
          console.warn('[webvr-commander][storage] Could not remove', key, 'item', e);
        }
      },
      setItem: function (key, value) {
        try {
          myStorage['setItem'](formatKey(key), JSON.stringify(value));
        } catch (e) {
          // Clear storage if the quota was reached.
          if (e.name === 'QuotaExceededError' ||
              e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            console.log('[webvr-commander][storage] Storage full; clearing storage');
            myStorage['clear']();
            window.location.reload();
          } else {
            console.warn('[webvr-commander][storage] Could not set', key, 'item', e);
          }
        }
      }
    };
  };

  var db = webvrCommander.db = storage({keyPrefix: 'webvr_commander'});

  if (typeof define === 'function' && define.amd) {
    define('webvr-commander', webvrCommander);
  } else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
    module.exports = webvrCommander;
  } else if (window) {
    window.WEBVR_COMMANDER = webvrCommander;
  }
})();
