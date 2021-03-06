/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule RelayConsoleReporter
 * 
 * @format
 */

'use strict';

var _classCallCheck3 = _interopRequireDefault(require('babel-runtime/helpers/classCallCheck'));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var RelayConsoleReporter = function () {
  function RelayConsoleReporter(options) {
    (0, _classCallCheck3['default'])(this, RelayConsoleReporter);

    this._verbose = options.verbose;
  }

  RelayConsoleReporter.prototype.reportError = function reportError(caughtLocation, error) {
    require('process').stdout.write(require('chalk').red('ERROR:' + '\n' + error.message + '\n'));
    if (this._verbose) {
      var frames = error.stack.match(/^ {4}at .*$/gm);
      if (frames) {
        require('process').stdout.write(require('chalk').gray('From: ' + caughtLocation + '\n' + frames.join('\n') + '\n'));
      }
    }
  };

  return RelayConsoleReporter;
}();

module.exports = RelayConsoleReporter;