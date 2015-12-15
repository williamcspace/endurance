'use strict';
var crypto  = require('crypto');
var EVP_BytesToKey = require('./evp-bytes-to-key');
var method_supported = require('./method-supported');

class Encryptor {
  constructor(key, method) {
    if (method === null) {
      throw new Error('method cannot be null!');
    }

    if (method === 'table') {
      throw new Error('method table is deprecated!');
    }

    this.key     = key;
    this.method  = method;
    this.iv_sent = false;
    this.cipher = this.getCipher(this.key, this.method, 1, crypto.randomBytes(32));
  }

  getCipherLen(method) {
    return method_supported[method.toLowerCase()];
  }

  getCipher(password, method, op, iv) {
    if (method === 'rc4-md5') {
      throw new Error('method rc4-md5 is deprecated!');
    }

    password = new Buffer(password, 'binary');
    method   = method.toLowerCase();
    var m    = this.getCipherLen(method);

    if (m == null){
      return;
    }

    var ref = EVP_BytesToKey(password, m[0], m[1]);
    var key = ref[0];
    var iv_ = ref[1];

    if (iv == null) {
      iv = iv_;
    }

    if (op === 1) {
      this.cipher_iv = iv.slice(0, m[1]);
    }

    iv = iv.slice(0, m[1]);

    if (op === 1) {
      return crypto.createCipheriv(method, key, iv);
    } else {
      return crypto.createDecipheriv(method, key, iv);
    }
  }

  encrypt(buf) {
    if (this.method == null) {
      return buf;
    }

    if (this.iv_sent) {
      return this.cipher.update(buf);
    }

    this.iv_sent = true;
    return Buffer.concat([this.cipher_iv, this.cipher.update(buf)]);
  }

  decrypt(buf) {
    if (this.method == null) {
      return buf;
    }

    if(this.decipher != null){
      return this.decipher.update(buf)
    }

    var decipher_iv_len = this.getCipherLen(this.method)[1];
    var decipher_iv     = buf.slice(0, decipher_iv_len);
    this.decipher       = this.getCipher(this.key, this.method, 0, decipher_iv);
    return this.decipher.update(buf.slice(decipher_iv_len));
  }

  static encryptAll(password, method, op, data){
    if (method === null) {
      throw new Error('method cannot be null!');
    }

    if (method === 'table') {
      throw new Error('method table is deprecated!');
    }

    if (method === 'rc4-md5') {
      throw new Error('method rc4-md5 is deprecated!');
    }

    var ref;
    var result = [];
    method     = method.toLowerCase();
    var ref1   = method_supported[method];
    var keyLen = ref1[0];
    var ivLen  = ref1[1];

    password   = Buffer(password, 'binary');
    var ref2   = EVP_BytesToKey(password, keyLen, ivLen);
    var key    = ref2[0];
    var iv_    = ref2[1];

    var iv;
    if (op === 1) {
      iv = crypto.randomBytes(ivLen);
      result.push(iv);
    } else {
      iv   = data.slice(0, ivLen);
      data = data.slice(ivLen);
    }

    var cipher;
    if (op === 1) {
      cipher = crypto.createCipheriv(method, key, iv);
    } else {
      cipher = crypto.createDecipheriv(method, key, iv);
    }

    result.push(cipher.update(data));
    result.push(cipher.final());
    return Buffer.concat(result);
  }
}

module.exports = Encryptor;