'use strict';

var util = require('util');

exports.EVERYTHING = 0;
exports.DEBUG = 1;
exports.INFO = 2;
exports.WARN = 3;
exports.ERROR = 4;

var _logging_level = exports.INFO;

exports.config = function (level) {
  return _logging_level = level;
};

exports.log = function (level, msg) {
  if (level >= _logging_level) {
    if (level >= exports.DEBUG) {
      return util.log(new Date().getMilliseconds() + 'ms ' + msg);
    } else {
      return util.log(msg);
    }
  }
};

exports.debug = function (msg) {
  return exports.log(exports.DEBUG, msg);
};

exports.info = function (msg) {
  return exports.log(exports.INFO, msg);
};

exports.warn = function (msg) {
  return exports.log(exports.WARN, msg);
};

exports.error = function (msg) {
  return exports.log(exports.ERROR, (msg != null ? msg.stack : void 0) || msg);
};