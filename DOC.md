What is this
============

Groundhog is a node.js socks port of SS, based on abandoned nodejs version.
It is for experimenting nodejs's capability as socks server. not for any
production use.

Problems
-----------
need to look into nodejs's GC problem

- https://github.com/clowwindy/shadowsocks-nodejs/issues/35
- https://github.com/joyent/node/issues/5949

at the time nodejs handles 100 connections with 300MB RAM. let's see
how far it can goes.

Usage
-----------
Create a file named `config.json`, with the following content.

    {
        "server":"my_server_ip",
        "server_port":8388,
        "local_port":1080,
        "password":"foobar!",
        "timeout":600,
        "method":"table"
    }

Explaination of the fields:

    server          your server IP (IPv4/IPv6), notice that your server will listen to this IP
    server_port     server port
    local_port      local port
    password        a password used to encrypt transfer
    timeout         in seconds
    method          encryption method, "bf-cfb", "aes-256-cfb", "des-cfb", "rc4", etc. Default is table

`cd` into the directory of `config.json`. Run `server` on your server. To run it in the background, run
`nohup ssserver > log &`.

On your client machine, run `client`.

Change the proxy setting in your browser into

    protocol: socks5
    hostname: 127.0.0.1
    port:     your local_port

Advanced
------------

You can use args to override settings from `config.json`.

    client -s server_name -p server_port -l local_port -k password -m bf-cfb
    server -p server_port -k password -m bf-cfb
    server -c /etc/shadowsocks/config.json

Example of multi-user server support can be found in `test/config-multi-passwd.json`.