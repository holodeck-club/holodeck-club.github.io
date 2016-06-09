/*
 |--------------------------------------------------------------------------
 | Browser-sync config file
 |--------------------------------------------------------------------------
 |
 | For up-to-date information about the options:
 |   http://www.browsersync.io/docs/options/
 |
 | There are more options than you see here, these are just the ones that are
 | set internally. See the website for more info.
 |
 |
 */

var fs = require('fs');
var path = require('path');
var urllib = require('url');

var REMOTE_URL_REGEX = new RegExp('https?://(www\.)?holodeck.club/', 'gi');
var REMOTE_URL_REGEX_REPLACER = '/';

function isEnabled (val) {
  val = val || '';
  return val !== '' && val !== '0' && val !== 'false' && val !== 'off';
}

function getEnvVar (name, defaultVal) {
  return name in process.env ? isEnabled(name) : defaultVal;
}

var isDev = process.env.NODE_ENVIRONMENT === 'development';

var rewriteRemoteUrls = getEnvVar('BS_REWRITE_URLS', isDev);

var opts = {
  server: {
    baseDir: process.env.HOLODECK_CLUB_PATH || './',
  },
  middleware: [],
  rewriteRules: [],
  files: [
    '**',
    '!*\.{7z,com,class,db,dll,dmg,exe,gz,iso,jar,o,log,so,sql,sqlite,tar,zip}',
    '!node_modules'
  ],
  watchOptions: {
    ignoreInitial: true
  },
  open: getEnvVar('BS_OPEN', false),
  notify: getEnvVar('BS_NOTIFY', false),
  tunnel: getEnvVar('BS_TUNNEL', false),
  minify: getEnvVar('BS_MINIFY', isDev)
};

if (rewriteRemoteUrls) {
  // Rewrite `https://holodeck.club/*` URLs.
  opts.rewriteRules.push({
    match: REMOTE_URL_REGEX,
    fn: function () {
      return REMOTE_URL_REGEX_REPLACER;
    }
  });
}

opts.middleware.push(function (req, res, next) {
  if (!rewriteRemoteUrls) {
    return next();
  }
  var pathname = urllib.parse(req.url).pathname;
  var isManifest = pathname.indexOf('manifest.json') > -1;
  var isCSS = pathname.indexOf('.css') > -1;
  var isJS = pathname.indexOf('.js') > -1;
  if (isManifest || isCSS || isJS) {
    // Rewrite `holodeck.club` URLs.
    var readableStream = fs.createReadStream(
      path.join(__dirname, pathname),
      {encoding: 'utf8'}
    );
    var mimeType = 'text/plain';
    if (isManifest) {
      mimeType = 'application/manifest+json';
    } else if (isCSS) {
      mimeType = 'text/css';
    } else if (isJS) {
      mimeType = 'text/js';
    }
    var data = '';
    var chunk;
    res.writeHead(200, {'Content-Type': mimeType});
    readableStream.on('readable', function () {
      while ((chunk = readableStream.read()) !== null) {
        data += chunk;
      }
    });
    readableStream.on('error', function () {
      next();
    });
    readableStream.on('end', function () {
      res.end(data.replace(REMOTE_URL_REGEX, REMOTE_URL_REGEX_REPLACER));
    });
    return;
  }
  return next();
});

module.exports = opts;
