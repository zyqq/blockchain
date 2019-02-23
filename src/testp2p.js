const dgram = require('dgram')
const udp = dgram.createSocket('udp4')

// udp 收信息
udp.on('message', (data, remote) => {
  console.log('accept message' + data.toString())
  console.log(remote)
})
udp.on('listening', () => {
  const address = udp.address()
  console.log('udp server is listerning' + address.address + ':' + address.port)
})
udp.bind(0) // 本地服务器不用刻意绑定端口，本机随便分配一个空闲端口绑定上了就行，远程服务器就得指定端口

function send (message, port, host) {
  console.log('send message', message, port, host)
  udp.send(Buffer.from(message), port, host)
}

const port = Number(process.argv[2])
const host = process.argv[3]
port && host && send('雷猴啊', port, host)
