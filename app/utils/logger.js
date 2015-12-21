'use strict';
const winston = require('winston');
const logger = new (winston.Logger)({
  transports: [
    new winston.transports.Console({
      level: 'info',
      silent: false,
      colorize: true,
      timestamp: false,
      json: false,
      stringify: false,
      prettyPrint: false,
      depth: null,
      handleExceptions: false,
      humanReadableUnhandledException: false,
      showLevel: true,
      formatter: undefined,
      stderrLevels: ['error', 'debug'],
    }),
  ],
});

const LOG_LEVEL = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  VERBOSE: 3,
  DEBUG: 4,
  SILLY: 5,
};

const config = (level) => {
  switch (level) {
    case 0:
      logger.level = 'error';
      break;
    case 1:
      logger.level = 'warn';
      break;
    case 2:
      logger.level = 'info';
      break;
    case 3:
      logger.level = 'verbose';
      break;
    case 4:
      logger.level = 'debug';
      break;
    case 5:
      logger.level = 'silly';
      break;
    default:
      logger.level = 'debug';
      break;
  }
};

const log = (err) => {
  console.log(err);
};

const error = (err) => {
  logger.error(err);
};

const warn = (err) => {
  logger.warn(err);
};

const info = (err) => {
  logger.info(err);
};

const verbose = (err) => {
  logger.verbose(err);
};

const debug = (err) => {
  logger.debug(err);
};

const silly = (err) => {
  logger.debug(err);
};

exports.level = LOG_LEVEL;
exports.config = config;
exports.log = log;
exports.error = error;
exports.warn = warn;
exports.info = info;
exports.verbose = verbose;
exports.debug = debug;
exports.silly = silly;
