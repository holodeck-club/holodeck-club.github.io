/* global localforage, nunjucks */
(function () {
  if (!('Promise' in window)) {
    injectPackage('es6-promise');
  }

  var manifests = window.manifests = [];
  var sectionManifests = {};

  var groupTemplateHtml = document.querySelector('#group-template').innerHTML;
  var groupTemplate;

  var exploreSection = document.querySelector('#explore');

  function getGroupBySlug (slug) {
    return document.querySelector('.group[data-slug="' + slug + '"]');
  }

  function createOrGetGroup (manifest) {
    var group = getGroupBySlug(manifest.slug);
    if (!group) {
      var groupHtml = groupTemplate.render(manifest);
      exploreSection.insertAdjacentHTML('beforeend', groupHtml);
      group = getGroupBySlug(manifest.slug);
    }
    return group;
  }

  function createOrAddItem (manifest) {
    console.log('manifest', manifest);

    var group = createOrGetGroup(manifest.is_parent ? manifest : manifest.section);

    var li = document.createElement('li');
    li.textContent = manifest.name;
    li.setAttribute('data-slug', manifest.slug);
    li.setAttribute('href', manifest.url);
    group.appendChild(li);

    console.log(li);

    group.querySelector('.dirlist').appendChild(li);

    return li;
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
        console.log('value.__expires__', new Date().getTime() >= value.__expires__, '-', new Date().getTime(), '----', value.__expires__);
        if (value.__expires__ && new Date().getTime() >= value.__expires__) {
          console.log('cache expiry', url);
          return localforage.removeItem(url).then(function () {
            return getJSON(url);
          });
        }
        console.log('cache hit', url, value);
        delete value.__expires__;
        return Promise.resolve(value);
      }

      console.log('cache miss', url);

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
            reject(new Error(this.status));
          }
        });
        xhr.addEventListener('error', function () {
          reject(new Error(this.status));
        });
        xhr.send();

      }).then(function (responseData) {

        console.log('cache storing', url, '-', responseData);

        responseData.__expires__ = new Date().getTime() + 1800000;  // 30 minutes

        return localforage.setItem(url, responseData).then(function () {
          console.log('cache stored!', url);
          return responseData;
        });

      });

    });
  }

  var GH_REPO = 'holodeck-club/holodeck-club.github.io';
  var GH_REPO_URL = 'https://github.com/' + GH_REPO;
  var API_BASE_URL = 'https://api.github.com/repos/' + GH_REPO;
  var BASE_WWW_URL = 'https://holodeck.club';
  var BRANCH = 'master';
  BRANCH = 'deux';
  var DIR_BLACKLIST = ['assets', 'common', 'node_modules', 'test', 'tests'];

  Promise.all([
    injectPackage('localforage'),
    injectScript('https://cdnjs.cloudflare.com/ajax/libs/nunjucks/2.4.2/nunjucks.min.js')
  ]).then(initDirectory);

  function initDirectory () {
    console.log('initDirectory')
    groupTemplate = nunjucks.compile(groupTemplateHtml);

    getJSON(API_BASE_URL + '/git/refs/heads/' + BRANCH).then(function gotRefs (data) {
      console.log('data', data);
      return getJSON(API_BASE_URL + '/git/trees/' + data.object.sha + '?recursive=1');
    }).then(function gotTree (data) {
      var manifestsFetched = [];
      data.tree.forEach(function (file) {
        var pathChunks = file.path.split('/');
        if (!file ||
            file.path[0] === '.' ||
            file.type !== 'tree' ||
            DIR_BLACKLIST.indexOf(pathChunks[0]) !== -1 ||
            DIR_BLACKLIST.indexOf(file.path + '/') !== -1 ||
            pathChunks.length > 2) {
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

      Promise.all(manifestsFetched).then(function (manifests) {
        manifests.map(createOrAddItem);
      });
    });
  }

  function getManifest (dirName) {
    // TODO: Fetch real manifest.
    var dirChunks = dirName.split('/');

    var name = dirChunks[dirChunks.length - 1].replace(/[-_]/g, ' ');
    var slug = dirName;
    var path = '/' + dirName + '/';
    var url = BASE_WWW_URL + path;

    var sectionSlug = dirChunks[0];
    var sectionPath = '/' + sectionSlug + '/';
    var sectionUrl = BASE_WWW_URL + sectionPath;

    var manifest = {
      name: name,
      slug: slug,
      path: path,
      url: url,
      section: {},
      is_parent: slug === sectionSlug
    };

    if (manifest.is_parent) {
      manifest.section = manifest;
      sectionManifests[slug] = manifest;
    } else {
      manifest.section = sectionManifests[sectionSlug];
    }

    return Promise.resolve(manifest);
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
