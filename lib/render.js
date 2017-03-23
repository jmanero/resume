'use strict';
const FS = require('fs');
const File = require('./file');
const Path = require('path');

/**
 * Render all of the files for a static site
 */
class Render {
  /**
   * @constructor
   */
  constructor() {
    this.output = Path.resolve(__dirname, '../_site');
    this.mounts = [];
  }

  /**
   * Mount a renderer to a path
   * @param {String}  prefix
   * @param {Function}  renderer
   */
  add(prefix, renderer) {
    this.mounts.push([prefix, renderer]);
  }

  /**
   * Evaluate all of the mounted renderers
   * @return  {Promise}
   */
  render() {
    return File.directory(this.output)
      .then(() => Promise.all(this.mounts.map(([prefix, render]) => {
        const path = Path.join(this.output, prefix);

        Log.info(`RENDER: Rendering ${prefix} into ${path}`);

        return File.directory(path).then(() => render(new Writer(path)));
      })));
  }
}
module.exports = Render;

class Writer {
  constructor(prefix) {
    this.prefix = prefix;
  }

  file(path, content, extension) {
    if (extension) { path += extension; }
    path = Path.join(this.prefix, path);

    Log.info(`RENDER: Writing ${content.length} bytes to ${path}`);

    return new Promise((resolve, reject) => {
      FS.writeFile(path, content, (err) => err ? reject(err) : resolve);
    });
  }
}
