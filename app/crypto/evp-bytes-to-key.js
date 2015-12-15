'use strict';
var crypto  = require('crypto');

var bytes_to_key_results = {};
var EVP_BytesToKey = function (password, key_len, iv_len) {
  if (bytes_to_key_results[password + ":" + key_len + ":" + iv_len]) {
    return bytes_to_key_results[password + ":" + key_len + ":" + iv_len];
  }

  var m     = [];
  var i     = 0;
  var count = 0;
  while (count < key_len + iv_len) {
    var md5  = crypto.createHash('md5');
    var data = password;
    if (i > 0) {
      data = Buffer.concat([m[i - 1], password]);
    }
    md5.update(data);
    var d = md5.digest();
    m.push(d);
    count += d.length;
    i += 1;
  }
  var ms                         = Buffer.concat(m);
  var key                        = ms.slice(0, key_len);
  var iv                         = ms.slice(key_len, key_len + iv_len);
  bytes_to_key_results[password] = [key, iv];
  return [key, iv];
};

module.exports = EVP_BytesToKey;