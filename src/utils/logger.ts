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

export const LOG_LEVEL = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  VERBOSE: 3,
  DEBUG: 4,
  SILLY: 5,
};

export function config(level) {
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
}

export function log(err) {
  console.log(err);
}
export function error(err) {
  logger.error(err);
}
export function warn(err) {
  logger.warn(err);
}
export function info(err) {
  logger.info(err);
}
export function verbose(err) {
  //noinspection TypeScriptUnresolvedFunction
  // logger.verbose(err);
  logger.debug(err);
}
export function debug(err) {
  logger.debug(err);
}
export function silly(err) {
  logger.debug(err);
}
