import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import * as udpRelay from './udprelay';
import * as cli from './utils/cli';
import * as logger from './utils/logger';
import * as inet from './utils/inet';
import * as _ from 'lodash';
import Encryptor = require('./crypto/encryptor');

export function main(config) {
  logger.info('Starting server...');

  const serverAddress = config.server_address;
  const serverPort    = config.server_port;
  const password      = config.password;
  const method        = config.method;
  const timeout       = Math.floor(config.timeout * 1000) || 300000;

  logger.info('calculating ciphers for port ' + serverPort);

  // TODO: !UDPForward
  //const udpServer = udpRelay.createServer(serverAddress, serverPort, null, null, password, method, timeout, false);

  const server = net.createServer().listen(serverPort, serverAddress);
  server.on('listening', () => {
    logger.info('server listening at ' + server.address().address + ':' + server.address().port);
  });
  server.on('connection', (connection) => {
    let encryptor    = new Encryptor(password, method);
    let stage        = 0;
    let headerLength = 0;
    let remote       = null;
    let cachedPieces = [];
    let addrLen      = 0;
    let remoteAddr   = null;
    let remotePort   = null;
    let connections  = 1;
    logger.debug('connections: ' + connections);

    connection.on('data', (buffer) => {
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
            remoteAddr   = inet.ntoa(data.slice(1, 5));
            remotePort   = data.readUInt16BE(5);
            headerLength = 7;
          } else if (addrtype === 4) {
            remoteAddr   = inet.ntop(data.slice(1, 17));
            remotePort   = data.readUInt16BE(17);
            headerLength = 19;
          } else {
            remoteAddr   = data.slice(2, 2 + addrLen).toString('binary');
            remotePort   = data.readUInt16BE(2 + addrLen);
            headerLength = 2 + addrLen + 2;
          }
          connection.pause();

          remote = net.connect(remotePort, remoteAddr, () => {
            logger.info('connecting ' + remoteAddr + ':' + remotePort);
            if (!encryptor || !remote || !connection) {
              if (remote) {
                remote.destroy();
              }
              return;
            }

            connection.resume();
            _.each(cachedPieces, (piece) => {
              remote.write(piece);
            });
            cachedPieces = null;
            remote.setTimeout(timeout, () => {
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
          remote.on('data', (buffer) => {
            logger.debug('remote on data');
            if (!encryptor) {
              if (remote) {
                remote.destroy();
              }
              return;
            }
            const encryptRData = encryptor.encrypt(buffer);
            if (!connection.write(encryptRData)) {
              remote.pause();
            }
          });
          remote.on('end', () => {
            logger.debug('remote on end');
            if (connection) {
              connection.end();
            }
          });
          remote.on('error', (err) => {
            logger.debug('remote on error');
            logger.error('remote ' + remoteAddr + ':' + remotePort + ' error: ' + err);
          });
          remote.on('close', (hadErr) => {
            logger.debug('remote on close:' + hadErr);
            if (hadErr) {
              if (connection) {
                connection.destroy();
              }
            } else {
              if (connection) {
                connection.end();
              }
            }
          });
          remote.on('drain', () => {
            logger.debug('remote on drain');
            if (connection) {
              connection.resume();
            }
          });
          remote.setTimeout(15 * 1000, () => {
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
    connection.on('end', () => {
      logger.debug('connection on end');
      if (remote) {
        remote.end();
      }
    });
    connection.on('error', (err) => {
      logger.debug('connection on error');
      logger.error('local error: ' + err);
    });
    connection.on('close', (hadErr) => {
      logger.debug('connection on close:' + hadErr);
      if (hadErr) {
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
    connection.on('drain', () => {
      logger.debug('connection on drain');
      if (remote) {
        remote.resume();
      }
    });
    connection.setTimeout(timeout, () => {
      logger.debug('connection on timeout');
      if (remote) {
        remote.destroy();
      }
      if (connection) {
        connection.destroy();
      }
    });
  });
  server.on('error', (err) => {
    logger.error(err);
    process.stdout.on('drain', () => {
      process.exit(1);
    });
  });
  server.on('close', () => {
    logger.info('server closed');
    //udpServer.close();
  });
};
