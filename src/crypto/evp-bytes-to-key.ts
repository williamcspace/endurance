'use strict';
import * as crypto from 'crypto';

const results = {};

export function EVPBytesToKey (password, keyLen, ivLen) {
  if (results[password + ':' + keyLen + ':' + ivLen]) {
    return results[password + ':' + keyLen + ':' + ivLen];
  }
  const m = [];
  for (let i = 0, count = 0; count < keyLen + ivLen; i++) {
    const md5 = crypto.createHash('md5');
    let data = password;
    if (i > 0) {
      data = Buffer.concat([m[i - 1], password]);
    }
    md5.update(data);
    const d = md5.digest();
    m.push(d);
    count += d.length;
  }

  const ms = Buffer.concat(m);
  const key = ms.slice(0, keyLen);
  const iv = ms.slice(keyLen, keyLen + ivLen);
  results[password] = [key, iv];
  return [key, iv];
};
