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

      Log.info(`STATIC: Serve ${path} for ${req.originalUrl}`);

      File.read(Path.join(options.path, path))
        .then((file) => {
          res.type(file.type).send(file.content);
        })
        .catch((err) => next(err));
    };
  }

  /**
   * Copy a tree of static asset files
   * @param {Object} options
   * @return {Function}
   */
  static copy(options) {
    options = Object.assign({}, options);

    if (options.hasOwnProperty('module')) {
      options.path = Path.resolve(__dirname, '../node_modules', options.module);
    }

    Assert.ok(options.hasOwnProperty('path'), 'Static.copy() must be called with a path parameter');

    return function(writer) {
      return File.tree(options.path)
        .then((files) => Promise.all(files.map((path) => {
          File.read(path)
            .then((file) => writer.file(Path.basename(path), file.content));
        })));
    };
  }
}
module.exports = Static;
