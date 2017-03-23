'use strict';
const File = require('./file');
const Path = require('path');
const SASS = require('node-sass');

/**
 * Render an SCSS stylesheet
 */
class Style {
  /**
   * Create an Express handler function to serve stylesheets
   * @return {Function}
   */
  static serve() {
    return function(req, res, next) {
      // Normalize .. traversal, strip leading /
      const path = Path.resolve('/' + req.path).slice(1);

      const dirname = Path.dirname(path);
      const basename = Path.basename(path, '.css');

      Log.info(`SCSS: Serve ${path} for ${req.originalUrl}`);

      new Style(Path.join(dirname, basename)).render()
        .then((stylesheet) => res.type('text/css').send(stylesheet.css))
        .catch((err) => next(err));
    };
  }

  /**
   * Render stylesheets into a static site directory
   * @return {Function}
   */
  static static() {
    return function(writer) {
      return File.resources('styles', '.scss')
        .then((files) => Promise.all(files.map((style) => {
          return new Style(style).render()
             .then((stylesheet) => writer.file(style, stylesheet.css, '.css'));
        })));
    };
  }

  /**
   * Add an include directory from a module
   * @param {String}  name  The mount-point for the included directory when resolving paths
   * @param {String}  path  The target module name and subpath to its SCSS source. Note that
   *                        the module must already be installed in the node_modules directory.
   */
  static use(name, path) {
    this.includes.set(name, Path.resolve(__dirname, '../node_modules', path));
  }

  /**
   * Resolve an include path to a file on disk.
   *
   * Resolution logic:
   * - If the path begins with the name of a configured source module, it will
   * be resolved to a subpath of that module. e.g. `bootstrap/bootstrap-grid` will resolve
   * to `node_modules/bootstrap/scss/bootstrap-grid.scss`, assuming that `bootstrap/scss`
   * as mounted as `bootstrap`
   * - If a parent path is provided, the parent's module will be used and the
   * path will be resolved relative to the directory name of the parent within
   * its module.
   *
   * The return value is an Object with keys
   * - `path`: the absolute file-system path to the target file
   * - `module.name`: the mount-name of the module the file was resolved to
   * - `module.path`: the file-system path of the module the file was resolved to
   * - 'file': the relative path, including its module-name prefix, of the target file
   *
   * @param {String}  path
   * @param {String}  parent
   * @return {Object}
   */
  static resolve(path, parent) {
    Log.debug(`SCSS: Resolve module ${path}` + (parent ? `, imported by ${parent}` : ''));

    const nodes = path.split(Path.sep);
    const name = nodes.shift();
    const resource = nodes.join(Path.sep);

    // The path maps to a configured SCSS module
    if (this.includes.has(name)) {
      const prefix = this.includes.get(name);

      Log.debug(`SCSS: Using module ${name} (${prefix}) for ${path}`);

      return {
        path: Path.join(prefix, resource),
        module: {name, path: prefix},
        file: path,
        parent
      };
    }

    // If there's no parent parameter, fail.
    if (!parent) { throw new Error(`Cannot resolve ${path} to an SCSS module`); }

    // Fall back to an internal reference relative to the parent
    const resolved = this.resolve(parent);

    // Inject an _ into internal file names
    const file = Path.join(Path.dirname(path), '_' + Path.basename(path));

    Log.debug(`SCSS: Using module ${resolved.module.name} (${resolved.module.path}) for ${file}`);

    return {
      path: Path.resolve(resolved.module.path, file),
      module: resolved.module,
      file: Path.join(resolved.module.name, file)
    };
  }

  /**
   * A custom importer for node-scss that is aware of node_modules and uses the caching
   * file loader
   * @param {String}  path
   * @param {String}  parent
   * @param {Function}  done
   */
  static importer(path, parent, done) {
    const resolved = this.resolve(path, parent);

    File.read(resolved.path, 'scss').then((file) => done({
      contents: file.content.toString('utf8'),
      file: resolved.file
    }), (err) => done(err));
  }

  /**
   * @constructor
   * @param {String}  name
   */
  constructor(name) {
    this.name = name;
  }

  /**
   * Render the SCSS stylesheet
   * @return {Promise}
   */
  render() {
    return File.resource('styles', this.name, 'scss')
      .then((file) => new Promise((resolve, reject) => SASS.render({
        data: file.content.toString('utf8'),
        file: file.path,
        importer: Style.importer.bind(Style)
      }, (err, result) => err ? reject(err) : resolve(result))));
  }

}

Style.includes = new Map();
module.exports = Style;
