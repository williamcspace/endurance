'use strict';

const net = require('net');
const fs = require('fs');
const path = require('path');
const udpRelay = require('./udprelay');
const cli = require('./utils/cli');
const logger = require('./utils/logger');
const inet = require('./utils/inet');
const Encryptor = require('./crypto/encryptor');
const _ = require('lodash');

exports.main = function main(config) {
  logger.info('Starting server...');

  const address = config.server_address;
  const port = config.server_port;
  const key = config.password;
  const method = config.method;
  const timeout = Math.floor(config.timeout * 1000) || 300000;

  logger.info('calculating ciphers for port ' + port);

  // TODO: !UDPForward
  // const udpServer = udpRelay.createServer(address, port, null, null, key, method, timeout, false);

  const server = net.createServer().listen(port, address);
  server.on('listening', function onServerListening() {
    logger.info('server listening at ' + server.address().address + ':' + server.address().port);
  });
  server.on('connection', function onServerConnection(connection) {
    let encryptor = new Encryptor(key, method);
    let stage = 0;
    let headerLength = 0;
    let remote = null;
    let cachedPieces = [];
    let addrLen = 0;
    let remoteAddr = null;
    let remotePort = null;
    let connections = 1;
    logger.debug('connections: ' + connections);

    connection.on('data', function onConnectionData(buffer) {
      logger.debug('connection on data');
      let data = buffer;

      try {
        data = encryptor.decrypt(data);
      } catch (error) {
        logger.error(error);
        if (remote) {
          remote.destroy();
        }
        if (connection) {
          connection.destroy();
        }
        return;
      }

      if (stage === 5) {
        if (!remote.write(data)) {
          connection.pause();
        }
        return;
      }

      if (stage === 0) {
        try {
          const addrtype = data[0];
          if (!addrtype) {
            return;
          }

          if (addrtype === 3) {
            addrLen = data[1];
          } else if (addrtype !== 1 && addrtype !== 4) {
            logger.error('unsupported addrtype: ' + addrtype + ' maybe wrong password');
            connection.destroy();
            return;
          }

          if (addrtype === 1) {
            remoteAddr = inet.ntoa(data.slice(1, 5));
            remotePort = data.readUInt16BE(5);
            headerLength = 7;
          } else if (addrtype === 4) {
            remoteAddr = inet.ntop(data.slice(1, 17));
            remotePort = data.readUInt16BE(17);
            headerLength = 19;
          } else {
            remoteAddr = data.slice(2, 2 + addrLen).toString('binary');
            remotePort = data.readUInt16BE(2 + addrLen);
            headerLength = 2 + addrLen + 2;
          }
          connection.pause();

          remote = net.connect(remotePort, remoteAddr, function onConnect() {
            logger.info('connecting ' + remoteAddr + ':' + remotePort);
            if (!encryptor || !remote || !connection) {
              if (remote) {
                remote.destroy();
              }
              return;
            }

            connection.resume();
            _.each(cachedPieces, function remoteWrite(piece) {
              remote.write(piece);
            });
            cachedPieces = null;
            remote.setTimeout(timeout, function onTimeout() {
              logger.debug('remote on timeout during connect()');
              if (remote) {
                remote.destroy();
              }
              if (connection) {
                connection.destroy();
              }
            });
            stage = 5;
            logger.debug('stage = 5');
          });
          remote.on('data', function onRemoteData(buffer) {
            logger.debug('remote on data');
            if (!encryptor) {
              if (remote) {
                remote.destroy();
              }
              return;
            }
            const data = encryptor.encrypt(buffer);
            if (!connection.write(data)) {
              remote.pause();
            }
          });
          remote.on('end', function onRemoteEnd() {
            logger.debug('remote on end');
            if (connection) {
              connection.end();
            }
          });
          remote.on('error', function onRemoteError(e) {
            logger.debug('remote on error');
            logger.error('remote ' + remoteAddr + ':' + remotePort + ' error: ' + e);
          });
          remote.on('close', function onRemoteClose(hadError) {
            logger.debug('remote on close:' + hadError);
            if (hadError) {
              if (connection) {
                connection.destroy();
              }
            } else {
              if (connection) {
                connection.end();
              }
            }
          });
          remote.on('drain', function onRemoteDrain() {
            logger.debug('remote on drain');
            if (connection) {
              connection.resume();
            }
          });
          remote.setTimeout(15 * 1000, function onRemoteTimeout() {
            logger.debug('remote on timeout during connect()');
            if (remote) {
              remote.destroy();
            }
            if (connection) {
              connection.destroy();
            }
          });

          if (data.length > headerLength) {
            const buf = new Buffer(data.length - headerLength);
            data.copy(buf, 0, headerLength);
            cachedPieces.push(buf);
          }

          stage = 4;
          logger.debug('stage = 4');
        } catch (error) {
          logger.error(error);
          connection.destroy();
          if (remote) {
            remote.destroy();
          }
        }
      } else {
        if (stage === 4) {
          cachedPieces.push(data);
        }
      }
    });
    connection.on('end', function onConnectionEnd() {
      logger.debug('connection on end');
      if (remote) {
        remote.end();
      }
    });
    connection.on('error', function onConnectionError(e) {
      logger.debug('connection on error');
      logger.error('local error: ' + e);
    });
    connection.on('close', function onConnectionClose(hadError) {
      logger.debug('connection on close:' + hadError);
      if (hadError) {
        if (remote) {
          remote.destroy();
        }
      } else {
        if (remote) {
          remote.end();
        }
      }

      logger.debug('clean');
      connections -= 1;
      if (remote) {
        remote.destroy();
      }
      if (connection) {
        connection.destroy();
      }
      encryptor = null;
      logger.debug('connections: ' + connections);
    });
    connection.on('drain', function onConnectionDrain() {
      logger.debug('connection on drain');
      if (remote) {
        remote.resume();
      }
    });
    connection.setTimeout(timeout, function onConnectionTimeout() {
      logger.debug('connection on timeout');
      if (remote) {
        remote.destroy();
      }
      if (connection) {
        connection.destroy();
      }
    });
  });
  server.on('error', function onServerError(err) {
    logger.error(err);
    process.stdout.on('drain', function () {
      process.exit(1);
    });
  });
  server.on('close', function onServerClose() {
    logger.info('server closed');
    // udpServer.close();
  });
};
