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

const encrypt = (password, method, data) => {
  try {
    return Encryptor.encryptAll(password, method, 1, data);
  } catch (error) {
    logger.error(error);
    return null;
  }
};

const decrypt = (password, method, data) => {
  try {
    return Encryptor.encryptAll(password, method, 0, data);
  } catch (error) {
    logger.error(error);
    return null;
  }
};

const parseHeader = (data, requestHeaderOffset) => {
  try {
    const addrtype = data[requestHeaderOffset];

    let addrLen;
    if (addrtype === 3) {
      addrLen = data[requestHeaderOffset + 1];
    } else if (addrtype !== 1 && addrtype !== 4) {
      logger.warn('unsupported addrtype: ' + addrtype);
      return null;
    }

    let destAddr;
    let destPort;
    let headerLength;
    if (addrtype === 1) {
      destAddr = inet.ntoa(data.slice(requestHeaderOffset + 1, requestHeaderOffset + 5));
      destPort = data.readUInt16BE(requestHeaderOffset + 5);
      headerLength = requestHeaderOffset + 7;
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

const getClientKey = (localAddr, localPort, destAddr, destPort) => {
  return localAddr + ':' + localPort + ':' + destAddr + ':' + destPort;
};

const getUDPTypeByIP = (ip) => {
  if (net.isIPv4(ip)) {
    return 'udp4';
  }

  if (net.isIPv6(ip)) {
    return 'udp6';
  }

  throw new Error('UDP address is invalid');
};

const createServer = (listenAddr, listenPort, remoteAddr, remotePort, password, method, timeout, isLocal) => {
  const udpType = getUDPTypeByIP(listenAddr);
  const clients = new LRUCache({
    max: 500,
    maxAge: timeout,
    dispose: (key, value) => {
      value.close();
    },
  });

  const server = dgram.createSocket(udpType);
  server.on('message', (message, rinfo) => {
    let requestHeaderOffset = 0;

    let msg = message;
    if (isLocal) {
      requestHeaderOffset = 3;
      const frag = msg[2];
      if (frag !== 0) {
        logger.debug('frag:' + frag);
        logger.warn('drop a message since frag is not 0');
        return;
      }
    } else {
      msg = decrypt(password, method, msg);
      if (!msg) {
        return;
      }
    }

    let headerResult = parseHeader(msg, requestHeaderOffset);
    if (!headerResult) {
      return;
    }

    const addrtype = headerResult[0];
    const destAddr = headerResult[1];
    const destPort = headerResult[2];
    const headerLength = headerResult[3];

    let sendDataOffset;
    let serverAddr;
    let serverPort;
    if (isLocal) {
      sendDataOffset = requestHeaderOffset;
      serverAddr = remoteAddr;
      serverPort = remotePort;
    } else {
      sendDataOffset = headerLength;
      serverAddr = destAddr;
      serverPort = destPort;
    }

    const key = getClientKey(rinfo.address, rinfo.port, destAddr, destPort);
    let client = clients.get(key);

    if (!client) {
      const clientUdpType = getUDPTypeByIP(serverAddr);
      client = dgram.createSocket(clientUdpType);
      client.on('message', (data1, rinfo1) => {
        const serverIPBuf = inet.aton(rinfo1.address);
        let responseHeader = new Buffer(7);
        let data2 = data1;

        if (!isLocal) {
          logger.debug('UDP recv from ' + rinfo1.address + ':' + rinfo1.port);
          responseHeader.write('\x01', 0);
          serverIPBuf.copy(responseHeader, 1, 0, 4);
          responseHeader.writeUInt16BE(rinfo1.port, 5);
          data2 = Buffer.concat([responseHeader, data1]);
          data2 = encrypt(password, method, data2);
          if (!data2) {
            return;
          }
        }

        responseHeader = new Buffer('\x00\x00\x00');
        data2 = decrypt(password, method, data1);
        if (!data2) {
          return;
        }

        headerResult = parseHeader(data2, 0);
        if (!headerResult) {
          return;
        }

        const cAddrtype = headerResult[0];
        const cDestAddr = headerResult[1];
        const cDestPort = headerResult[2];
        const cHeaderLength = headerResult[3];

        logger.debug('UDP recv from ' + cDestAddr + ':' + cDestPort);
        data2 = Buffer.concat([responseHeader, data2]);

        server.send(data2, 0, data2.length, rinfo.port, rinfo.address, (err, bytes) => {
          logger.debug('remote to local sent');
        });
      });
      client.on('error', (err) => {
        logger.error('UDP client error: ' + err);
        client.close();
      });
      client.on('close', () => {
        logger.debug('UDP client close');
        clients.del(key);
      });
      clients.set(key, client);
    }

    logger.debug('pairs: ' + clients.length());
    let dataToSend = msg.slice(sendDataOffset, msg.length);

    if (isLocal) {
      dataToSend = encrypt(password, method, dataToSend);
      if (!dataToSend) {
        return;
      }
    }

    logger.debug('UDP send to ' + destAddr + ':' + destPort);
    client.send(dataToSend, 0, dataToSend.length, serverPort, serverAddr, (err, bytes) => {
      logger.debug('local to remote sent');
      logger.error('err: ' + err);
    });
  });
  server.on('listening', () => {
    logger.info('UDP server listening to ' + server.address().address + ':' + server.address().port);
  });
  server.on('error', (err) => {
    logger.error(err);
    server.close();
  });
  server.on('close', () => {
    logger.info('UDP server closing');
    clients.reset();
  });
  server.bind(listenPort, listenAddr);
  return server;
};

exports.createServer = createServer;
