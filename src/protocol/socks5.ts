// const socks5 = {
//   SVERSION: '0x05',
//   CONNECT: '0x01',
//   IPV4: '0x01',
//   DOMAIN: '0x03',
//   IPV6: '0x04',
//   CMD_NOT_SUPPORTED: '0x07',
// };
//
// const local_request = {
// 		idVer   = 0
// 		idCmd   = 1
// 		idType  = 3 // address type index
// 		idIP0   = 4 // ip addres start index
// 		idDmLen = 4 // domain address length index
// 		idDm0   = 5 // domain address start index
//
// 		typeIPv4 = 1 // type is ipv4 address
// 		typeDm   = 3 // type is domain address
// 		typeIPv6 = 4 // type is ipv6 address
//
// 		lenIPv4   = 3 + 1 + net.IPv4len + 2 // 3(ver+cmd+rsv) + 1addrType + ipv4 + 2port
// 		lenIPv6   = 3 + 1 + net.IPv6len + 2 // 3(ver+cmd+rsv) + 1addrType + ipv6 + 2port
// 		lenDmBase = 3 + 1 + 1 + 2           // 3 + 1addrType + 1addrLen + 2port, plus addrLen
// }
//
// const server_request = {
// 		idType  = 0 // address type index
// 		idIP0   = 1 // ip addres start index
// 		idDmLen = 1 // domain address length index
// 		idDm0   = 2 // domain address start index
//
// 		typeIPv4 = 1 // type is ipv4 address
// 		typeDm   = 3 // type is domain address
// 		typeIPv6 = 4 // type is ipv6 address
//
// 		lenIPv4   = 1 + net.IPv4len + 2 // 1addrType + ipv4 + 2port
// 		lenIPv6   = 1 + net.IPv6len + 2 // 1addrType + ipv6 + 2port
// 		lenDmBase = 1 + 1 + 2           // 1addrType + 1addrLen + 2port, plus addrLen
// }
	// version identification and method selection message in theory can have
	// at most 256 methods, plus version and nmethod field in total 258 bytes
	// the current rfc defines only 3 authentication methods (plus 2 reserved),
	// so it won't be such long in practice

  // buf size should at least have the same size with the largest possible
	// request size (when addrType is 3, domain name has at most 256 bytes)
	// 1(addrType) + 1(lenByte) + 256(max length address) + 2(port) = 260

  // Return string for typeIP is not most efficient, but browsers (Chrome,
	// Safari, Firefox) all seems using typeDm exclusively. So this is not a
	// big problem.

import {Encryptor} from '../crypto/encryptor';

export class SOCKS5 {
  tcp_socket_info;
  udp_socket_info;
  socket_server_id;
  server;
  server_port;
  password;
  method;
  local_port;
  timeout;

  constructor(config) {
    if (config == null) {
      config = {};
    }
    this.tcp_socket_info = {};
    this.udp_socket_info = {};
    this.socket_server_id = null;
    this.server = config.server;
    this.server_port = config.server_port;
    this.password = config.password;
    this.method = config.method;
    this.local_port = config.local_port;
    this.timeout = config.timeout;
  }

  handle_accept(info){
    var clientSocketId, socketId;
    socketId = info.socketId, clientSocketId = info.clientSocketId;
    if (socketId !== this.socket_server_id) {
      return;
    }
    this.tcp_socket_info[clientSocketId] = {
      type: 'local',
      status: 'auth',
      cipher: new Encryptor(this.password, this.method),
      socket_id: clientSocketId,
      cipher_action: 'encrypt',
      peer_socket_id: null,
      last_connection: Date.now()
    };
  }
  handle_recv(info){
    var array, data, socketId;
    socketId = info.socketId, data = info.data;
    if (!(socketId in this.tcp_socket_info)) {
      console._info('Unknown or closed TCP socket: ' + socketId);
      return this.close_socket(socketId, false, 'tcp');
    }
    console._verbose('TCP socket ' + socketId + ': data received.');
    array = new Uint8Array(data);
    switch (this.tcp_socket_info[socketId].status) {
      case 'cmd':
        return this.cmd(socketId, array);
      case 'auth':
        return this.auth(socketId, array);
      case 'tcp_relay':
        return this.tcp_relay(socketId, array);
      case 'udp_relay':
        return console._info('Unexcepted TCP packet received when relaying udp:', array);
      default:
        return console._warn('FSM: Not a valid state for ' + socketId + ': ' + this.tcp_socket_info[socketId].status + '.');
    }
  }
  handle_udp_recv(info){
    var data, remoteAddress, remotePort, socketId;
    socketId = info.socketId, data = info.data, remoteAddress = info.remoteAddress, remotePort = info.remotePort;
    if (!(socketId in this.udp_socket_info)) {
      console._info('Unknown or closed UDP socket: ' + socketId);
      return this.close_socket(socketId, false, 'udp');
    }
    console._verbose('UDP socket ' + socketId + ': data received.');
    return this.udp_relay(socketId, new Uint8Array(data), remoteAddress, remotePort);
  }
  handle_accepterr(info){
    var resultCode, socketId;
    socketId = info.socketId, resultCode = info.resultCode;
    return console._warn('Accepting on server socket ' + socketId + ' occurs accept error ' + resultCode);
  }

  handle_recverr(info){
    var resultCode, socketId;
    socketId = info.socketId, resultCode = info.resultCode;
    if (resultCode !== -100) {
      console._info('TCP socket ' + socketId + ' occurs receive error ' + resultCode);
    }
    return this.close_socket(socketId);
  }

  handle_udp_recverr(info){
    var resultCode, socketId;
    socketId = info.socketId, resultCode = info.resultCode;
    console._info('UDP socket ' + socketId + ' occurs receive error ' + resultCode);
    if (socketId in this.udp_socket_info) {
      return this.close_socket(this.udp_socket_info[socketId].host_tcp_id);
    } else {
      return this.close_socket(socketId, false, 'udp');
    }
  }
  config(config){
    this.server = config.server;
    this.server_port = config.server_port;
    this.password = config.password;
    this.method = config.method;
    this.local_port = config.local_port;
    this.timeout = config.timeout;
    return config;
  }
  listen(callback){
    return chrome.sockets.tcpServer.create({}, (function(_this) {
      return function(createInfo) {
        _this.socket_server_id = createInfo.socketId;
        return chrome.sockets.tcpServer.listen(_this.socket_server_id, '0.0.0.0', _this.local_port | 0, function(result) {
          if (result < 0 || chrome.runtime.lastError) {
            console.error('Listen on port ' + _this.local_port + ' failed:', chrome.runtime.lastError.message);
            chrome.sockets.tcpServer.close(_this.socket_server_id);
            _this.socket_server_id = null;
            callback.call(null, ('Listen on port ' + _this.local_port + ' failed:') + chrome.runtime.lastError.message);
            return;
          }
          console.info('Listening on port ' + _this.local_port + '...');
          chrome.sockets.tcpServer.onAccept.addListener(_this.accept_handler = function(info) {
            return _this.handle_accept(info);
          });
          chrome.sockets.tcpServer.onAcceptError.addListener(_this.accepterr_handler = function(info) {
            return _this.handle_accepterr(info);
          });
          chrome.sockets.tcp.onReceive.addListener(_this.recv_handler = function(info) {
            return _this.handle_recv(info);
          });
          chrome.sockets.tcp.onReceiveError.addListener(_this.recverr_handler = function(info) {
            return _this.handle_recverr(info);
          });
          chrome.sockets.udp.onReceive.addListener(_this.udp_recv_handler = function(info) {
            return _this.handle_udp_recv(info);
          });
          chrome.sockets.udp.onReceiveError.addListener(_this.udp_recverr_handler = function(info) {
            return _this.handle_udp_recverr(info);
          });
          _this.sweep_task_id = setInterval(function() {
            return _this.sweep_socket();
          }, _this.timeout * 1000);
          return callback.call(null, 'Listening on port ' + _this.local_port + '...');
        });
      };
    })(this));
  }

  terminate(callback){
    console.info('Terminating server...');
    chrome.sockets.tcpServer.onAccept.removeListener(this.accept_handler);
    chrome.sockets.tcpServer.onAcceptError.removeListener(this.accepterr_handler);
    chrome.sockets.tcp.onReceive.removeListener(this.recv_handler);
    chrome.sockets.tcp.onReceiveError.removeListener(this.recverr_handler);
    chrome.sockets.udp.onReceive.removeListener(this.udp_recv_handler);
    chrome.sockets.udp.onReceiveError.removeListener(this.udp_recverr_handler);
    if (!this.socket_server_id) {
      callback.call(null, 'Server had been terminated');
      return console.info('Server had been terminated');
    }
    return chrome.sockets.tcpServer.close(this.socket_server_id, (function(_this) {
      return function() {
        var socket_id;
        _this.socket_server_id = null;
        clearInterval(_this.sweep_task_id);
        for (socket_id in _this.tcp_socket_info) {
          _this.close_socket(socket_id, false, 'tcp');
        }
        for (socket_id in _this.udp_socket_info) {
          _this.close_socket(socket_id, false, 'udp');
        }
        callback.call(null, 'Server has been terminated');
        return console.info('Server has been terminated');
      };
    })(this));
  }
  auth(socket_id, data) {
    console.log('Start processing auth procedure');
    if (data[0] !== 0x05) {
      this.close_socket(socket_id);
      console._warn('Not a valid SOCKS5 auth packet, closed.');
      return;
    }
    if (Common.typedIndexOf(data, 0x00, 2) === -1) {
      console._warn('Client doesn't support no authentication.');
      chrome.sockets.tcp.send(socket_id, new Uint8Array([0x05, 0xFF]).buffer, (function(_this) {
        return function() {
          return _this.close_socket(socket_id);
        };
      })(this));
      return;
    }
    return chrome.sockets.tcp.send(socket_id, new Uint8Array([0x05, 0x00]).buffer, (function(_this) {
      return function(sendInfo) {
        if (!sendInfo || sendInfo.resultCode < 0 || chrome.runtime.lastError) {
          console._error('Failed to send choice no authentication method to client:', chrome.runtime.lastError.message);
          _this.close_socket(socket_id, false, 'tcp');
          return;
        }
        _this.tcp_socket_info[socket_id].status = 'cmd';
        _this.tcp_socket_info[socket_id].last_connection = Date.now();
        return console.log('SOCKS5 auth passed');
      };
    })(this));
  }
  cmd(socket_id, data) {
    var header, reply;
    if (data[0] !== 0x05 || data[2] !== 0x00) {
      console._warn('Not a valid SOCKS5 cmd packet.');
      this.close_socket(socket_id);
      return;
    }
    header = Common.parseHeader(data);
    switch (header.cmd) {
      case 0x01:
        this.cmd_connect(socket_id, header, data);
        break;
      case 0x02:
        this.cmd_bind(socket_id, header, data);
        break;
      case 0x03:
        this.cmd_udpassoc(socket_id, header, data);
        break;
      default:
        reply = Common.packHeader(0x07, 0x01, '0.0.0.0', 0);
        chrome.sockets.tcp.send(socket_id, reply.buffer, (function(_this) {
          return function() {
            return _this.close_socket(socket_id);
          };
        })(this));
        console._warn('Not a valid CMD field.');
    }
    return this.tcp_socket_info[socket_id].last_connection = Date.now();
  }
  cmd_connect(socket_id, header, origin_data) {
    console.log('Start processing connect command');
    if (!(socket_id in this.tcp_socket_info)) {
      return;
    }
    return chrome.sockets.tcp.create({
      name: 'remote_socket'
    }, (function(_this) {
      return function(createInfo) {
        _this.tcp_socket_info[socket_id].peer_socket_id = createInfo.socketId;
        console._verbose('TCP socket to remote server created on ' + createInfo.socketId);
        return chrome.sockets.tcp.connect(createInfo.socketId, _this.server, _this.server_port | 0, function(result) {
          var data, error_reply;
          error_reply = Common.packHeader(0x01, 0x01, '0.0.0.0', 0);
          if (result < 0 || chrome.runtime.lastError) {
            console._error('Failed to connect to shadowsocks server:', chrome.runtime.lastError.message);
            chrome.sockets.tcp.send(socket_id, error_reply.buffer, function() {
              _this.close_socket(socket_id);
              return _this.close_socket(createInfo.socketId);
            });
            return;
          }
          console._verbose('TCP socket ' + createInfo.socketId + ' to remote server connection established');
          _this.tcp_socket_info[createInfo.socketId] = {
            type: 'remote',
            status: 'tcp_relay',
            cipher: _this.tcp_socket_info[socket_id].cipher,
            socket_id: createInfo.socketId,
            peer_socket_id: socket_id,
            cipher_action: 'decrypt',
            last_connection: Date.now()
          };
          data = _this.tcp_socket_info[socket_id].cipher.encrypt(new Uint8Array(origin_data.subarray(3)));
          return chrome.sockets.tcp.send(createInfo.socketId, data.buffer, function(sendInfo) {
            if (!sendInfo || sendInfo.resultCode < 0 || chrome.runtime.lastError) {
              console._error('Failed to send encrypted request to shadowsocks server:', chrome.runtime.lastError.message);
              chrome.sockets.tcp.send(socket_id, error_reply.buffer, function() {
                return _this.close_socket(socket_id);
              });
              return;
            }
            console._verbose('TCP relay request had been sent to remote server');
            data = Common.packHeader(0x00, 0x01, '0.0.0.0', 0);
            return chrome.sockets.tcp.send(socket_id, data.buffer, function(sendInfo) {
              if (!sendInfo || sendInfo.resultCode < 0 || chrome.runtime.lastError) {
                console._error('Failed to send connect success reply to client:', chrome.runtime.lastError.message);
                _this.close_socket(socket_id);
                return;
              }
              _this.tcp_socket_info[socket_id].status = 'tcp_relay';
              return console.log('SOCKS5 connect okay');
            });
          });
        });
      };
    })(this));
  }
  cmd_bind(socket_id, header, origin_data) {
    var data;
    console._warn('CMD BIND is not implemented in shadowsocks.');
    data = Common.packHeader(0x07, 0x01, '0.0.0.0', 0);
    return chrome.sockets.tcp.send(socket_id, data.buffer, (function(_this) {
      return function() {
        return _this.close_socket(socket_id);
      };
    })(this));
  }
  cmd_udpassoc(socket_id, header, origin_data) {
    console.log('Udp associated request on socket ' + socket_id);
    if (!(socket_id in this.tcp_socket_info)) {
      return;
    }
    return chrome.sockets.udp.create({
      name: 'local_socket'
    }, (function(_this) {
      return function(socketInfo) {
        var socketId;
        socketId = socketInfo.socketId;
        _this.udp_socket_info[socketId] = {
          type: 'local',
          socket_id: socketId,
          host_tcp_id: socket_id,
          peer_socket_id: null,
          last_connection: Date.now()
        };
        return chrome.sockets.udp.bind(socketId, '127.0.0.1', 0, function(result) {
          if (result < 0 || chrome.runtime.lastError) {
            console._error('Failed to bind local UDP socket to free port', chrome.runtime.lastError.message);
            _this.close_socket(socketId, false, 'udp');
            _this.close_socket(socket_id, false, 'tcp');
            return;
          }
          console._verbose('UDP local-side socket created and bound');
          return chrome.sockets.udp.create({
            name: 'remote_socket'
          }, function(socketInfo) {
            _this.udp_socket_info[socketId].peer_socket_id = socketInfo.socketId;
            _this.udp_socket_info[socketInfo.socketId] = {
              type: 'remote',
              socket_id: socketInfo.socketId,
              host_tcp_id: socket_id,
              peer_socket_id: socketId,
              last_connection: Date.now()
            };
            return chrome.sockets.udp.bind(socketInfo.socketId, '0.0.0.0', 0, function(result) {
              if (result < 0 || chrome.runtime.lastError) {
                console._error('Failed to bind remote UDP socket to free port', chrome.runtime.lastError.message);
                _this.close_socket(socket_id, false, 'tcp');
                _this.close_socket(socketInfo.socketId, true, 'udp');
                return;
              }
              console._verbose('UDP remote-side socket created and bound');
              return chrome.sockets.udp.getInfo(socketId, function(socketInfo) {
                var data, localAddress, localPort;
                localAddress = socketInfo.localAddress, localPort = socketInfo.localPort;
                console._verbose('UDP local-side socket bound on ' + localAddress + ':' + localPort);
                data = Common.packHeader(0x00, null, localAddress, localPort);
                return chrome.sockets.tcp.send(socket_id, data.buffer, function(sendInfo) {
                  if (!sendInfo || sendInfo.resultCode < 0 || chrome.runtime.lastError) {
                    console._error('Failed to send UDP relay init success message', chrome.runtime.lastError.message);
                    _this.close_socket(socketId, true, 'udp');
                    _this.close_socket(socket_id, false, 'tcp');
                  }
                  return;
                  _this.tcp_socket_info[socket_id].status = 'udp_relay';
                  _this.tcp_socket_info[socket_id].peer_socket_id = socketId;
                  return console.log('TCP reply for success init UDP relay sent');
                });
              });
            });
          });
        });
      };
    })(this));
  }
  tcp_relay(socket_id, data_array) {
    var data, now, peer_socket_id, socket_info;
    if (!(socket_id in this.tcp_socket_info)) {
      return;
    }
    now = Date.now();
    socket_info = this.tcp_socket_info[socket_id];
    socket_info.last_connection = now;
    peer_socket_id = socket_info.peer_socket_id;
    if (!(peer_socket_id in this.tcp_socket_info)) {
      return;
    }
    this.tcp_socket_info[peer_socket_id].last_connection = now;
    data = socket_info.cipher[socket_info.cipher_action](data_array);
    return chrome.sockets.tcp.send(peer_socket_id, data.buffer, (function(_this) {
      return function(sendInfo) {
        if (!sendInfo || sendInfo.resultCode < 0 || chrome.runtime.lastError && socket_id in _this.tcp_socket_info) {
          console._info('Failed to relay TCP data from ' + socket_info.type + ' ' + socket_id + ' to peer ' + peer_socket_id + ':', chrome.runtime.lastError);
          return _this.close_socket(socket_id);
        }
      };
    })(this));
  }
  udp_relay(socket_id, data_array, remoteAddress, remotePort) {
    var addr, data, decrypted, now, peer_socket_id, port, socket_info;
    if (data_array[2] !== 0x00) {
      return this.close_socket(socket_id, true, 'udp');
    }
    now = Date.now();
    socket_info = this.udp_socket_info[socket_id];
    socket_info.last_connection = now;
    peer_socket_id = socket_info.peer_socket_id;
    this.udp_socket_info[peer_socket_id].last_connection = now;
    this.tcp_socket_info[socket_info.host_tcp_id].last_connection = now;
    if (socket_info.type === 'local') {
      data = Encryptor.encrypt_all(this.password, this.method, 1, new Uint8Array(data_array.subarray(3)));
      addr = this.server;
      port = this.server_port | 0;
    } else {
      decrypted = Encryptor.encrypt_all(this.password, this.method, 0, data_array);
      data = new Uint8Array(decrypted.length + 3);
      data.set(decrypted, 3);
      addr = remoteAddress;
      port = remotePort;
    }
    return chrome.sockets.udp.send(peer_socket_id, data.buffer, addr, port, (function(_this) {
      return function(sendInfo) {
        if (sendInfo.resultCode < 0 || chrome.runtime.lastError) {
          console._info('Failed to relay UDP data from ' + socket_info.type + ' ' + socket_id + ' to peer ' + peer_socket_id + ':', chrome.runtime.lastError);
          return _this.close_socket(socket_info.host_tcp_id, true, 'tcp');
        }
      };
    })(this));
  }
  close_socket(socket_id, close_peer, protocol) {
    var peer_socket_id;
    if (close_peer == null) {
      close_peer = true;
    }
    if (protocol == null) {
      protocol = 'tcp';
    }
    console.log('Closing ' + protocol + ' socket ' + socket_id);
    socket_id |= 0;
    if (socket_id in this[protocol + '_socket_info']) {
      peer_socket_id = this[protocol + '_socket_info'][socket_id].peer_socket_id;
      if (close_peer && this[protocol + '_socket_info'][socket_id].status === 'udp_relay') {
        this.close_socket(peer_socket_id, true, 'udp');
        close_peer = false;
      }
      delete this[protocol + '_socket_info'][socket_id]['cipher'];
      delete this[protocol + '_socket_info'][socket_id];
    }
    return chrome.sockets[protocol].close(socket_id, (function(_this) {
      return function() {
        if (chrome.runtime.lastError && chrome.runtime.lastError.message !== 'Socket not found') {
          console._info('Error on close ' + protocol + ' socket ' + socket_id + ':', chrome.runtime.lastError.message);
        }
        console.log(protocol + ' socket ' + socket_id + ' closed');
        if (close_peer && peer_socket_id in _this[protocol + '_socket_info']) {
          return _this.close_socket(peer_socket_id, false, protocol);
        }
      };
    })(this));
  }
  sweep_socket() {
    var ref, ref1, socket, socket_id;
    console.log('Sweeping timeouted socket...');
    ref = this.tcp_socket_info;
    for (socket_id in ref) {
      socket = ref[socket_id];
      if (Date.now() - socket.last_connection >= this.timeout * 1000) {
        chrome.sockets.tcp.getInfo(socket_id | 0, (function(_this) {
          return function(socketInfo) {
            if (!socketInfo.connected) {
              _this.close_socket(socket_id);
            }
            return console.log('TCP socket ' + socket_id + ' has been swept');
          };
        })(this));
      }
    }
    ref1 = this.udp_socket_info;
    for (socket_id in ref1) {
      socket = ref1[socket_id];
      if (Date.now() - socket.last_connection >= this.timeout * 1000) {
        this.close_socket(socket_id, true, 'udp');
        console.log('UDP socket ' + socket_id + ' has been swept');
      }
    }
  }
}
