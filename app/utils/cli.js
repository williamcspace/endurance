'use strict';
const pack = require('../../package.json');
const logger = require('./logger');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');

function printLocalHelp() {
  return logger.log('usage: sslocal [-h] -s SERVER_ADDR -p SERVER_PORT [-b LOCAL_ADDR] -l LOCAL_PORT -k PASSWORD -m METHOD [-t TIMEOUT] [-c config]\n\noptional arguments:\n  -h, --help            show this help message and exit\n  -s SERVER_ADDR        server address\n  -p SERVER_PORT        server port\n  -b LOCAL_ADDR         local binding address, default is 127.0.0.1\n  -l LOCAL_PORT         local port\n  -k PASSWORD           password\n  -m METHOD             encryption method, for example, aes-256-cfb\n  -t TIMEOUT            timeout in seconds\n  -c CONFIG             path to config file');
}

function printServerHelp() {
  return logger.log('usage: ssserver [-h] -s SERVER_ADDR -p SERVER_PORT -k PASSWORD -m METHOD [-t TIMEOUT] [-c config]\n\noptional arguments:\n  -h, --help            show this help message and exit\n  -s SERVER_ADDR        server address\n  -p SERVER_PORT        server port\n  -k PASSWORD           password\n  -m METHOD             encryption method, for example, aes-256-cfb\n  -t TIMEOUT            timeout in seconds\n  -c CONFIG             path to config file');
}

function loadConfig(isServerFlag) {
  const configFromArgs = parseArgs(isServerFlag);
  const configFile = configFromArgs.config_file || 'config.json';
  const configPath = path.join(ROOT_PATH, configFile);

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
}

function parseArgs(isServerFlag) {
  let result = {};
  let args = process.argv;
  if (args <= 0) {
    return result;
  }

  let isServer = isServerFlag || false;
  let definition = {
    '-l': 'local_port',
    '-p': 'server_port',
    '-s': 'server',
    '-k': 'password',
    '-c': 'config_file',
    '-m': 'method',
    '-b': 'local_address',
    '-t': 'timeout'
  };

  let nextIsValue = false;
  let lastKey = null;
  _.each(args, function toJson(arg) {
    if (nextIsValue) {
      result[lastKey] = arg;
      nextIsValue = false;
    } else if (arg in definition) {
      lastKey = definition[arg];
      nextIsValue = true;
    } else if (arg === '-v') {
      result.verbose = true;
    } else if (arg.indexOf('-') === 0) {
      isServer ? printServerHelp() : printLocalHelp();
      process.exit(2);
    }
  });

  return result;
}

function verifyConfig(config) {
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
}

exports.version = pack.name + ' v' + pack.version;
exports.loadConfig = loadConfig;
exports.parseArgs = parseArgs;
exports.verifyConfig = verifyConfig;
