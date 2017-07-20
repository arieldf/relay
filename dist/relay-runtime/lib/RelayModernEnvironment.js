/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule RelayModernEnvironment
 * 
 * @format
 */

'use strict';

var _classCallCheck3 = _interopRequireDefault(require('babel-runtime/helpers/classCallCheck'));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var RelayModernEnvironment = function () {
  function RelayModernEnvironment(config) {
    var _this = this;

    (0, _classCallCheck3['default'])(this, RelayModernEnvironment);

    var handlerProvider = config.handlerProvider ? config.handlerProvider : require('./RelayDefaultHandlerProvider');
    this._network = config.network;
    this._publishQueue = new (require('./RelayPublishQueue'))(config.store, handlerProvider);
    this._store = config.store;
    this.unstable_internal = require('./RelayCore');

    this.__setNet = function (newNet) {
      return _this._network = newNet;
    };

    if (process.env.NODE_ENV !== 'production') {
      var g = typeof global !== 'undefined' ? global : window;

      // Attach the debugger symbol to the global symbol so it can be accessed by
      // devtools extension.
      if (!g.__RELAY_DEBUGGER__) {
        var _require = require('./RelayDebugger'),
            RelayDebugger = _require.RelayDebugger;

        g.__RELAY_DEBUGGER__ = new RelayDebugger();
      }

      var envId = g.__RELAY_DEBUGGER__.registerEnvironment(this);
      this._debugger = g.__RELAY_DEBUGGER__.getEnvironmentDebugger(envId);
    } else {
      this._debugger = null;
    }
  }

  RelayModernEnvironment.prototype.getStore = function getStore() {
    return this._store;
  };

  RelayModernEnvironment.prototype.getDebugger = function getDebugger() {
    return this._debugger;
  };

  RelayModernEnvironment.prototype.applyUpdate = function applyUpdate(optimisticUpdate) {
    var _this2 = this;

    var dispose = function dispose() {
      _this2._publishQueue.revertUpdate(optimisticUpdate);
      _this2._publishQueue.run();
    };
    this._publishQueue.applyUpdate(optimisticUpdate);
    this._publishQueue.run();
    return { dispose: dispose };
  };

  RelayModernEnvironment.prototype.applyMutation = function applyMutation(_ref) {
    var _this3 = this;

    var operation = _ref.operation,
        optimisticResponse = _ref.optimisticResponse,
        optimisticUpdater = _ref.optimisticUpdater;

    var optimisticUpdate = {
      operation: operation,
      selectorStoreUpdater: optimisticUpdater,
      response: optimisticResponse || null
    };
    var dispose = function dispose() {
      _this3._publishQueue.revertUpdate(optimisticUpdate);
      _this3._publishQueue.run();
    };
    this._publishQueue.applyUpdate(optimisticUpdate);
    this._publishQueue.run();
    return { dispose: dispose };
  };

  RelayModernEnvironment.prototype.check = function check(readSelector) {
    return this._store.check(readSelector);
  };

  RelayModernEnvironment.prototype.commitPayload = function commitPayload(operationSelector, payload) {
    // Do not handle stripped nulls when commiting a payload
    var relayPayload = require('./normalizeRelayPayload')(operationSelector.root, payload);
    this._publishQueue.commitPayload(operationSelector, relayPayload);
    this._publishQueue.run();
  };

  RelayModernEnvironment.prototype.commitUpdate = function commitUpdate(updater) {
    this._publishQueue.commitUpdate(updater);
    this._publishQueue.run();
  };

  RelayModernEnvironment.prototype.lookup = function lookup(readSelector) {
    return this._store.lookup(readSelector);
  };

  RelayModernEnvironment.prototype.subscribe = function subscribe(snapshot, callback) {
    return this._store.subscribe(snapshot, callback);
  };

  RelayModernEnvironment.prototype.retain = function retain(selector) {
    return this._store.retain(selector);
  };

  RelayModernEnvironment.prototype.sendQuery = function sendQuery(_ref2) {
    var _this4 = this;

    var cacheConfig = _ref2.cacheConfig,
        onCompleted = _ref2.onCompleted,
        onError = _ref2.onError,
        onNext = _ref2.onNext,
        operation = _ref2.operation;

    var isDisposed = false;
    var dispose = function dispose() {
      isDisposed = true;
    };
    var onRequestSuccess = function onRequestSuccess(payload) {
      if (isDisposed) {
        return;
      }
      _this4._publishQueue.commitPayload(operation, payload);
      _this4._publishQueue.run();
      onNext && onNext(payload);
      onCompleted && onCompleted();
    };
    var onRequestError = function onRequestError(error) {
      if (isDisposed) {
        return;
      }
      onError && onError(error);
    };
    var networkRequest = this._network.request(operation.node, operation.variables, cacheConfig);
    if (require('./isPromise')(networkRequest)) {
      networkRequest.then(onRequestSuccess)['catch'](onRequestError);
    } else if (networkRequest instanceof Error) {
      onRequestError(networkRequest);
    } else {
      onRequestSuccess(networkRequest);
    }
    return { dispose: dispose };
  };

  RelayModernEnvironment.prototype.streamQuery = function streamQuery(_ref3) {
    var _this5 = this;

    var cacheConfig = _ref3.cacheConfig,
        onCompleted = _ref3.onCompleted,
        onError = _ref3.onError,
        _onNext = _ref3.onNext,
        operation = _ref3.operation;

    return this._network.requestStream(operation.node, operation.variables, cacheConfig, {
      onCompleted: onCompleted,
      onError: onError,
      onNext: function onNext(payload) {
        _this5._publishQueue.commitPayload(operation, payload);
        _this5._publishQueue.run();
        _onNext && _onNext(payload);
      }
    });
  };

  RelayModernEnvironment.prototype.sendMutation = function sendMutation(_ref4) {
    var _this6 = this;

    var onCompleted = _ref4.onCompleted,
        onError = _ref4.onError,
        operation = _ref4.operation,
        optimisticResponse = _ref4.optimisticResponse,
        optimisticUpdater = _ref4.optimisticUpdater,
        updater = _ref4.updater,
        uploadables = _ref4.uploadables;

    var hasOptimisticUpdate = !!optimisticResponse || optimisticUpdater;
    var optimisticUpdate = {
      operation: operation,
      selectorStoreUpdater: optimisticUpdater,
      response: optimisticResponse || null
    };
    if (hasOptimisticUpdate) {
      this._recordDebuggerEvent('Apply Optimistic Update', operation, function () {
        _this6._publishQueue.applyUpdate(optimisticUpdate);
        _this6._publishQueue.run();
      });
    }
    var isDisposed = false;
    var dispose = function dispose() {
      if (hasOptimisticUpdate) {
        _this6._recordDebuggerEvent('Revert Optimistic Update', operation, function () {
          _this6._publishQueue.revertUpdate(optimisticUpdate);
          _this6._publishQueue.run();
          hasOptimisticUpdate = false;
        });
      }
      isDisposed = true;
    };
    var onRequestSuccess = function onRequestSuccess(payload) {
      if (isDisposed) {
        return;
      }

      _this6._recordDebuggerEvent('Commit Payload (Reverting Optimistic Update)', operation, function () {
        if (hasOptimisticUpdate) {
          _this6._publishQueue.revertUpdate(optimisticUpdate);
        }
        _this6._publishQueue.commitPayload(operation, payload, updater);
        _this6._publishQueue.run();
      });

      onCompleted && onCompleted(payload.errors);
    };

    var onRequestError = function onRequestError(error) {
      if (isDisposed) {
        return;
      }

      _this6._recordDebuggerEvent('Request Error', operation, function () {
        if (hasOptimisticUpdate) {
          _this6._publishQueue.revertUpdate(optimisticUpdate);
        }
        _this6._publishQueue.run();
      });
      onError && onError(error);
    };

    var networkRequest = this._network.request(operation.node, operation.variables, { force: true }, uploadables);

    if (require('./isPromise')(networkRequest)) {
      networkRequest.then(onRequestSuccess)['catch'](onRequestError);
    } else {
      require('fbjs/lib/warning')(false, 'RelayModernEnvironment: mutation request cannot be synchronous.');
    }
    return { dispose: dispose };
  };

  RelayModernEnvironment.prototype.sendSubscription = function sendSubscription(_ref5) {
    var _this7 = this;

    var onCompleted = _ref5.onCompleted,
        _onNext2 = _ref5.onNext,
        onError = _ref5.onError,
        operation = _ref5.operation,
        updater = _ref5.updater;

    return this._network.requestStream(operation.node, operation.variables, { force: true }, {
      onCompleted: onCompleted,
      onError: onError,
      onNext: function onNext(payload) {
        _this7._publishQueue.commitPayload(operation, payload, updater);
        _this7._publishQueue.run();
        _onNext2 && _onNext2(payload);
      }
    });
  };

  RelayModernEnvironment.prototype._recordDebuggerEvent = function _recordDebuggerEvent(eventName, operation, fn) {
    if (this._debugger) {
      this._debugger.recordMutationEvent(eventName, operation, fn);
    } else {
      fn();
    }
  };

  return RelayModernEnvironment;
}();

// Add a sigil for detection by `isRelayModernEnvironment()` to avoid a
// realm-specific instanceof check, and to aid in module tree-shaking to
// avoid requiring all of RelayRuntime just to detect its environment.


RelayModernEnvironment.prototype['@@RelayModernEnvironment'] = true;

module.exports = RelayModernEnvironment;