/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule RelayQueryTransform
 * 
 * @format
 */

'use strict';

var _classCallCheck3 = _interopRequireDefault(require('babel-runtime/helpers/classCallCheck'));

var _possibleConstructorReturn3 = _interopRequireDefault(require('babel-runtime/helpers/possibleConstructorReturn'));

var _inherits3 = _interopRequireDefault(require('babel-runtime/helpers/inherits'));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * @internal
 *
 * `RelayQueryTransform` is a `RelayQueryVisitor` subclass that simplifies the
 * process of traversing, filtering, or transforming a Relay Query.
 *
 * The traversal is a map operation from `RelayQuery` nodes to nodes. The
 * default implementation traverses all nodes and maps each one to its
 * original value (ie. a no-op).
 *
 * Just like `RelayQueryVisitor`, subclasses of `RelayQueryTransform` can
 * optionally implement methods to customize the traversal and mapping of
 * different RelayQuery node types:
 *
 * - `visitField(field, state)`: Returns the new value for the visited field, or
 *   `null` to remove it from the output.
 * - `visitFragment(fragment, state)`: Returns the new value for the visited
 *   fragment, or `null` to remove it from the output.
 * - `visitQuery(fragment, state)`: Returns the new value for the top-level
 *   query, or `null` to transform the entire query out of existence.
 *
 * There are two additional methods for controlling the traversal:
 *
 * - `traverse(parent, state)`: Returns a cloned copy of the parent node after
 *   processing all of its children. Does not clone if nothing changed.
 * - `visit(child, state)`: Processes the child node, calling the appropriate
 *   `visit{Field,Fragment,Root` method based on the node type.
 *
 * All of these methods may return the original node in order to leave it
 * intact.
 *
 * @see RelayQueryVisitor
 */
var RelayQueryTransform = function (_RelayQueryVisitor) {
  (0, _inherits3['default'])(RelayQueryTransform, _RelayQueryVisitor);

  function RelayQueryTransform() {
    (0, _classCallCheck3['default'])(this, RelayQueryTransform);
    return (0, _possibleConstructorReturn3['default'])(this, _RelayQueryVisitor.apply(this, arguments));
  }

  RelayQueryTransform.prototype.traverse = function traverse(node, nextState) {
    if (!node.canHaveSubselections()) {
      return node;
    }
    var nextChildren = void 0;
    this.traverseChildren(node, nextState, function (child, index, children) {
      var prevChild = children[index];
      var nextChild = this.visit(prevChild, nextState);
      if (nextChild !== prevChild) {
        nextChildren = nextChildren || children.slice(0, index);
      }
      if (nextChildren && nextChild) {
        nextChildren.push(nextChild);
      }
    }, this);
    if (nextChildren) {
      if (!nextChildren.length) {
        return null;
      }
      return node.clone(nextChildren);
    }
    return node;
  };

  return RelayQueryTransform;
}(require('./RelayQueryVisitor'));

module.exports = RelayQueryTransform;