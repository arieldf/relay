/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule compileRelayQLTag
 * 
 * @format
 */

'use strict';

/**
 * Given all the metadata about a found RelayQL tag, compile it and return
 * the resulting Babel AST.
 */
function compileRelayQLTag(t, path, schemaProvider, quasi, documentName, propName, tagName, enableValidation, state) {
  try {
    var fileOpts = state.file && state.file.opts || {};
    var transformer = require('./getClassicTransformer')(schemaProvider, state.opts || {}, fileOpts);
    return transformer.transform(t, quasi, {
      documentName: documentName,
      propName: propName,
      tagName: tagName,
      enableValidation: enableValidation
    });
  } catch (error) {
    throw path.buildCodeFrameError(require('./createTransformError')(error), Error);
  }
}

module.exports = compileRelayQLTag;