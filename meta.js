var mp4 = require('mp4-stream')
var fs = require('fs')
var inspect = require('util').inspect

var encoder = mp4.encode()
var writer = fs.createWriteStream('./written.mp4')
var tasks = []
var run = require('run-series')
var eos = require('end-of-stream')

var decodeds = 0
var decoderz = 0

encoder.pipe(writer)

fs.createReadStream(process.argv[2])
  .pipe(readProp(['moov','udta','meta'], function (err, box, bawx, type) {
    var d = mp4.decode()
    bawx()
    d.on('box', function (hbox) {
      d.decode(function (sbox) {
        var type = sbox.buffer.slice(4,8).toString()
        if (type === 'data') {
          var len = sbox.buffer.readUInt32BE(8)
          var key = sbox.type
          var value
          if (key === 'trkn') {
            value = sbox.buffer.readUInt32BE(12)
            var v = new Buffer('abcd')
            //v.copy(sbox.buffer, 12)
          } else {
            value = sbox.buffer.slice(12 + len).toString()
            var v = new Buffer(new Array(len).join('a'))
            //v.copy(sbox.buffer, 12)
          }
          console.log(key + ' => ' + value)
        } //else 
      })
    })
    var sbuf = box.buffer.slice(box.buffer.readUInt32BE(4) + 8 + 4)
    d.end(sbuf)
  }))

function check(){
  return [decoderz, decodeds]
} 
function readProp (props, cb, _bawx) {
  var d = mp4.decode()
  decoderz++
  eos(d, function(){
    decoderz--
    if(decoderz === 0){
      run(tasks)
      //console.log('decodeds', decodeds)
    }
  })
  d.on('box', function (hbox) {
    d.decode(function (box) {
      decodeds++
      //console.log('decodeds++')
      box.__id = Math.random()
      var bawx = _bawx || (function (box){
        tasks.push(function(cb){
          encoder.box(box, function(){
            cb(null, undefined)  
          })
        })
        return function(b){
          decodeds--
          if(decodeds === 0) {
            //console.log('decodeds zeroed; decoderz: ', decoderz)
          }
        }
      })(box)
      if (hbox.type === props[0]) {
        if (props.length === 1) cb(null, box, bawx, hbox.type)
        else if (box.otherBoxes) {
          for (var i = 0; i < box.otherBoxes.length; i++) {
            var b = box.otherBoxes[i]
            if (b.type === props[1]) {
              return readProp(props.slice(2), cb, bawx).end(b.buffer)
            }
            else bawx()
          }
          bawx()
        } else bawx()
      } else {
        bawx()
      }
    })
  })
  return d
}
