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
