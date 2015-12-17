'use strict';
const crypto = require('crypto');

function createCipher(key, iv, op) {
  let md5 = crypto.createHash('md5');
  md5.update(key);
  md5.update(iv);
  let rc4_key = md5.digest();
  if (op === 1) {
    return crypto.createCipheriv('rc4', rc4_key, '');
  } else {
    return crypto.createDecipheriv('rc4', rc4_key, '');
  }
}

exports.createCipher = createCipher;

