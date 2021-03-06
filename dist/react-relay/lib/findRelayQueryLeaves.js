/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule findRelayQueryLeaves
 * 
 * @format
 */

'use strict';

var _classCallCheck3 = _interopRequireDefault(require('babel-runtime/helpers/classCallCheck'));

var _possibleConstructorReturn3 = _interopRequireDefault(require('babel-runtime/helpers/possibleConstructorReturn'));

var _inherits3 = _interopRequireDefault(require('babel-runtime/helpers/inherits'));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var EDGES = require('./RelayConnectionInterface').EDGES,
    PAGE_INFO = require('./RelayConnectionInterface').PAGE_INFO;

/**
 * @internal
 *
 * Traverses a query and data in the record store to determine if there are
 * additional nodes that needs to be read from disk cache. If it  ncounters
 * a node that is not in `cachedRecords`, it will queued that node by adding it
 * into the `pendingNodeStates` list. If it encounters a node that was already read
 * but still missing data, then it will short circuit the evaluation since
 * there is no way for us to satisfy this query even with additional data from
 * disk cache and resturn
 */


function findRelayQueryLeaves(store, cachedRecords, queryNode, dataID, path, rangeCalls) {
  var finder = new RelayQueryLeavesFinder(store, cachedRecords);

  var state = {
    dataID: dataID,
    missingData: false,
    path: path,
    rangeCalls: rangeCalls,
    rangeInfo: undefined
  };
  finder.visit(queryNode, state);
  return {
    missingData: state.missingData,
    pendingNodeStates: finder.getPendingNodeStates()
  };
}

var RelayQueryLeavesFinder = function (_RelayQueryVisitor) {
  (0, _inherits3['default'])(RelayQueryLeavesFinder, _RelayQueryVisitor);

  function RelayQueryLeavesFinder(store) {
    var cachedRecords = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    (0, _classCallCheck3['default'])(this, RelayQueryLeavesFinder);

    var _this = (0, _possibleConstructorReturn3['default'])(this, _RelayQueryVisitor.call(this));

    _this._store = store;
    _this._cachedRecords = cachedRecords;
    _this._pendingNodeStates = [];
    return _this;
  }

  RelayQueryLeavesFinder.prototype.getPendingNodeStates = function getPendingNodeStates() {
    return this._pendingNodeStates;
  };

  /**
   * Skip visiting children if missingData is already false.
   */


  RelayQueryLeavesFinder.prototype.traverse = function traverse(node, state) {
    var children = node.getChildren();
    for (var ii = 0; ii < children.length; ii++) {
      if (state.missingData) {
        return;
      }
      this.visit(children[ii], state);
    }
  };

  RelayQueryLeavesFinder.prototype.visitFragment = function visitFragment(fragment, state) {
    var dataID = state.dataID;
    var recordState = this._store.getRecordState(dataID);
    if (recordState === require('./RelayClassicRecordState').UNKNOWN) {
      this._handleMissingData(fragment, state);
      return;
    } else if (recordState === require('./RelayClassicRecordState').NONEXISTENT) {
      return;
    }

    if (require('./isCompatibleRelayFragmentType')(fragment, this._store.getType(dataID))) {
      this.traverse(fragment, state);
    }
  };

  RelayQueryLeavesFinder.prototype.visitField = function visitField(field, state) {
    var dataID = state.dataID;
    var recordState = this._store.getRecordState(dataID);
    if (recordState === require('./RelayClassicRecordState').UNKNOWN) {
      this._handleMissingData(field, state);
      return;
    } else if (recordState === require('./RelayClassicRecordState').NONEXISTENT) {
      return;
    }

    if (state.rangeCalls && !state.rangeInfo) {
      var metadata = this._store.getRangeMetadata(dataID, state.rangeCalls);
      if (metadata) {
        state.rangeInfo = metadata;
      }
    }
    var rangeInfo = state.rangeInfo;
    if (rangeInfo && field.getSchemaName() === EDGES) {
      this._visitEdges(field, state);
    } else if (rangeInfo && field.getSchemaName() === PAGE_INFO) {
      this._visitPageInfo(field, state);
    } else if (!field.canHaveSubselections()) {
      this._visitScalar(field, state);
    } else if (field.isPlural()) {
      this._visitPlural(field, state);
    } else if (field.isConnection()) {
      this._visitConnection(field, state);
    } else {
      this._visitLinkedField(field, state);
    }
  };

  RelayQueryLeavesFinder.prototype._visitScalar = function _visitScalar(field, state) {
    var fieldData = this._store.getField(state.dataID, field.getStorageKey());
    if (fieldData === undefined) {
      this._handleMissingData(field, state);
    }
  };

  RelayQueryLeavesFinder.prototype._visitPlural = function _visitPlural(field, state) {
    var dataIDs = this._store.getLinkedRecordIDs(state.dataID, field.getStorageKey());
    if (dataIDs === undefined) {
      this._handleMissingData(field, state);
      return;
    }
    if (dataIDs) {
      for (var ii = 0; ii < dataIDs.length; ii++) {
        if (state.missingData) {
          break;
        }
        var nextState = {
          dataID: dataIDs[ii],
          missingData: false,
          path: require('./RelayQueryPath').getPath(state.path, field, dataIDs[ii]),
          rangeCalls: undefined,
          rangeInfo: undefined
        };
        this.traverse(field, nextState);
        state.missingData = nextState.missingData;
      }
    }
  };

  RelayQueryLeavesFinder.prototype._visitConnection = function _visitConnection(field, state) {
    var calls = field.getCallsWithValues();
    var dataID = this._store.getLinkedRecordID(state.dataID, field.getStorageKey());
    if (dataID === undefined) {
      this._handleMissingData(field, state);
      return;
    }
    if (dataID) {
      var nextState = {
        dataID: dataID,
        missingData: false,
        path: require('./RelayQueryPath').getPath(state.path, field, dataID),
        rangeCalls: calls,
        rangeInfo: null
      };
      var metadata = this._store.getRangeMetadata(dataID, calls);
      if (metadata) {
        nextState.rangeInfo = metadata;
      }
      this.traverse(field, nextState);
      state.missingData = state.missingData || nextState.missingData;
    }
  };

  RelayQueryLeavesFinder.prototype._visitEdges = function _visitEdges(field, state) {
    var rangeInfo = state.rangeInfo;
    // Doesn't have  `__range__` loaded
    if (!rangeInfo) {
      this._handleMissingData(field, state);
      return;
    }
    if (rangeInfo.diffCalls.length) {
      state.missingData = true;
      return;
    }
    var edgeIDs = rangeInfo.requestedEdgeIDs;
    for (var ii = 0; ii < edgeIDs.length; ii++) {
      if (state.missingData) {
        break;
      }
      var nextState = {
        dataID: edgeIDs[ii],
        missingData: false,
        path: require('./RelayQueryPath').getPath(state.path, field, edgeIDs[ii]),
        rangeCalls: undefined,
        rangeInfo: undefined
      };
      this.traverse(field, nextState);
      state.missingData = state.missingData || nextState.missingData;
    }
  };

  RelayQueryLeavesFinder.prototype._visitPageInfo = function _visitPageInfo(field, state) {
    var rangeInfo = state.rangeInfo;

    if (!rangeInfo || !rangeInfo.pageInfo) {
      this._handleMissingData(field, state);
      return;
    }
  };

  RelayQueryLeavesFinder.prototype._visitLinkedField = function _visitLinkedField(field, state) {
    var dataID = this._store.getLinkedRecordID(state.dataID, field.getStorageKey());
    if (dataID === undefined) {
      this._handleMissingData(field, state);
      return;
    }
    if (dataID) {
      var nextState = {
        dataID: dataID,
        missingData: false,
        path: require('./RelayQueryPath').getPath(state.path, field, dataID),
        rangeCalls: undefined,
        rangeInfo: undefined
      };
      this.traverse(field, nextState);
      state.missingData = state.missingData || nextState.missingData;
    }
  };

  RelayQueryLeavesFinder.prototype._handleMissingData = function _handleMissingData(node, state) {
    var dataID = state.dataID;
    if (this._cachedRecords.hasOwnProperty(dataID)) {
      // We have read data for this `dataID` from disk, but
      // we still don't have data for the relevant field.
      state.missingData = true;
    } else {
      // Store node in `pendingNodeStates` because we have not read data for
      // this `dataID` from disk.
      this._pendingNodeStates.push({
        dataID: dataID,
        node: node,
        path: state.path,
        rangeCalls: state.rangeCalls
      });
    }
  };

  return RelayQueryLeavesFinder;
}(require('./RelayQueryVisitor'));

module.exports = require('./RelayProfiler').instrument('findRelayQueryLeaves', findRelayQueryLeaves);