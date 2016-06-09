/* global localforage, nunjucks */
(function () {
  if (!('Promise' in window)) {
    injectPackage('es6-promise');
  }
  if (!('assign' in Object)) {
    injectPackage('object-assign');
  }

  var groupsBySlug = {};
  var linksByGroupSlug = window.linksByGroupSlug = {};

  var groupTemplateHtml = document.querySelector('#group-template').innerHTML;
  var groupTemplate;

  var exploreSection = document.querySelector('#explore');

  function getGroupEl (slug) {
    return document.querySelector('.group[data-slug="' + slug + '"]');
  }

  function createOrGetGroup (manifest) {
    if (!manifest.is_parent) {
      manifest = manifest.section;
    }
    var group = getGroupEl(manifest.slug);
    if (!group) {
      var context = Object.assign({}, manifest);
      context.links = linksByGroupSlug[manifest.slug];
      var groupHtml = groupTemplate.render(context);
      exploreSection.insertAdjacentHTML('afterbegin', groupHtml);
      group = getGroupEl(manifest.slug);
      if (window.enhanceGroupImages) {
        window.enhanceGroupImages.bind(group)();
      }
    }
    return group;
  }

  function injectScripts (srcs) {
    return (srcs || []).map(injectScript);
  }

  function injectScript (src) {
    if (Array.isArray(src)) {
      return injectScripts(src);
    }
    return new Promise(function (resolve, reject) {
      var script = typeof src === 'string' ? createScript(src) : src;
      script.addEventListener('load', resolve);
      script.addEventListener('error', reject);
      document.head.appendChild(script);
    });
  }

  function injectPackage (pkgName) {
    return injectScript('https://wzrd.in/standalone/' + pkgName);
  }

  function injectPackages (pkgNames) {
    return pkgNames.map(injectPackage);
  }

  function createScript (src) {
    var s = document.createElement('script');
    s.async = false;
    s.src = src;
    return s;
  }

  function shouldCaptureKeyEvent (event) {
    if (event.shiftKey || event.metaKey || event.altKey || event.ctrlKey) {
      return false;
    }
    return document.activeElement === document.body;
  }

  var keyTimes = {};

  window.addEventListener('keydown', function (e) {
    if (e.keyCode in keyTimes) {
      checkAndFlushCache(e);
      return;
    }
    keyTimes[e.keyCode] = new Date().getTime();
  });

  window.addEventListener('keyup', function (e) {
    if (e.keyCode in keyTimes) {
      checkAndFlushCache(e);
    }
  });

  function checkAndFlushCache (event) {
    checkKeyTime(event, 'C'.charCodeAt(0), function () {
      console.log('clearing local JSON cache');
      localforage.clear();
      setTimeout(function () {
        window.location.reload();
      }, 500);
    });
  }

  function checkKeyTime (event, keyCode, cb) {
    if (keyCode !== event.keyCode) {
      return;
    }
    var thisKeyHeldTime = new Date().getTime() - keyTimes[event.keyCode];
    if (thisKeyHeldTime >= 2000) {
      delete keyTimes[event.keyCode];
      cb();
    }
  }

  function getJSON (url, skipRetry) {
    return localforage.getItem(url).then(function (value) {

      if (value !== null) {
        if (value.__expires__ && new Date().getTime() >= value.__expires__) {
          console.log('cache expired', url);
          return localforage.removeItem(url).then(function () {
            console.log('cache item removed', url);
            return getJSON(url);
          });
        }
        console.log('cache hit', url, value);
        delete value.__expires__;
        return Promise.resolve(value);
      }

      console.log('cache miss', url);

      var cacheResponse = function (responseData) {
        console.log('cache storing', url, responseData);
        responseData.__expires__ = new Date().getTime() + 1800000;  // 30 minutes
        return localforage.setItem(url, responseData).then(function () {
          console.log('cache stored', url);
          return responseData;
        });
      };

      return new Promise(function (resolve, reject) {
        console.log('xhr get', url);
        var xhr = new XMLHttpRequest();
        xhr.open('get', url);
        xhr.addEventListener('load', function () {
          if (this.status >= 200 && this.status < 300) {
            try {
              resolve(JSON.parse(this.responseText));
            } catch (e) {
              resolve({});
            }
          } else {
            reject({error: true, status: this.status});
          }
        });
        xhr.addEventListener('error', function () {
          reject({error: true, status: this.status});
        });
        xhr.send();
      }).then(cacheResponse, cacheResponse);
    });
  }

  var GH_REPO = 'holodeck-club/holodeck-club.github.io';
  var GH_REPO_URL = 'https://github.com/' + GH_REPO;
  var API_BASE_URL = 'https://api.github.com/repos/' + GH_REPO;
  var BASE_WWW_URL = 'https://holodeck.club/';
  var BASE_WWW_URL_SLASHLESS = BASE_WWW_URL.replace(/\/$/, '');
  var BRANCH = 'master';
  BRANCH = 'deux';
  var DIR_BLACKLIST = ['assets', 'common', 'node_modules', 'test', 'tests'];

  function isValidFile (file) {
    var pathChunks = file.path.split('/');
    if (!file ||
        file.path[0] === '.' ||
        file.type !== 'tree' ||
        DIR_BLACKLIST.indexOf(pathChunks[0]) !== -1 ||
        DIR_BLACKLIST.indexOf(file.path + '/') !== -1 ||
        pathChunks.length > 2) {
      return false;
    }
    return true;
  }

  Promise.all([
    injectPackage('localforage'),
    injectScript('https://cdnjs.cloudflare.com/ajax/libs/nunjucks/2.4.2/nunjucks.min.js')
  ]).then(initDirectory);

  function initDirectory () {
    groupTemplate = nunjucks.compile(groupTemplateHtml);

    getJSON(API_BASE_URL + '/git/refs/heads/' + BRANCH).then(function gotRefs (data) {
      return getJSON(API_BASE_URL + '/git/trees/' + data.object.sha + '?recursive=1');
    }).then(function gotTree (data) {
      var manifestsFetched = [];

      data.tree.forEach(function (file) {
        if (!isValidFile(file)) {
          return;
        }
        manifestsFetched.push(getManifest(file.path).then(function (manifest) {
          manifest.git = {
            repo: GH_REPO,
            repo_url: GH_REPO_URL,
            path: file.path,
            sha: file.sha.substr(0, 8)
          };
          return manifest;
        }));
      });

      return Promise.all(manifestsFetched).then(function () {
        Object.keys(groupsBySlug).forEach(function (slug) {
          createOrGetGroup(groupsBySlug[slug]);
        });
      });
    });
  }

  function getManifest (dirName) {
    var dirChunks = dirName.split('/');

    var name = dirChunks[dirChunks.length - 1].replace(/[-_]/g, ' ');
    var slug = dirName;
    var path = '/' + dirName + '/';
    var url = BASE_WWW_URL_SLASHLESS + path;

    var sectionSlug = dirChunks[0];
    var sectionPath = '/' + sectionSlug + '/';
    var sectionUrl = BASE_WWW_URL_SLASHLESS + sectionPath;

    var isParent = slug === sectionSlug;

    var manifestSkeleton = {
      name: name,
      slug: slug,
      path: path,
      url: url,
      section: {},
      is_parent: isParent
    };

    var processManifest = function (manifest) {
      if (manifest.error) {
        console.warn('manifest error', manifest.message || manifest.status);
        manifest = manifestSkeleton;
      } else {
        manifest = Object.assign({}, manifestSkeleton, manifest);
      }

      if (isParent) {
        manifest.section = manifest;
        manifest.isParent = true;
        groupsBySlug[slug] = manifest;
      } else {
        manifest.section = groupsBySlug[sectionSlug];
        manifest.isParent = false;
        if (sectionSlug in linksByGroupSlug) {
          linksByGroupSlug[sectionSlug].push(manifest);
        } else {
          linksByGroupSlug[sectionSlug] = [manifest];
        }
      }

      return manifest;
    };

    // TODO: Fetch from filename specified by `<link rel="manifest">` in `index.html`.
    return getJSON(path + 'manifest.json')
      .then(processManifest)
      .catch(function (err) {
        console.warn(err);
        return processManifest(manifestSkeleton);
      });
  }

  function looksLikeAUrl (url) {
    url = (url || '').trim();
    if (!url) { return false; }
    return url.indexOf('http:') === 0 || url.indexOf('https:') === 0;
  }

  function coerceToSourceUrl (url) {
    if (!url) { return; }
    if (url.split('/').length - 1 === 1) {
      return 'https://github.com/' + url;
    }
    return url;
  }

  function sanitiseItem (item) {
    var sourceUrl = coerceToSourceUrl(item.source_url);

    if (typeof item.author === 'string') {
      if (looksLikeAUrl(item.author)) {
        item.author = {url: item.author};
      } else {
        item.author = {name: item.author};
      }
    } else {
      if (!item.author.url) {
        if (looksLikeAUrl(item.author.name)) {
          item.author.url = item.author.name;
        } else if (sourceUrl) {
          item.author.url = sourceUrl;
        }
      }
    }

    if (item.start_url && !item.url) {
      item.url = item.url;
    }

    return item;
  }
})();
