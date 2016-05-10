'use strict';

import * as crypto from 'crypto';
import {EVPBytesToKey} from './evp-bytes-to-key';
import {METHOD_SUPPORTED} from './method-supported';

function verifyMethod(method) {
  if (!method) {
    throw new Error('method cannot be null!');
  }

  if (method === 'table') {
    throw new Error('method table is deprecated!');
  }

  if (method === 'rc4-md5') {
    throw new Error('method rc4-md5 is deprecated!');
  }

  if (!METHOD_SUPPORTED[method]) {
    throw new Error('method `' + method + '` is not supported');
  }
}

function getCipherLen(method) {
  return METHOD_SUPPORTED[method];
}

export class Encryptor {
  public key;
  public method;
  public ivSent;
  public cipher;
  public cipherIv;
  public decipher;

  constructor(key, method) {
    verifyMethod(method);
    this.key = key;
    this.method = method;
    this.ivSent = false;
    this.cipher = this.getCipher(this.key, this.method, 1, crypto.randomBytes(32));
  }

  getCipher(password, method, op, iVector) {
    verifyMethod(method);
    const cipherLength = getCipherLen(method);
    const keyIv = EVPBytesToKey(new Buffer(password, 'binary'), cipherLength[0], cipherLength[1]);
    const key = keyIv[0];
    const iv_ = keyIv[1];
    let iv = iVector || iv_;
    if (op === 1) {
      this.cipherIv = iv.slice(0, cipherLength[1]);
    }
    iv = iv.slice(0, cipherLength[1]);

    //TODO: error TS2354: No best common type exists among return expressions.
    if (op === 1) {
      return <any>crypto.createCipheriv(method, key, iv);
    }
    return <any>crypto.createDecipheriv(method, key, iv);
  }

  encrypt(buf) {
    if (!this.method) {
      return buf;
    }

    if (this.ivSent) {
      return this.cipher.update(buf);
    }

    this.ivSent = true;
    return Buffer.concat([this.cipherIv, this.cipher.update(buf)]);
  }

  decrypt(buf) {
    if (!this.method) {
      return buf;
    }

    if (this.decipher) {
      return this.decipher.update(buf);
    }

    const decipherIvLen = getCipherLen(this.method)[1];
    const decipherIv = buf.slice(0, decipherIvLen);
    this.decipher = this.getCipher(this.key, this.method, 0, decipherIv);
    return this.decipher.update(buf.slice(decipherIvLen));
  }

  static encryptAll(password, method, op, data) {
    verifyMethod(method);
    const result = [];
    const ref1 = METHOD_SUPPORTED[method];
    const keyLen = ref1[0];
    const ivLen = ref1[1];
    const ref2 = EVPBytesToKey(new Buffer(password, 'binary'), keyLen, ivLen);
    const key = ref2[0];
    const iv_ = ref2[1];

    let cipher;
    let iv;
    let dateIv;
    if (op === 1) {
      iv = crypto.randomBytes(ivLen);
      result.push(iv);
      cipher = crypto.createCipheriv(method, key, iv);
    } else {
      iv = data.slice(0, ivLen);
      dateIv = data.slice(ivLen);
      cipher = crypto.createDecipheriv(method, key, iv);
    }

    result.push(cipher.update(dateIv));
    result.push(cipher.final());
    return Buffer.concat(result);
  }
}
