'use strict';
const FS = require('fs');
const MIME = require('mime');
const Path = require('path');

const mkdirp = require('mkdirp');

/**
 * Read and cache files
 */
class File {
  /**
   * Ensure that a directory exists
   * @param {String} path
   * @return {Promise}
   */
  static directory(path) {
    return new Promise((resolve, reject) => {
      mkdirp(path, (err) => err ? reject(err) : resolve(path));
    });
  }

  static tree(path) {
    return new Promise((resolve, reject) => {

      FS.readdir(path, (err, files) => {
        if (err) { return reject(err); }
        resolve(files.map((file) => Path.join(path, file)));
      });
    });
  }

  static resources(type, extension) {
    return new Promise((resolve, reject) => {
      const path = Path.resolve(__dirname, '../', type);

      FS.readdir(path, (err, files) => {
        if (err) { return reject(err); }

        resolve(files
          .filter((file) => Path.extname(file) === extension)
          .map((file) => {
            const dirname = Path.dirname(file);
            const basename = Path.basename(file, extension);

            return Path.join(dirname, basename);
          }));
      });
    });
  }

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
            Log.debug(`CACHE: Hit for ${path} (${mtime})`);

            return cached;
          }

          // Clear a stale cache entry
          this.cache.delete(path);
        }

        Log.debug(`CACHE: Miss for ${path} (${mtime})`);

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
