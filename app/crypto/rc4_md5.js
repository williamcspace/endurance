'use strict';
var crypto = require('crypto');

var createCipher = function (key, iv, op) {
  var md5 = crypto.createHash('md5');
  md5.update(key);
  md5.update(iv);
  var rc4_key = md5.digest();
  if (op === 1) {
    return crypto.createCipheriv('rc4', rc4_key, '');
  } else {
    return crypto.createDecipheriv('rc4', rc4_key, '');
  }
};

exports.createCipher = createCipher;

