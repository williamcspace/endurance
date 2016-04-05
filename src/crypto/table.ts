'use strict';
import * as crypto from 'crypto';
import * as util from 'util';
import * as mergeSort from '../utils/merge-sort';

const int32Max = Math.pow(2, 32);

// password: [encryptTable, decryptTable]
const cachedTables = {};

export function getTable(key) {
  if (cachedTables[key]) {
    return cachedTables[key];
  }
  util.log('calculating ciphers');

  let table = new Array(256);
  const decryptTable = new Array(256);
  const md5sum = crypto.createHash('md5');
  md5sum.update(key);
  //noinspection TypeScriptValidateTypes
  const hash = new Buffer(md5sum.digest(), 'binary');
  const al = hash.readUInt32LE(0);
  const ah = hash.readUInt32LE(4);

  for (let i = 0; i < 256; i++) {
    table[i] = i;
  }

  // TODO 想想怎么把callback拿出来
  for (let i = 1; i < 1024; i++) {
    table = mergeSort(table, (x, y) => {
      return ((ah % (x + i)) * int32Max + al) % (x + i) - ((ah % (y + i)) * int32Max + al) % (y + i);
    });
  }

  for (let i = 0; i < 256; i++) {
    decryptTable[table[i]] = i;
  }

  const result = [table, decryptTable];
  cachedTables[key] = result;
  return result;
};
