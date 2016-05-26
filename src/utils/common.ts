export function str2Uint8(str) {
  let arr, i, j, ref;
  arr = new Uint8Array(str.length);
  for (i = j = 0, ref = str.length; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
    arr[i] = str.charCodeAt(i);
  }
  return arr;
}

export function uint82Str(uint8) {
  return String.fromCharCode.apply(String, uint8);
}

export function typedIndexOf(typedArray, searchElement, fromIndex) {
  let element, index, j, len1;
  if (fromIndex == null) {
    fromIndex = 0;
  }
  for (index = j = 0, len1 = typedArray.length; j < len1; index = ++j) {
    element = typedArray[index];
    if (element === searchElement && index >= fromIndex) {
      return index;
    }
  }
  return -1;
}

export function typedArrayCpy(dst, src, dstStart, srcStart?, dstEnd?, srcEnd?) {
  let i, j, len, ref, ref1;
  if (dstStart == null) {
    dstStart = 0;
  }
  if (srcStart == null) {
    srcStart = 0;
  }
  if (dstEnd == null) {
    dstEnd = dst.length;
  }
  if (srcEnd == null) {
    srcEnd = src.length;
  }
  len = Math.min(srcEnd - srcStart, dstEnd - dstStart);
  for (i = j = ref = dstStart, ref1 = dstStart + len; ref <= ref1 ? j < ref1 : j > ref1; i = ref <= ref1 ? ++j : --j) {
    dst[i] = src[srcStart + i - dstStart];
  }
  return len;
}

export function bytes2FixedHexString() {
  let byte, bytes;
  bytes = 1 <= arguments.length ? [].slice.call(arguments, 0) : [];
  return ((function() {
    let j, len1, results;
    results = [];
    for (j = 0, len1 = bytes.length; j < len1; j++) {
      byte = bytes[j];
      results.push((byte < 16 ? '0' : '') + byte.toString(16));
    }
    return results;
  })()).join('');
}

export function inet_ntop(family, array) {
  let i;
  if (family === 0x01 && array.length === 4) {
    return ((function() {
      let j, len1, results;
      results = [];
      for (j = 0, len1 = array.length; j < len1; j++) {
        i = array[j];
        results.push(i);
      }
      return results;
    })()).join('.');
  } else if (family === 0x04 && array.length === 16) {
    return ((function() {
      let j, results;
      results = [];
      for (i = j = 0; j < 16; i = j += 2) {
        results.push(bytes2FixedHexString(array[i], array[i + 1]));
      }
      return results;
    })()).join(':');
  } else {
    return console.error('Not a valid family.');
  }
}

export function inet_pton(family, str) {
  let byte, bytes, grp, i, j, k, len1, newaddr, ref, twoBytes, v4arr, v6like;
  if (family === 0x01) {
    return (function() {
      let j, len1, ref, results;
      ref = str.split('.');
      results = [];
      for (j = 0, len1 = ref.length; j < len1; j++) {
        byte = ref[j];
        results.push(parseInt(byte));
      }
      return results;
    })();
  } else if (family === 0x04) {
    if (str.indexOf('.') >= 0) {
      v4arr = inet_pton(0x01, str.slice(str.lastIndexOf(':') + 1));
      v6like = ((function() {
        let j, results;
        results = [];
        for (i = j = 0; j < 4; i = j += 2) {
          results.push(bytes2FixedHexString(v4arr[i], v4arr[i + 1]));
        }
        return results;
      })()).join(':');
      newaddr = str.slice(0, str.lastIndexOf(':') + 1) + v6like;
      return inet_pton(family, newaddr);
    }
    bytes = [];
    grp = str.split(':');
    if (grp[0] === '') {
      grp.shift();
    }
    if (grp[grp.length - 1] === '') {
      grp.pop();
    }
    for (j = 0, len1 = grp.length; j < len1; j++) {
      twoBytes = grp[j];
      if (twoBytes === '') {
        for (i = k = 0, ref = 16 - (grp.length - 1) * 2; 0 <= ref ? k < ref : k > ref; i = 0 <= ref ? ++k : --k) {
          bytes.push(0);
        }
      } else {
        bytes.push(parseInt(twoBytes.slice(0, 2), 16));
        bytes.push(parseInt(twoBytes.slice(2, 4), 16));
      }
    }
    return bytes;
  } else {
    return console.error('Not a valid family.');
  }
}

export const regExpIPv4 = /((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])/;
export const regExpIPv6 = /(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))/;

export function guessFamily(str) {
  if (regExpIPv4.test(str)) {
    return 0x01;
  } else if (regExpIPv6.test(str)) {
    return 0x04;
  } else {
    return 0x03;
  }
}

export function parseHeader(data) {
  let dst, len, port, prt;
  switch (data[3]) {
    case 0x01:
      dst = inet_ntop(data[3], data.subarray(4, -2));
      break;
    case 0x03:
      if (data.length > 2 + 6) {
        len = data[4];
        dst = uint82Str(data.subarray(5, len + 5));
      } else {
        console.warn('Header is too short.');
        return null;
      }
      break;
    case 0x04:
      dst = inet_ntop(data[3], data.subarray(4, -2));
      break;
    default:
      console.error('Not a valid ATYP.');
      return null;
  }
  prt = data.subarray(-2);
  port = prt[0] << 8 | prt[1];
  return {
    ver: data[0],
    cmd: data[1],
    rsv: data[2],
    atyp: data[3],
    dst: dst,
    port: port
  };
}

export function packHeader(rep, atyp, addr, port) {
  let arr, bindAddr, index, len;
  if (atyp == null) {
    atyp = 0x80;
  }
  switch (atyp) {
    case 0x01:
      len = 10;
      break;
    case 0x03:
      len = 7 + addr.length;
      break;
    case 0x04:
      len = 22;
      break;
    case 0x80:
      return packHeader(rep, guessFamily(addr), addr, port);
    default:
      return console.error('Not a valid ATYP.');
  }
  index = 0;
  arr = new Uint8Array(len);
  arr[index++] = 0x05;
  arr[index++] = rep;
  arr[index++] = 0x00;
  arr[index++] = atyp;
  if (atyp === 0x03) {
    arr[index++] = addr.length;
  }
  if (atyp === 0x01 || atyp === 0x04) {
    bindAddr = inet_pton(atyp, addr);
  } else {
    bindAddr = str2Uint8(addr);
  }
  index += typedArrayCpy(arr, bindAddr, index);
  arr[index++] = (port & 0xff00) >> 8;
  arr[index++] = port & 0xff;
  console.assert(index === len);
  return arr;
}

export function test() {
  let arr1, arr2, array_equals, testHeader;
  array_equals = function(arr1, arr2) {
    let i, j, ref;
    if (arr1.length !== arr2.length) {
      return false;
    }
    for (i = j = 0, ref = arr1.length; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
      if (arr1[i] !== arr2[i]) {
        return false;
      }
    }
    return true;
  };
  console.assert(array_equals(str2Uint8('h.w'), new Uint8Array([104, 46, 119])));
  console.assert(uint82Str(new Uint8Array([104, 46, 119])) === 'h.w');
  console.assert(typedIndexOf(new Uint8Array([0xa1, 0x35, 0xc0, 0x35]), 0x35, 1) === 1);
  console.assert(typedIndexOf(new Uint8Array([0xa1, 0x35, 0xc0, 0x35]), 0x35, 2) === 3);
  arr1 = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  arr2 = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  console.assert(typedArrayCpy(arr1, arr2, 4, 8, 6, 12) === 2);
  console.assert(array_equals(arr1, new Uint8Array([0, 1, 2, 3, 8, 9, 6, 7, 8, 9, 10, 11, 12])));
  console.assert(bytes2FixedHexString(0xff, 0x00) === 'ff00');
  console.assert(inet_ntop(0x01, new Uint8Array([0xcb, 0xd0, 0x29, 0x91])) === '203.208.41.145');
  console.assert(inet_ntop(0x04, new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd, 0xef, 0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd, 0xef])) === '1234:5678:90ab:cdef:1234:5678:90ab:cdef');
  console.assert(array_equals(inet_pton(0x01, '203.208.41.145'), [0xcb, 0xd0, 0x29, 0x91]));
  console.assert(array_equals(inet_pton(0x04, '1234:5678:90ab:cdef:1234:5678:90ab:cdef'), [0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd, 0xef, 0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd, 0xef]));
  console.assert(array_equals(inet_pton(0x04, '1234::5678:203.208.41.145'), [0x12, 0x34, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x56, 0x78, 0xcb, 0xd0, 0x29, 0x91]));
  console.assert(array_equals(inet_pton(0x04, '1234::5678'), [0x12, 0x34, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x56, 0x78]));
  console.assert(array_equals(inet_pton(0x04, '::1234:5678'), [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x12, 0x34, 0x56, 0x78]));
  console.assert(array_equals(inet_pton(0x04, '1234:5678::'), [0x12, 0x34, 0x56, 0x78, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
  console.assert(guessFamily('192.168.1.0') === 0x01);
  console.assert(guessFamily('www.google.com') === 0x03);
  console.assert(guessFamily('1234::5678') === 0x04);
  console.assert(guessFamily('::1234:5678') === 0x04);
  console.assert(guessFamily('1234:5678::') === 0x04);
  console.assert(guessFamily('1234:5678:90ab:cdef:1234:5678:90ab:cdef') === 0x04);
  testHeader = parseHeader(new Uint8Array([0x05, 0x01, 0x00, 0x01, 0xcb, 0xd0, 0x29, 0x91, 0x01, 0xbb]));
  console.assert(testHeader.atyp === 0x01 && testHeader.dst === '203.208.41.145' && testHeader.port === 443);
  testHeader = parseHeader(new Uint8Array([0x05, 0x01, 0x00, 0x03, 0x03, 0x68, 0x2e, 0x77, 0x00, 0x50]));
  console.assert(testHeader.atyp === 0x03 && testHeader.dst === 'h.w' && testHeader.port === 80);
  testHeader = parseHeader(new Uint8Array([0x05, 0x01, 0x00, 0x04, 0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd, 0xef, 0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd, 0xef, 0x1f, 0x90]));
  console.assert(testHeader.ver = 0x05 && (testHeader.cmd = 0x01 && testHeader.atyp === 0x04 && testHeader.dst === '1234:5678:90ab:cdef:1234:5678:90ab:cdef' && testHeader.port === 8080));
  testHeader = packHeader(0x00, 0x01, '203.208.41.145', 443);
  console.assert(array_equals(testHeader, new Uint8Array([0x05, 0x00, 0x00, 0x01, 0xcb, 0xd0, 0x29, 0x91, 0x01, 0xbb])));
  testHeader = packHeader(0x00, 0x03, 'h.w', 80);
  console.assert(array_equals(testHeader, new Uint8Array([0x05, 0x00, 0x00, 0x03, 0x03, 0x68, 0x2e, 0x77, 0x00, 0x50])));
  testHeader = packHeader(0x00, 0x04, '1234::5678', 8080);
  console.assert(array_equals(testHeader, new Uint8Array([0x05, 0x00, 0x00, 0x04, 0x12, 0x34, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x56, 0x78, 0x1f, 0x90])));
  testHeader = packHeader(0x00, 0x80, '203.208.41.145', 443);
  console.assert(array_equals(testHeader, new Uint8Array([0x05, 0x00, 0x00, 0x01, 0xcb, 0xd0, 0x29, 0x91, 0x01, 0xbb])));
  testHeader = packHeader(0x00, null, 'h.w', 80);
  console.assert(array_equals(testHeader, new Uint8Array([0x05, 0x00, 0x00, 0x03, 0x03, 0x68, 0x2e, 0x77, 0x00, 0x50])));
  testHeader = packHeader(0x00, null, '1234::5678', 8080);
  console.assert(array_equals(testHeader, new Uint8Array([0x05, 0x00, 0x00, 0x04, 0x12, 0x34, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x56, 0x78, 0x1f, 0x90])));
  return console.log('All test passed!');
}
