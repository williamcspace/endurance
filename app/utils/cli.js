'use strict';

var pack   = require('../../package.json');
var logger = require('./logger');
var _      = require('lodash');
var fs     = require('fs');
var path   = require('path');

var printLocalHelp = function () {
  return console.log('usage: sslocal [-h] -s SERVER_ADDR -p SERVER_PORT [-b LOCAL_ADDR] -l LOCAL_PORT -k PASSWORD -m METHOD [-t TIMEOUT] [-c config]\n\noptional arguments:\n  -h, --help            show this help message and exit\n  -s SERVER_ADDR        server address\n  -p SERVER_PORT        server port\n  -b LOCAL_ADDR         local binding address, default is 127.0.0.1\n  -l LOCAL_PORT         local port\n  -k PASSWORD           password\n  -m METHOD             encryption method, for example, aes-256-cfb\n  -t TIMEOUT            timeout in seconds\n  -c CONFIG             path to config file');
};

var printServerHelp = function () {
  return console.log('usage: ssserver [-h] -s SERVER_ADDR -p SERVER_PORT -k PASSWORD -m METHOD [-t TIMEOUT] [-c config]\n\noptional arguments:\n  -h, --help            show this help message and exit\n  -s SERVER_ADDR        server address\n  -p SERVER_PORT        server port\n  -k PASSWORD           password\n  -m METHOD             encryption method, for example, aes-256-cfb\n  -t TIMEOUT            timeout in seconds\n  -c CONFIG             path to config file');
};

var dumpLog = function () {
  setInterval(function () {
    logger.debug(JSON.stringify(process.memoryUsage(), ' ', 2));
    if (global.gc) {
      logger.debug('GC');
      gc();
      logger.debug(JSON.stringify(process.memoryUsage(), ' ', 2));
      var cwd = process.cwd();
      try {
        var heapdump = require('heapdump');
        process.chdir('/tmp');
        return process.chdir(cwd);
      } catch (error) {
        return logger.debug(error);
      }
    }
  }, 1000);
};

var loadConfig = function (isServerFlag) {
  var configFromArgs = parseArgs(isServerFlag);
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

  var result = _.assign(config, configFromArgs);
  verifyConfig(result);

  return result;
};

var parseArgs = function (isServerFlag) {
  var result = {};
  var args   = process.argv;
  if (args <= 0) {
    return result;
  }

  var isServer    = isServerFlag || false;
  var nextIsValue = false;
  var lastKey     = null;
  var definition  = {
    '-l': 'local_port',
    '-p': 'server_port',
    '-s': 'server',
    '-k': 'password',
    '-c': 'config_file',
    '-m': 'method',
    '-b': 'local_address',
    '-t': 'timeout'
  };

  _.each(args, function (arg) {
    if (nextIsValue) {
      result[lastKey] = arg;
      nextIsValue     = false;
    } else if (arg in definition) {
      lastKey     = definition[arg];
      nextIsValue = true;
    } else if ('-v' === arg) {
      result['verbose'] = true;
    } else if (arg.indexOf('-') === 0) {
      (isServer) ? printServerHelp() : printLocalHelp();
      process.exit(2);
    }
  });

  return result;
};

var verifyConfig = function (config) {
  logger.info('Verifying Config File...');

  if (!(config.server_address && config.server_port && config.password && config.method)) {
    logger.warn('config.json error');
    process.exit(1);
  }

  if (config.verbose) {
    logger.config(logger.level.DEBUG);
  }

  if (config.method.toLowerCase() === 'rc4') {
    logger.warn('RC4 is not safe; please use a safer cipher, like AES-256-CFB');
  }
};

exports.version      = pack.name + ' v' + pack.version;
exports.loadConfig   = loadConfig;
exports.parseArgs    = parseArgs;
exports.verifyConfig = verifyConfig;