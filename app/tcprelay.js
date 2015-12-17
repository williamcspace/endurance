'use strict';

// we clear at most TIMEOUTS_CLEAN_SIZE timeouts each time
const TIMEOUTS_CLEAN_SIZE = 512;
const MSG_FASTOPEN = 0x20000000;

// SOCKS command definition
const CMD_CONNECT = 1;
const CMD_BIND = 2;
const CMD_UDP_ASSOCIATE = 3;

// for each opening port, we have a TCP Relay

// for each connection, we have a TCP Relay Handler to handle the connection

// for each handler, we have 2 sockets:
//      local:   connected to the client
//    remote:  connected to remote server

// for each handler, it could be at one of several stages:

// as sslocal:
// stage 0 SOCKS hello received from local, send hello to local
// stage 1 addr received from local, query DNS for remote
// stage 2 UDP assoc
// stage 3 DNS resolved, connect to remote
// stage 4 still connecting, more data from local received
// stage 5 remote connected, piping local and remote

// as ssserver:
// stage 0 just jump to stage 1
// stage 1 addr received from local, query DNS for remote
// stage 3 DNS resolved, connect to remote
// stage 4 still connecting, more data from local received
// stage 5 remote connected, piping local and remote

const STAGE_INIT = 0;
const STAGE_ADDR = 1;
const STAGE_UDP_ASSOC = 2;
const STAGE_DNS = 3;
const STAGE_CONNECTING = 4;
const STAGE_STREAM = 5;
const STAGE_DESTROYED = -1;

// for each handler, we have 2 stream directions:
//    upstream:    from client to server direction
//                 read local and write to remote
//    downstream:  from server to client direction
//                 read remote and write to local

const STREAM_UP = 0;
const STREAM_DOWN = 1;

// for each stream, it's waiting for reading, or writing, or both
const WAIT_STATUS_INIT = 0;
const WAIT_STATUS_READING = 1;
const WAIT_STATUS_WRITING = 2;
const WAIT_STATUS_READWRITING = WAIT_STATUS_READING | WAIT_STATUS_WRITING;

const BUF_SIZE = 32 * 1024;
