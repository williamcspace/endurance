var winston = require('winston');
var logger = new (winston.Logger)({
  transports: [
    new winston.transports.Console({
      level:'info',
      silent:false,
      colorize: true,
      timestamp: false,
      json:false,
      stringify:false,
      prettyPrint: false,
      depth:null,
      handleExceptions: false,
      humanReadableUnhandledException:false,
      showLevel: true,
      formatter: undefined,
      stderrLevels: ['error', 'debug']
    })
  ]
});

exports.level = { ERROR: 0, WARN: 1, INFO: 2, VERBOSE: 3, DEBUG: 4, SILLY: 5 };

exports.config = function (level) {
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

exports.log = function (err) {
  console.log(err);
};

exports.error = function (err) {
  logger.error(err);
};

exports.warn = function (err) {
  logger.warn(err);
};

exports.info = function (err) {
  logger.info(err);
};

exports.verbose = function (err) {
  logger.verbose(err);
};

exports.debug = function (err) {
  logger.debug(err);
};

exports.silly = function (err) {
  logger.debug(err);
};