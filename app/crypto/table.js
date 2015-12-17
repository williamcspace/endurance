'use strict';
var crypto     = require('crypto');
var util       = require('util');
var mergeSort = require('../utils/merge-sort');
var int32Max   = Math.pow(2, 32);

//password: [encryptTable, decryptTable]
var cachedTables = {};

var getTable = function (key) {
  if (cachedTables[key]) {
    return cachedTables[key];
  }
  util.log('calculating ciphers');

  var table         = new Array(256);
  var decrypt_table = new Array(256);
  var md5sum        = crypto.createHash('md5');
  md5sum.update(key);
  var hash = new Buffer(md5sum.digest(), 'binary');
  var al   = hash.readUInt32LE(0);
  var ah   = hash.readUInt32LE(4);
  var i    = 0;
  while (i < 256) {
    table[i] = i;
    i++;
  }
  i = 1;
  while (i < 1024) {
    table = mergeSort(table, function (x, y) {
      return ((ah % (x + i)) * int32Max + al) % (x + i) - ((ah % (y + i)) * int32Max + al) % (y + i);
    });
    i++;
  }
  i = 0;
  while (i < 256) {
    decrypt_table[table[i]] = i;
    ++i;
  }
  var result        = [table, decrypt_table];
  cachedTables[key] = result;
  return result;
};

exports.getTable = getTable;
