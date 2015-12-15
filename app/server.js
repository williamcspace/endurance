'use strict';

var net       = require('net');
var fs        = require('fs');
var path      = require('path');
var udpRelay  = require('./udprelay');
var cli     = require('./utils/cli');
var logger    = require('./utils/logger');
var inet      = require('./utils/inet');
var Encryptor = require('./crypto/encryptor');
var _         = require('lodash');

exports.main = function (config) {
  logger.info('Starting server...');

  var address = config.server_address;
  var port    = config.server_port;
  var key     = config.password;
  var method  = config.method;
  var timeout = Math.floor(config.timeout * 1000) || 300000;

  logger.info('calculating ciphers for port ' + port);

  //TODO: !UDPForward
  //var udpServer = udpRelay.createServer(address, port, null, null, key, method, timeout, false);

  var server = net.createServer().listen(port, address);
  server.on('listening', function () {
    logger.info('server listening at ' + server.address().address + ':' + server.address().port);
  });
  server.on('connection', function (connection) {
    var connections = 1;
    logger.debug('connections: ' + connections);

    var encryptor    = new Encryptor(key, method);
    var stage        = 0;
    var headerLength = 0;
    var remote       = null;
    var cachedPieces = [];
    var addrLen      = 0;
    var remoteAddr   = null;
    var remotePort   = null;

    connection.on('data', function (data) {
      logger.debug('connection on data');
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
          var addrtype = data[0];
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
            remoteAddr   = inet.inet_ntoa(data.slice(1, 5));
            remotePort   = data.readUInt16BE(5);
            headerLength = 7;
          } else if (addrtype === 4) {
            remoteAddr   = inet.inet_ntop(data.slice(1, 17));
            remotePort   = data.readUInt16BE(17);
            headerLength = 19;
          } else {
            remoteAddr   = data.slice(2, 2 + addrLen).toString('binary');
            remotePort   = data.readUInt16BE(2 + addrLen);
            headerLength = 2 + addrLen + 2;
          }
          connection.pause();

          remote = net.connect(remotePort, remoteAddr, function () {
            logger.info('connecting ' + remoteAddr + ':' + remotePort);
            if (!encryptor || !remote || !connection) {
              if (remote) {
                remote.destroy();
              }
              return;
            }

            connection.resume();
            _.each(cachedPieces, function (piece) {
              remote.write(piece);
            });
            cachedPieces = null;
            remote.setTimeout(timeout, function () {
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
          remote.on('data', function (data) {
            logger.debug("remote on data");
            if (!encryptor) {
              if (remote) {
                remote.destroy();
              }
              return;
            }
            data = encryptor.encrypt(data);
            if (!connection.write(data)) {
              remote.pause();
            }
          });
          remote.on('end', function () {
            logger.debug("remote on end");
            if (connection) {
              connection.end();
            }
          });
          remote.on('error', function (e) {
            logger.debug("remote on error");
            logger.error("remote " + remoteAddr + ":" + remotePort + " error: " + e);
          });
          remote.on('close', function (had_error) {
            logger.debug("remote on close:" + had_error);
            if (had_error) {
              if (connection) {
                connection.destroy();
              }
            } else {
              if (connection) {
                connection.end();
              }
            }
          });
          remote.on('drain', function () {
            logger.debug("remote on drain");
            if (connection) {
              connection.resume();
            }
          });
          remote.setTimeout(15 * 1000, function () {
            logger.debug("remote on timeout during connect()");
            if (remote) {
              remote.destroy();
            }
            if (connection) {
              connection.destroy();
            }
          });

          if (data.length > headerLength) {
            var buf = new Buffer(data.length - headerLength);
            data.copy(buf, 0, headerLength);
            cachedPieces.push(buf);
            buf = null;
          }

          stage = 4;
          logger.debug("stage = 4");
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
    connection.on("end", function () {
      logger.debug("connection on end");
      if (remote) {
        remote.end();
      }
    });
    connection.on("error", function (e) {
      logger.debug("connection on error");
      logger.error("local error: " + e);
    });
    connection.on("close", function (had_error) {
      logger.debug("connection on close:" + had_error);
      if (had_error) {
        if (remote) {
          remote.destroy();
        }
      } else {
        if (remote) {
          remote.end();
        }
      }

      logger.debug("clean");
      connections -= 1;
      remote     = null;
      connection = null;
      encryptor  = null;
      logger.debug("connections: " + connections);
    });
    connection.on("drain", function () {
      logger.debug("connection on drain");
      if (remote) {
        remote.resume();
      }
    });
    connection.setTimeout(timeout, function () {
      logger.debug("connection on timeout");
      if (remote) {
        remote.destroy();
      }
      if (connection) {
        connection.destroy();
      }
    });
  });
  server.on('error', function (err) {
    logger.error(err);
    process.stdout.on('drain', function () {
      process.exit(1);
    });
  });
  server.on("close", function () {
    logger.info('server closed');
    //udpServer.close();
  });
};