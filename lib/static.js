'use strict';
const Assert = require('assert');
const File = require('./file');
const Path = require('path');

/**
 * Cache and serve static files from disk
 */
class Static {
  /**
   * Serve static files
   * @param {Object} options
   * @return {Function}
   */
  static serve(options) {
    options = Object.assign({}, options);

    if (options.hasOwnProperty('module')) {
      options.path = Path.resolve(__dirname, '../node_modules', options.module);
    }

    Assert.ok(options.hasOwnProperty('path'), 'Static.serve() must be called with a path parameter');

    return function(req, res, next) {
      // Normalize .. traversal, strip leading /
      const path = Path.resolve('/' + req.path).slice(1);

      File.read(Path.join(options.path, path))
        .then((file) => {
          res.type(file.type).send(file.content);
        })
        .catch((err) => next(err));
    };
  }
}
module.exports = Static;
