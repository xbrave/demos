const path = require('path');
const fs = require('fs');
const vm = require('vm');

function MyOwnModule(id = '') {
  this.id = id;
  this.path = path.dirname(id);
  this.exports = {};
  this.filename = null;
  this.loaded = false;
}

MyOwnModule._cache = Object.create(null);
MyOwnModule._extensions = Object.create(null);

MyOwnModule.prototype.require = function (id) {
  return MyOwnModule._load(id);
};

MyOwnModule._load = function (request) {
  const filename = MyOwnModule._resolveFilename(request);
  const cachedModule = MyOwnModule._cache[filename];
  if (cachedModule !== undefined) return cachedModule.exports;
  const module = new MyOwnModule(filename);
  MyOwnModule._cache[filename] = module;
  module.load(filename);
  return module.exports;
};

MyOwnModule._resolveFilename = function (request) {
  const filename = path.resolve(__dirname, request);
  const ext = path.extname(filename);
  if (!ext) {
    const extensions = Object.keys(MyOwnModule._extensions);
    for (let i = 0; i <= extensions; i++) {
      const currentFile = `${filename}${extensions[i]}`;
      if (fs.existsSync(currentFile)) return currentFile;
    }
  }
  return filename;
};

MyOwnModule.prototype.load = function (filename) {
  const extname = path.extname(filename);
  MyOwnModule._extensions[extname](this, filename);
  this.loaded = true;
};

MyOwnModule._extensions['.js'] = function (module, filename) {
  const fileContent = fs.readFileSync(filename, 'utf-8');
  module._compile(fileContent, filename);
};

MyOwnModule.wrapper = [
  '(function (exports, require, module, __filename, __dirname) { ',
  '\n});',
];

MyOwnModule.prototype._compile = function (content, filename) {
  const wrappedContent =
    MyOwnModule.wrapper[0] + content + MyOwnModule.wrapper[1];
  const compiler = vm.runInThisContext(wrappedContent, {
    filename,
    lineOffset: 0,
    displayErrors: true,
  });
  const dirname = path.dirname(filename);
  compiler.call(
    this.exports,
    this.exports,
    this.require,
    this,
    filename,
    dirname
  );
};

MyOwnModule._extensions['.json'] = function (module, filename) {
  const fileContent = fs.readFileSync(filename, 'utf-8');
  module.exports = JSON.parse(fileContent);
};

const foo = new MyOwnModule('./foo.js');

const result = foo.require('./foo.js');

console.log(result, foo);
