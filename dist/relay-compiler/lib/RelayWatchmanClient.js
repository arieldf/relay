/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule RelayWatchmanClient
 * 
 * @format
 */
'use strict';

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _classCallCheck3 = _interopRequireDefault(require('babel-runtime/helpers/classCallCheck'));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var RelayWatchmanClient = function () {
  function RelayWatchmanClient() {
    (0, _classCallCheck3['default'])(this, RelayWatchmanClient);

    this._client = new (require('fb-watchman').Client)();
  }

  RelayWatchmanClient.prototype.command = function command() {
    var _this = this;

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return new Promise(function (resolve, reject) {
      _this._client.command(args, function (error, response) {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  };

  RelayWatchmanClient.prototype.hasCapability = (() => {
    var _ref = (0, _asyncToGenerator3.default)(function* (capability) {
      var resp = yield this.command('list-capabilities');
      return resp.capabilities.includes(capability);
    });

    function hasCapability(_x) {
      return _ref.apply(this, arguments);
    }

    return hasCapability;
  })();

  RelayWatchmanClient.prototype.watchProject = (() => {
    var _ref2 = (0, _asyncToGenerator3.default)(function* (baseDir) {
      var resp = yield this.command('watch-project', baseDir);
      if ('warning' in resp) {
        console.error('Warning:', resp.warning);
      }
      return {
        root: resp.watch,
        relativePath: resp.relative_path
      };
    });

    function watchProject(_x2) {
      return _ref2.apply(this, arguments);
    }

    return watchProject;
  })();

  RelayWatchmanClient.prototype.on = function on(event, callback) {
    this._client.on(event, callback);
  };

  RelayWatchmanClient.prototype.end = function end() {
    this._client.end();
  };

  return RelayWatchmanClient;
}();

module.exports = RelayWatchmanClient;