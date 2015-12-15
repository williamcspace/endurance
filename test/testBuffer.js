var crypto = require('crypto');

var key = 'foobar!';
var md5sum        = crypto.createHash('md5');
md5sum.update(key);
var hash = new Buffer("zzzzz", 'binary');

var full = hash.readUIntLE();
console.log('full: '+ full);
for (var i = 0; i < 17; i++){
  try{
    console.log('a'+ i + ': '+ hash.readUInt32LE(i));
  }catch(e){
    console.log(e);
  }
}