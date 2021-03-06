/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule flattenSplitRelayQueries
 * 
 * @format
 */

'use strict';

var _toConsumableArray3 = _interopRequireDefault(require('babel-runtime/helpers/toConsumableArray'));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * Flattens the nested structure returned by `splitDeferredRelayQueries`.
 *
 * Right now our internals discard the information about the relationship
 * between the queries that is encoded in the nested structure.
 *
 * @internal
 */
function flattenSplitRelayQueries(splitQueries) {
  var flattenedQueries = [];
  var queue = [splitQueries];
  while (queue.length) {
    splitQueries = queue.shift();
    var _splitQueries = splitQueries,
        required = _splitQueries.required,
        deferred = _splitQueries.deferred;

    if (required) {
      flattenedQueries.push(required);
    }
    if (deferred.length) {
      queue.push.apply(queue, (0, _toConsumableArray3['default'])(deferred));
    }
  }
  return flattenedQueries;
}

module.exports = flattenSplitRelayQueries;