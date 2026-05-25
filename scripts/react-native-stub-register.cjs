const Module = require('module');
const path = require('path');

const stubPath = path.join(__dirname, '..', 'tests', 'helpers', 'reactNativeStub.cjs');
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function reactNativeStubResolve(request, parent, isMain, options) {
  if (request === 'react-native') {
    return stubPath;
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};
