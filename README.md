Resume
======

My Curriculum Vitae, hosted at [john.manero.io](https://john.manero.io/), because Microsoft Word is a sadness and my neck beard isn't big enough for LaTeX... yet.

## How does this even work?

_Seriously, it's going to be a while before I have to update this thing again._

Ok, here we go...

* The `data` directory contains YAML files that can be injected into pages as additional attributes
* The `layouts` directory contains EJS files that pages can specify as their templates. `layouts` can also
  contain partial templates that can be included in complete templates via the EJS `include(...)` method.
* The `pages` directory contains YAML files that define HTML pages from an EJS layout and optional data files
* The `styles` directory contains SCSS files that will be rendered into CSS files

### Page Schema

Pages currently require a `layout` property that references an EJS file in the `layouts` directory. Page files may also have a `data` property containing an Array. Elements may be a string, which loads the corresponding data file into a property with the same name. Elements may also be an Object with `path` and `name` properties, which will load a data file from `path` into the property `name`.

### Also there's some magic in there

The `Style` and `Static` modules both load resources from `node_modules`. This allows them to load SCSS and JavaScript resources from published packages, installed by NPM, instead of having to copy other peoples junk into my repo.
