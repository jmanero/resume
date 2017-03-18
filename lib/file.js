'use strict';
const FS = require('fs');
const MIME = require('mime');
const Path = require('path');

/**
 * Read and cache files
 */
class File {
  /**
   * Read a file from disk and try to cache it by `mtime`
   * @param {String} path
   * @param {String} [extension]
   * @return  {Promise}
   */
  static read(path, extension) {
    path = path + (extension ? '.' + extension : '');

    return new Promise((resolve, reject) => {
      FS.stat(path, (err, stats) => (err) ? reject(err) : resolve(stats));
    })
      .then((stats) => {
        const mtime = stats.mtime.getTime();

        // Check if the file is cached, and if the cached content is still fresh
        if (this.cache.has(path)) {
          const cached = this.cache.get(path);


          if (cached.stats.mtime.getTime() === mtime) {
            Log.debug(`Cache hit for ${path} (${mtime})`);

            return cached;
          }

          // Clear a stale cache entry
          this.cache.delete(path);
        }

        Log.debug(`Cache miss for ${path} (${mtime})`);

        // (re)Read the file and cache it
        return new Promise((resolve, reject) => {
          FS.readFile(path, (err, content) => {
            if (err) { return reject(err); }

            const type = MIME.lookup(path);
            const object = {path, content, stats, type};

            this.cache.set(path, object);
            resolve(object);
          });
        });
      });
  }

  /**
   * Read a resource file from the repo
   * @param {String} type
   * @param {String} name
   * @param {String} [extension]
   * @return  {Promise}
   */
  static resource(type, name, extension) {
    return this.read(Path.resolve(__dirname, '../', type, name), extension);
  }
}

File.cache = new Map();
module.exports = File;
