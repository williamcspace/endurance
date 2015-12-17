/*
 SOCKS5 UDP Request
 +----+------+------+----------+----------+----------+
 |RSV | FRAG | ATYP | DST.ADDR | DST.PORT |   DATA   |
 +----+------+------+----------+----------+----------+
 | 2  |  1   |  1   | Variable |    2     | Variable |
 +----+------+------+----------+----------+----------+

 SOCKS5 UDP Response
 +----+------+------+----------+----------+----------+
 |RSV | FRAG | ATYP | DST.ADDR | DST.PORT |   DATA   |
 +----+------+------+----------+----------+----------+
 | 2  |  1   |  1   | Variable |    2     | Variable |
 +----+------+------+----------+----------+----------+

 shadowsocks UDP Request (before encrypted)
 +------+----------+----------+----------+
 | ATYP | DST.ADDR | DST.PORT |   DATA   |
 +------+----------+----------+----------+
 |  1   | Variable |    2     | Variable |
 +------+----------+----------+----------+

 shadowsocks UDP Response (before encrypted)
 +------+----------+----------+----------+
 | ATYP | DST.ADDR | DST.PORT |   DATA   |
 +------+----------+----------+----------+
 |  1   | Variable |    2     | Variable |
 +------+----------+----------+----------+

 shadowsocks UDP Request and Response (after encrypted)
 +-------+--------------+
 |   IV  |    PAYLOAD   |
 +-------+--------------+
 | Fixed |   Variable   |
 +-------+--------------+

 HOW TO NAME THINGS
 ------------------
 `dest` means destination server, which is from DST fields in the SOCKS5 request
 `local` means local server
 `remote` means remote server
 `client` means UDP client, which is used for connecting, or the client that connects our server
 `server` means UDP server, which is used for listening, or the server for our client to connect

 */
'use strict';

const logger = require('./utils/logger');
const inet = require('./utils/inet');
const Encryptor = require('./crypto/encryptor');
const dgram = require('dgram');
const net = require('net');
const LRUCache = require('lru-cache');

var encrypt = function (password, method, data) {
  try {
    return Encryptor.encryptAll(password, method, 1, data);
  } catch (error) {
    logger.error(error);
    return null;
  }
};

var decrypt = function (password, method, data) {
  try {
    return Encryptor.encryptAll(password, method, 0, data);
  } catch (error) {
    logger.error(error);
    return null;
  }
};

var parseHeader = function (data, requestHeaderOffset) {
  try {
    var addrtype = data[requestHeaderOffset];
    if (addrtype === 3) {
      var addrLen = data[requestHeaderOffset + 1];
    } else if (addrtype !== 1 && addrtype !== 4) {
      logger.warn('unsupported addrtype: ' + addrtype);
      return null;
    }
    if (addrtype === 1) {
      var destAddr = inet.ntoa(data.slice(requestHeaderOffset + 1, requestHeaderOffset + 5));
      var destPort = data.readUInt16BE(requestHeaderOffset + 5);
      var headerLength = requestHeaderOffset + 7;
    } else if (addrtype === 4) {
      destAddr = inet.ntop(data.slice(requestHeaderOffset + 1, requestHeaderOffset + 17));
      destPort = data.readUInt16BE(requestHeaderOffset + 17);
      headerLength = requestHeaderOffset + 19;
    } else {
      destAddr = data.slice(requestHeaderOffset + 2, requestHeaderOffset + 2 + addrLen).toString('binary');
      destPort = data.readUInt16BE(requestHeaderOffset + 2 + addrLen);
      headerLength = requestHeaderOffset + 2 + addrLen + 2;
    }
    return [addrtype, destAddr, destPort, headerLength];
  } catch (error) {
    logger.error(error);
    return null;
  }
};

var getClientKey = function (localAddr, localPort, destAddr, destPort) {
  return localAddr + ':' + localPort + ':' + destAddr + ':' + destPort;
};

var getUDPTypeByIP = function (ip) {
  if (net.isIPv4(ip)) {
    return 'udp4';
  }

  if (net.isIPv6(ip)) {
    return 'udp6';
  }

  throw new Error('UDP address is invalid');
};

exports.createServer = function (listenAddr, listenPort, remoteAddr, remotePort, password, method, timeout, isLocal) {
  var udpType = getUDPTypeByIP(listenAddr);
  var clients = LRUCache({
    max: 500,
    maxAge: timeout,
    dispose: function (key, value) {
      value.close()
    }
  });

  var server = dgram.createSocket(udpType);
  server.on('message', function (msg, rinfo) {
    var requestHeaderOffset = 0;

    if (isLocal) {
      requestHeaderOffset = 3;
      var frag = msg[2];
      if (frag !== 0) {
        logger.debug('frag:' + frag);
        logger.warn('drop a message since frag is not 0');
        return;
      }
    } else {
      msg = decrypt(password, method, msg);
      if (msg == null) {
        return;
      }
    }

    var headerResult = parseHeader(msg, requestHeaderOffset);
    if (headerResult === null) {
      return;
    }

    var addrtype = headerResult[0];
    var destAddr = headerResult[1];
    var destPort = headerResult[2];
    var headerLength = headerResult[3];

    var sendDataOffset;
    var serverAddr;
    var serverPort;
    if (isLocal) {
      sendDataOffset = requestHeaderOffset;
      serverAddr = remoteAddr;
      serverPort = remotePort;
    } else {
      sendDataOffset = headerLength;
      serverAddr = destAddr;
      serverPort = destPort;
    }

    var key = getClientKey(rinfo.address, rinfo.port, destAddr, destPort);
    var client = clients.get(key);

    if (client == null) {
      //var client = createClient();

      var clientUdpType = getUDPTypeByIP(serverAddr);
      client = dgram.createSocket(clientUdpType);
      client.on('message', function (data1, rinfo1) {
        if (!isLocal) {
          logger.debug('UDP recv from ' + rinfo1.address + ':' + rinfo1.port);
          var serverIPBuf = inet.aton(rinfo1.address);
          var responseHeader = new Buffer(7);
          responseHeader.write('\x01', 0);
          serverIPBuf.copy(responseHeader, 1, 0, 4);
          responseHeader.writeUInt16BE(rinfo1.port, 5);
          var data2 = Buffer.concat([responseHeader, data1]);
          data2 = encrypt(password, method, data2);
          if (data2 == null) {
            return;
          }
        } else {
          responseHeader = new Buffer('\x00\x00\x00');
          data1 = decrypt(password, method, data1);
          if (data1 == null) {
            return;
          }
          headerResult = parseHeader(data1, 0);
          if (headerResult === null) {
            return;
          }

          var addrtype = headerResult[0];
          var destAddr = headerResult[1];
          var destPort = headerResult[2];
          var headerLength = headerResult[3];

          logger.debug('UDP recv from ' + destAddr + ':' + destPort);
          data2 = Buffer.concat([responseHeader, data1]);
        }
        server.send(data2, 0, data2.length, rinfo.port, rinfo.address, function (err, bytes) {
          logger.debug('remote to local sent');
        });
      });
      client.on('error', function (err) {
        logger.error('UDP client error: ' + err);
        client.close();
      });
      client.on('close', function () {
        logger.debug('UDP client close');
        clients.del(key);
      });
      clients.set(key, client);
    }

    logger.debug('pairs: ' + clients.length());
    var dataToSend = msg.slice(sendDataOffset, msg.length);

    if (isLocal) {
      dataToSend = encrypt(password, method, dataToSend);
      if (dataToSend == null) {
        return;
      }
    }

    logger.debug('UDP send to ' + destAddr + ':' + destPort);
    client.send(dataToSend, 0, dataToSend.length, serverPort, serverAddr, function (err, bytes) {
      logger.debug('local to remote sent');
    });
  });
  server.on('listening', function () {
    logger.info('UDP server listening to ' + server.address().address + ':' + server.address().port);
  });
  server.on('error', function (err) {
    logger.error(err);
    server.close();
  });
  server.on('close', function () {
    logger.info('UDP server closing');
    clients.reset();
  });
  server.bind(listenPort, listenAddr);
  return server;
};
