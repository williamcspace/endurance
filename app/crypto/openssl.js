'use strict';
const crypto = require('crypto');

function createCipher(key, iv, op) {
  const md5 = crypto.createHash('md5');
  md5.update(key);
  md5.update(iv);
  const rc4Key = md5.digest();
  if (op === 1) {
    return crypto.createCipheriv('rc4', rc4Key, '');
  }

  return crypto.createDecipheriv('rc4', rc4Key, '');
}

exports.createCipher = createCipher;
