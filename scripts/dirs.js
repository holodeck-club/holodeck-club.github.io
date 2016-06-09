var readdirp = require('readdirp');

var DIR_WHITELIST = [
  '!.*',
  '!assets',
  '!common',
  '!node_modules',
  '!test',
  '!tests',
];

var dirs = {};

module.exports = function (cb) {
  readdirp({
    root: './',
    depth: 2,
    directoryFilter: DIR_WHITELIST
  }).on('data', function (entry) {
    if (!entry.parentDir || entry.parentDir in dirs) {
      return;
    }
    dirs[entry.parentDir] = {path: entry.parentDir};
  }).on('error', function (err) {
    cb(err);
  }).on('end', function () {
    console.log(dirs);
    cb(null, dirs);
  });
};
