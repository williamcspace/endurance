var chai = require('chai');
var should = chai.should();
var child_process = require('child_process');
var inet      = require('../app/utils/inet');
var util = require('util');

var IPString = '127.0.0.1';
var IPBuff = new Buffer(4,'hex');
IPBuff[0] = '127';
IPBuff[1] = '0';
IPBuff[2] = '0';
IPBuff[3] = '1';

describe('inet:aton', function() {
  it('should convert IPv4 address to network address', function() {
    var result = inet.aton(IPString);
    console.log(result);
    util.debug(result);
    result.should.be.deep.equal(IPBuff);
  });
});

describe('inet:ntoa', function() {
  it('should convert network address to IPv4 address', function() {
    var result = inet.ntoa(IPBuff);
    result.should.be.equal(IPString);
  });
});

describe('inet:ntop', function() {
  it('should convert internet address to pack address', function() {
    var result = inet.ntop(IPBuff);
    result.should.be.equal(IPString);
  });
});

describe('inet:pton', function() {
  it('should convert pack address to internet address', function() {
    var result1 = inet.pton(IPString);
    var result2 = inet.ntop(result1);
    result2.should.be.equal(IPString);
  });
});

