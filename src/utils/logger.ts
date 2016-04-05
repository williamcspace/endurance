'use strict';
import * as winston from 'winston';

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

function config (level) {
  switch (level) {
    case 0:
      //noinspection TypeScriptUnresolvedVariable
      logger.level = 'error';
      break;
    case 1:
      //noinspection TypeScriptUnresolvedVariable
      logger.level = 'warn';
      break;
    case 2:
      //noinspection TypeScriptUnresolvedVariable
      logger.level = 'info';
      break;
    case 3:
      //noinspection TypeScriptUnresolvedVariable
      logger.level = 'verbose';
      break;
    case 4:
      //noinspection TypeScriptUnresolvedVariable
      logger.level = 'debug';
      break;
    case 5:
      //noinspection TypeScriptUnresolvedVariable
      logger.level = 'silly';
      break;
    default:
      //noinspection TypeScriptUnresolvedVariable
      logger.level = 'debug';
      break;
  }
};

exports.level = LOG_LEVEL;
exports.config = config;
exports.log = (err) => console.log(err);
exports.error = (err) => logger.error(err);
exports.warn = (err) => logger.warn(err);
exports.info = (err) => logger.info(err);
//noinspection TypeScriptUnresolvedFunction
exports.verbose = (err) => logger.verbose(err);
exports.debug = (err) => logger.debug(err);
exports.silly = (err) => logger.debug(err);
