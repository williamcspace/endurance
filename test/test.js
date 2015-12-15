'use strict';

var child_process = require('child_process');
var client = child_process.spawn('bin/client', []);
var server = child_process.spawn('bin/server', []);
var curlRunning = false;

client.on('exit', function (code) {
  server.kill();
  if (!curlRunning) {
    return process.exit(code);
  }
});

server.on('exit', function (code) {
  client.kill();
  if (!curlRunning) {
    return process.exit(code);
  }
});

var localReady = false;
var serverReady = false;
curlRunning = false;

var runCurl = function () {
  var curl;
  curlRunning = true;
  curl        = child_process.spawn('curl', ['-v', 'http://www.baidu.com/', '-L', '--socks5-hostname', '127.0.0.1:1080']);
  curl.on('exit', function (code) {
    client.kill();
    server.kill();
    if (code === 0) {
      console.log('Test passed');
      return process.exit(0);
    } else {
      console.error('Test failed');
      return process.exit(code);
    }
  });
  curl.stdout.on('data', function (data) {
    return process.stdout.write(data);
  });
  return curl.stderr.on('data', function (data) {
    return process.stderr.write(data);
  });
};

client.stderr.on('data', function (data) {
  return process.stderr.write(data);
});

server.stderr.on('data', function (data) {
  return process.stderr.write(data);
});

client.stdout.on('data', function (data) {
  process.stdout.write(data);
  if (data.toString().indexOf('listening at') >= 0) {
    localReady = true;
    if (localReady && serverReady && !curlRunning) {
      return runCurl();
    }
  }
});

server.stdout.on('data', function (data) {
  process.stdout.write(data);
  if (data.toString().indexOf('listening at') >= 0) {
    serverReady = true;
    if (localReady && serverReady && !curlRunning) {
      return runCurl();
    }
  }
});
