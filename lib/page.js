'use strict';
const Assert = require('assert');
const EJS = require('ejs');
const File = require('./file');
const Path = require('path');
const YAML = require('js-yaml');

/**
 * Dynamically generate pages from YAML and EJS layouts
 */
class Page {
  /**
   * Create an Express handler function to serve pages
   * @return {Function}
   */
  static serve() {
    return function(req, res, next) {
      // Normalize .. traversal, strip leading /, and default to index
      const path = Path.resolve('/' + ((req.path === '/') ? 'index.html' : req.path)).slice(1);

      const dirname = Path.dirname(path);
      const basename = Path.basename(path, '.html');

      Page.fromYAML(Path.join(dirname, basename))
        .then((page) => page.render())
        .then((content) => res.type('text/html').send(content))
        .catch((err) => next(err));
    };
  }

  /**
   * Load a Page from a YAML specification
   * @param {String}  name  The YAML file in the `pages` directory
   * @return  {Promise}
   */
  static fromYAML(name) {
    const path = Path.resolve(__dirname, '../pages', name);
    const page = new Page(name);

    return File.resource('pages', path, 'yml')
      .then((file) => YAML.safeLoad(file.content))
      .then((spec) => page.load(spec));
  }

  /**
   * @constructor
   * @param {String}  name  An identifier for the Page resource
   */
  constructor(name) {
    this.name = name;
  }

  /**
   * @private Read a YAML data file
   *
   * A Page object may contain an array of data sources, which may be defined as
   * a single String, or an Object.
   *
   * Strings will be treated as both the file name to be loaded, with `.yml` appended,
   * and the property name that the loaded object will be set as in the Page's `data` object.
   *
   * An Object must have a `name` property, which will be treated the same as the
   * configuration, above. The Object may also have a `path` property, which will
   * be used as an explicit path to the desired YAML file within the data directory.
   *
   * @param {String|Object} options
   * @param {String} [options.path]
   * @param {String} [options.name]
   * @return  {Promise}
   */
  _data(options) {
    if (typeof options === 'string') {
      if (options[0] === '/') { options = options.slice(1); } // remote a leading slash
      options = {path: options};
    }

    Assert.ok(options.hasOwnProperty('path'), 'Data source is missing a required property \'path\'');

    // Generate data-soruce name property form it's path
    if (!options.hasOwnProperty('name')) {
      options.name = Path.basename(options.path, Path.extname(options.path));
    }

    return File.resource('data', options.path, 'yml').then((file) => {
      this.properties[options.name] = YAML.safeLoad(file.content);

      return this;
    });
  }

  /**
   * @private Read an EJS template into a compiled render function
   * @param {String} path
   * @return  {Promise}
   */
  _layout() {
    return File.resource('layouts', this.layout, 'ejs').then((file) => {
      this.template = EJS.compile(file.content.toString('utf8'), {filename: file.path});

      return this;
    });
  }

  /**
   * Load a page definition, its layout, and any included data files
   * @param {Object}  spec  A specification for the page
   * @param {String}  spec.layout  The layout to use for the page
   * @param {Array}   [spec.data]  An Array of YAML files to load as additional properties
   * @return {Promise}
   */
  load(spec) {
    Assert.ok(spec.hasOwnProperty('layout'), `Specification for Page ${this.name} is missing required property 'layout'`);

    // Store the page's properties and configuration loaded from YAML
    this.layout = spec.layout;
    this.data = spec.data;
    this.properties = spec;

    delete this.properties.layout;
    delete this.properties.data;

    // Load the page's EJS layout
    return this._layout(this.layout)

      // Load any data sources defined for the page
      .then(() => {
        if (!(this.data instanceof Array)) { return; }

        return Promise.all(
          this.data.map((options) => this._data(options))
        );
      })
      .then(() => this);
  }

  /**
   * Render the EJS layout with the configured parameters
   * @return {Promise}
   */
  render() {
    return new Promise((resolve) => {
      const rendered = this.template(this.properties);

      resolve(rendered);
    });
  }
}

module.exports = Page;
