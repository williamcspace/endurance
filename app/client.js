'use strict';

var net       = require("net");
var fs        = require("fs");
var path      = require("path");
var udpRelay  = require("./udprelay");
var cli       = require('./utils/cli');
var logger    = require('./utils/logger');
var inet      = require('./utils/inet');
var Encryptor = require("./crypto/encryptor");
var _         = require('lodash');

var connections = 0;

var loadConfig = function (isServerFlag) {
  var configFromArgs = cli.parseArgs(isServerFlag);
  var configFile     = configFromArgs.config_file || 'config.json';
  var configPath     = path.join(ROOT_PATH, configFile);

  try {
    fs.accessSync(configPath);
  } catch (e) {
    logger.error('[CONFIG]: ' + e.message);
    process.exit(1);
  }

  logger.info('Loading config from ' + configPath);

  try {
    var config = JSON.parse(fs.readFileSync(configFile));
  } catch (error) {
    logger.error('[CONFIG]: ' + error.message);
    process.exit(1);
  }

  return _.assign(config, configFromArgs);
};

var getAddressPort = function (ip, port) {
  var aServer = ip;
  var aPort   = port;

  if (ip instanceof Array) {
    aServer = ip[Math.floor(Math.random() * serverAddr.length)];
  }

  if (port instanceof Array) {
    aPort = port[Math.floor(Math.random() * serverPort.length)];
  }

  var regex = /^([^:]*)\:(\d+)$/.exec(ip);
  if (regex != null) {
    aServer = regex[1];
    aPort   = +regex[2];
  }

  return [aServer, aPort];
};

exports.main = function (config) {
  logger.info('Starting client...');

  var serverAddress = config.server_address || '127.0.0.1';
  var serverPort    = config.server_port || '8388';
  var localAddress  = config.local_address || '127.0.0.1';
  var localPort     = config.local_port || '1080';
  var password      = config.password;
  var method        = config.method;
  var timeout       = Math.floor(config.timeout * 1000) || 300000;
  var addressPort   = getAddressPort(serverAddress, serverPort);

  //TODO: !UDPForward
  //var udpServer = udpRelay.createServer(localAddress, localPort, serverAddress, serverPort, password, method, timeout, true);

  var client = net.createServer().listen(localPort, localAddress);
  client.on('listening', function () {
    logger.info('local listening at ' + client.address().address + ':' + client.address().port);
  });
  client.on('connection', function (connection) {
    connections += 1;
    var connected    = true;
    var encryptor    = new Encryptor(password, method);
    var stage        = 0;
    var headerLength = 0;
    var remote       = null;
    var addrLen      = 0;
    var remoteAddr   = null;
    var remotePort   = null;
    var addrToSend   = '';

    logger.debug('connections: ' + connections);
    connection.on('data', function (data) {
      logger.debug('connection on data');
      if (stage === 5) {
        data = encryptor.encrypt(data);
        if (!remote.write(data)) {
          connection.pause();
        }
        return;
      }

      if (stage === 0) {
        var tempBuf = new Buffer(2);
        tempBuf.write('\u0005\u0000', 0);
        connection.write(tempBuf);
        stage = 1;
        logger.debug('stage = 1');
        return;
      }

      if (stage === 1) {
        try {
          var cmd      = data[1];
          var addrtype = data[3];
          if (cmd === 1) {
            logger.debug('cmd = 1');
          } else if (cmd === 3) {
            logger.info('UDP assc request from ' + connection.localAddress + ':' + connection.localPort);
            var reply = new Buffer(10);
            reply.write('\u0005\u0000\u0000\u0001', 0, 4, 'binary');
            logger.debug(connection.localAddress);
            inet.inet_aton(connection.localAddress).copy(reply, 4);
            reply.writeUInt16BE(connection.localPort, 8);
            connection.write(reply);
            stage = 10;
          } else {
            logger.error('unsupported cmd: ' + cmd);
            reply = new Buffer('\u0005\u0007\u0000\u0001', 'binary');
            connection.end(reply);
            return;
          }

          if (addrtype === 3) {
            addrLen = data[4];
          } else if (addrtype !== 1 && addrtype !== 4) {
            logger.error('unsupported addrtype: ' + addrtype);
            connection.destroy();
            return;
          }

          addrToSend = data.slice(3, 4).toString('binary');
          if (addrtype === 1) {
            remoteAddr   = inet.inet_ntoa(data.slice(4, 8));
            addrToSend += data.slice(4, 10).toString('binary');
            remotePort   = data.readUInt16BE(8);
            headerLength = 10;
          } else if (addrtype === 4) {
            remoteAddr   = inet.inet_ntop(data.slice(4, 20));
            addrToSend += data.slice(4, 22).toString('binary');
            remotePort   = data.readUInt16BE(20);
            headerLength = 22;
          } else {
            remoteAddr   = data.slice(5, 5 + addrLen).toString('binary');
            addrToSend += data.slice(4, 5 + addrLen + 2).toString('binary');
            remotePort   = data.readUInt16BE(5 + addrLen);
            headerLength = 5 + addrLen + 2;
          }
          if (cmd === 3) {
            logger.info('UDP assc: ' + remoteAddr + ':' + remotePort);
            return;
          }
          var buf = new Buffer(10);
          buf.write('\u0005\u0000\u0000\u0001', 0, 4, 'binary');
          buf.write('\u0000\u0000\u0000\u0000', 4, 4, 'binary');
          buf.writeInt16BE(2222, 8);
          connection.write(buf);

          logger.info('connecting ' + addressPort[0] + ':' + addressPort[1]);
          remote = net.connect(addressPort[1], addressPort[0], function () {
            if (remote) {
              remote.setNoDelay(true);
            }
            stage = 5;
            logger.debug('stage = 5');
          });
          remote.on('data', function (data) {
            if (!connected) {
              return;
            }
            logger.debug("remote on data");
            try {
              if (encryptor) {
                data = encryptor.decrypt(data);
                if (!connection.write(data)) {
                  remote.pause();
                }
              } else {
                remote.destroy();
              }
            } catch (error) {
              logger.error(error);
              if (remote) {
                remote.destroy();
              }
              if (connection) {
                connection.destroy();
              }
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
            logger.debug('remote on close:' + had_error);
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
            logger.debug('remote on drain');
            if (connection) {
              connection.resume();
            }
          });
          remote.setTimeout(timeout, function () {
            logger.debug("remote on timeout");
            if (remote) {
              remote.destroy();
            }
            if (connection) {
              connection.destroy();
            }
          });

          var addrToSendBuf = new Buffer(addrToSend, 'binary');
          addrToSendBuf     = encryptor.encrypt(addrToSendBuf);
          remote.setNoDelay(false);
          remote.write(addrToSendBuf);
          if (data.length > headerLength) {
            buf = new Buffer(data.length - headerLength);
            data.copy(buf, 0, headerLength);
            var piece = encryptor.encrypt(buf);
            remote.write(piece);
          }
          stage = 4;
          return logger.debug('stage = 4');
        } catch (error) {
          logger.error(error);
          if (connection) {
            connection.destroy();
          }
          if (remote) {
            remote.destroy();
          }
          logger.debug('clean');
          connections -= 1;
          remote     = null;
          connection = null;
          encryptor  = null;
          logger.debug('connections: ' + connections);
          logger.debug('connections: ' + connections);
        }
      } else if (stage === 4) {
        if (remote == null) {
          if (connection) {
            connection.destroy();
          }
          return;
        }
        data = encryptor.encrypt(data);
        remote.setNoDelay(true);
        if (!remote.write(data)) {
          connection.pause();
        }
      }
    });
    connection.on('end', function () {
      connected = false;
      logger.debug('connection on end');
      if (remote) {
        remote.end();
      }
    });
    connection.on('error', function (e) {
      logger.debug('connection on error');
      logger.error('local error: ' + e);
    });
    connection.on('close', function (had_error) {
      connected = false;
      logger.debug('connection on close:' + had_error);
      if (had_error) {
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
      remote     = null;
      connection = null;
      encryptor  = null;
      logger.debug('connections: ' + connections);
    });
    connection.on('drain', function () {
      logger.debug('connection on drain');
      if (remote && stage === 5) {
        remote.resume();
      }
    });
    connection.setTimeout(timeout, function () {
      logger.debug('connection on timeout');
      if (remote) {
        remote.destroy();
      }
      if (connection) {
        connection.destroy();
      }
    });
  });
  client.on('error', function (err) {
    logger.error(err);
    process.stdout.on('drain', function () {
      process.exit(1);
    });
  });
  client.on('close', function () {
    logger.info('client closed');
    //udpServer.close();
  });
};