(function () {
  if (!('Promise' in window)) {
    injectScript('https://wzrd.in/standalone/es6-promise');
  }

  var manifests = window.manifests = [];

  function addManifest (manifest) {
    var ul = document.querySelector('.dirlist[data-base-path="' + manifest.path + '"]');
    console.log('ul', manifest.path, ul);
    if (!ul) {
      return;
    }
    var li = document.createElement('li');
    li.setAttribute('href', manifest.url);
    ul.appendChild(li);
    manifests.push(manifest);
    return manifest;
  }

  function injectScript (srcs) {
    if (!Array.isArray(srcs)) {
      srcs = [srcs];
    }
    var script;
    (srcs || []).forEach(function (src) {
      script = typeof src === 'string' ? createScript(src) : src;
      document.head.appendChild(script);
    });
  }

  function createScript (src) {
    var s = document.createElement('script');
    s.async = false;
    s.src = src;
    return s;
  }

  function getJSON (url, cb) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('get', url);
      xhr.addEventListener('load', function () {
        try {
          resolve(JSON.parse(this.responseText));
        } catch (e) {
          resolve({});
        }
      });
      xhr.addEventListener('error', reject);
      xhr.send();
    });
  }

  var API_BASE_URL = 'https://api.github.com/repos/holodeck-club/holodeck-club.github.io';
  var BASE_WWW_URL = 'https://holodeck.club';
  var BRANCH = 'master';
  BRANCH = 'deux';
  var DIR_BLACKLIST = ['assets', 'node_modules', 'test', 'tests'];

  getJSON(API_BASE_URL + '/git/refs/heads/' + BRANCH).then(function gotRefs (data) {
    return getJSON(API_BASE_URL + '/git/trees/' + data.object.sha + '?recursive=1');
  }).then(function gotTree (data) {
    data.tree.forEach(function (file) {
      if (!file ||
          file.path[0] === '.' ||
          file.type !== 'tree' ||
          DIR_BLACKLIST.indexOf(file.path.split('/')[0]) !== -1 ||
          DIR_BLACKLIST.indexOf(file.path + '/') !== -1) {
        return;
      }

      getManifest(file.path).then(function (manifest) {
        manifest.git = {
          path: file.path,
          sha: file.sha.substr(0, 8)
        };
        addManifest(manifest);
      });
    });
  });

  function getManifest (dirName) {
    // TODO: Fetch real manifest.
    var path = '/' + dirName + '/';
    return Promise.resolve({
      name: dirName,
      path: path,
      url: BASE_WWW_URL + path
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

  function directoryLoaded () {
    try {
      data = JSON.parse(this.responseText);
    } catch (e) {
      return {};
    }
    data = Array.isArray(data.objects) ? data.objects : data;
    data = data.map(sanitiseItem);
    return data;
  }
})();
