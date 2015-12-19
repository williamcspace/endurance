'use strict';
const pack = require('../../package.json');
const logger = require('./logger');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');

const printLocalHelp = () => {
  return logger.log(`\
usage: client [-h] -s SERVER_ADDR -p SERVER_PORT [-b LOCAL_ADDR] -l LOCAL_PORT -k PASSWORD -m METHOD [-t TIMEOUT] [-c config]

optional arguments:
  -h, --help            show this help message and exit
  -s SERVER_ADDR        server address
  -p SERVER_PORT        server port
  -b LOCAL_ADDR         local binding address, default is 127.0.0.1
  -l LOCAL_PORT         local port
  -k PASSWORD           password
  -m METHOD             encryption method, for example, aes-256-cfb
  -t TIMEOUT            timeout in seconds
  -c CONFIG             path to config file\
`);
};

const printServerHelp = () => {
  return logger.log(`\
usage: server [-h] -s SERVER_ADDR -p SERVER_PORT -k PASSWORD -m METHOD [-t TIMEOUT] [-c config]

optional arguments:
  -h, --help            show this help message and exit
  -s SERVER_ADDR        server address
  -p SERVER_PORT        server port
  -k PASSWORD           password
  -m METHOD             encryption method, for example, aes-256-cfb
  -t TIMEOUT            timeout in seconds
  -c CONFIG             path to config file\
`);
};

const parseArgs = (isServerFlag) => {
  const result = {};
  const args = process.argv;
  if (args <= 0) {
    return result;
  }

  const isServer = isServerFlag || false;
  const DEFINITION = {
    '-l': 'local_port',
    '-p': 'server_port',
    '-s': 'server',
    '-k': 'password',
    '-c': 'config_file',
    '-m': 'method',
    '-b': 'local_address',
    '-t': 'timeout',
  };

  let nextIsValue = false;
  let lastKey = null;
  _.each(args, (arg) => {
    if (nextIsValue) {
      result[lastKey] = arg;
      nextIsValue = false;
    } else if (arg in DEFINITION) {
      lastKey = DEFINITION[arg];
      nextIsValue = true;
    } else if (arg === '-v') {
      result.verbose = true;
    } else if (arg.indexOf('-') === 0) {
      isServer ? printServerHelp() : printLocalHelp();
      process.exit(2);
    }
  });

  return result;
};

const verifyConfig = (config) => {
  logger.info('Verifying Config File...');

  if (!(config.server_address && config.server_port && config.password && config.method)) {
    logger.warn('config.json error');
    process.exit(1);
  }

  if (config.verbose) {
    logger.config(logger.level.DEBUG);
  }

  if (config.method === 'rc4') {
    logger.warn('RC4 is not safe; please use a safer cipher, like AES-256-CFB');
  }
};

const loadConfig = (isServerFlag) => {
  const configFromArgs = parseArgs(isServerFlag);
  const configFile = configFromArgs.config_file || 'config.json';
  const configPath = path.join(global.ROOT_PATH, configFile);

  try {
    fs.accessSync(configPath);
  } catch (e) {
    logger.error('[CONFIG]: ' + e.message);
    process.exit(1);
  }

  logger.info('Loading config from ' + configPath);

  let config;
  try {
    config = JSON.parse(fs.readFileSync(configFile));
  } catch (error) {
    logger.error('[CONFIG]: ' + error.message);
    process.exit(1);
  }

  const result = _.assign(config, configFromArgs);
  if (result.method) {
    result.method = result.method.toLowerCase();
  }
  verifyConfig(result);

  return result;
};

exports.version = pack.name + ' v' + pack.version;
exports.loadConfig = loadConfig;
exports.parseArgs = parseArgs;
exports.verifyConfig = verifyConfig;
