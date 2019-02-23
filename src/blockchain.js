// 1. 迷你区块链
// 2. 区块链的生成、新增、校验
// 3. 交易
// 4. 非对称加密
// 5. 挖矿
// 6. p2p网络

// [
//   // 创世区块
//   {
//     index: 0 索引
//     timestamp 时间戳
//     data 区块的具体信息 主要是交易信息
//     hash 当前区块信息的哈希，哈希1
//     prevHash 上一个区块的哈希, 哈希0
//     nonce 随机数
//   },
//   {
//     index: 1 索引
//     timestamp 时间戳
//     data 区块的具体信息 主要是交易信息
//     hash 当前区块信息的哈希，哈希2
//     prevHash 上一个区块的哈希, 哈希1
//     nonce 随机数
//   }
// ]

const crypto = require('crypto') // node.js自带加密库
const dgram = require('dgram')
const rsa = require('./rsa')

// 创世区块
const initBlock = {
  index: 0,
  data: ['Hello woniu-chain!'],
  prevHash: '0',
  timestamp: 1536622963141,
  nonce: 50466,
  hash: '0000e516744b117ced4a20e1c4060259ecc70a609e1a14b3c19ee0e5dbc29cca'
}
class Blockchain {
  constructor () {
    this.blockchain = [initBlock]
    this.data = []
    this.difficulty = 4
    // 所有的网络节点的信息 address port
    this.peers = []
    this.remote = {}
    // 种子节点
    this.seed = {
      port: 8001,
      address: 'localhost'
    }
    this.udp = dgram.createSocket('udp4')
    this.init()
  }
  init () {
    this.bindP2p()
    this.bindExit()
  }
  bindP2p () {
    // 网络发来的消息
    this.udp.on('message', (data, remote) => {
      const { address, port } = remote
      const action = JSON.parse(data)
      // {
      //   type: '要干啥',
      //   data: 具体传递的信息
      // }
      if (action.type) {
        this.dispatch(action, { address, port })
      }
    })
    this.udp.on('listening', () => {
      const address = this.udp.address()
      console.log('[信息]： udp监听完毕 端口号是：' + address.port)
    })
    // 区分种子节点和普通节点 普通节点的端口0即可 随便一个空闲端口即可
    // 种子节点端口必须约定好
    const port = Number(process.argv[2]) || 0
    this.startNode(port)
  }
  bindExit () {
    process.on('exit', () => {
      console.log('[信息]: 网络一线牵，珍惜这段缘 再见')
    })
  }
  startNode (port) {
    this.udp.bind(port)

    // 如果不是种子节点， 需要发送一个消息搞死种子 我来了
    if (port !== 8001) {
      this.send({
        type: 'newpeer'
      }, this.seed.port, this.seed.address)
      // 把种子节点加入到本地节点中
      this.peers.push(this.seed)
    }
  }
  send (message, port, address) {
    this.udp.send(JSON.stringify(message), port, address)
  }
  boardcast (action) {
    // 广播全场
    this.peers.forEach(v => {
      this.send(action, v.port, v.address)
    })
  }
  dispatch (action, remote) {
    // 接受到网络的消息在这里处理
    // console.log('接受到P2P网络的消息', action)
    switch (action.type) {
      case 'newpeer':
        // 种子节点要做的事情
        // 1. 你的公网ip和port是啥
        this.send({
          type: 'remoteAddress',
          data: remote
        }, remote.port, remote.address)
        // 2. 现在全部节点的列表
        this.send({
          type: 'peerlist',
          data: this.peers
        }, remote.port, remote.address)
        // 3. 告诉所有已知节点 来了个新朋友 快打招呼
        this.boardcast({
          type: 'sayhi',
          data: remote
        })
        // 4. 告诉你现在区块链的数据
        this.send({
          type: 'blockchain',
          data: JSON.stringify({
            blockchain: this.blockchain,
            trans: this.data
          })
        }, remote.port, remote.address)

        this.peers.push(remote)
        console.log('你好啊，新朋友，请你喝茶', remote)
        break
      case 'blockchain':
        // 同步本地链
        let allData = JSON.parse(action.data)
        let newChain = allData.blockchain
        let newTrans = allData.trans
        this.replaceChain(newChain)
        this.replaceTrans(newTrans)
        break
      case 'remoteAddress':
        // 存储远程消息，退出的时候用
        this.remote = action.data
        break
      case 'peerlist':
        // 远程搞死我现在的节点列表
        const newPeers = action.data
        this.addPeers(newPeers)
        break
      case 'sayhi':
        let remotePeer = action.data
        this.peers.push(remotePeer)
        console.log('[信息] 新朋友你好，相识就是缘分，请你喝茶')
        this.send({
          type: 'hi',
          data: 'hi'
        }, remotePeer.port, remotePeer.address)
        break
      case 'hi':
        console.log(`${remote.address} : ${remote.port} : ${action.data}`)
        break
      case 'trans':
        // 网络上收到交易请求
        // 是不是有重复交易
        if (!this.data.find(v => this.isEqualObj(v, action.data))) {
          console.log('有新的交易，请注意查收')
          this.addTrans(action.data)
          this.boardcast({
            type: 'trans',
            data: action.data
          })
        }
        break
      case 'mine':
        // 网络上有人挖矿成功
        const lastBlock = this.getLastBlock()
        if (lastBlock.hash === action.data.hash) {
          // 重复的消息
          return
        }
        if (this.isValidBlock(action.data, lastBlock)) {
          console.log('[信息]：有朋友挖矿成功，让我们一起给他喝彩 放烟花！')
          this.blockchain.push(action.data)
          // 清空本地信息
          this.data = []
          // 防止个别没有收到信息
          this.boardcast({
            type: 'mine',
            data: action.data
          })
        } else {
          console.log('挖矿的区块不合法')
        }
        break
      default:
        console.log('这个action不认识')
    }
  }
  isEqualObj (obj1, obj2) {
    const key1 = Object.keys(obj1)
    const key2 = Object.keys(obj2)
    if (key1.length !== key2.length) {
      return
    }
    return key1.every(key => obj1[key] === obj2[key])
  }
  // isEqualPeer(peer1, peer2) {
  //   return peer1.address == peer2.address && peer1.port == peer2.port
  // }
  addPeers (peers) {
    peers.forEach(peer => {
      // 新节点吐过不存在 就添加一个到peers
      if (!this.peers.find(v => this.isEqualObj(peer, v))) {
        this.peers.push(peer)
      }
    })
  }
  // 获取最新区块
  getLastBlock () {
    return this.blockchain[this.blockchain.length - 1]
  }
  // 转账
  transfer (from, to, amount) {
    const timestamp = new Date().getTime()
    // 签名校验
    const signature = rsa.sign({ from, to, amount, timestamp })
    const signTrans = { from, to, amount, timestamp, signature }

    if (from !== '0') {
      // 交易非挖矿
      const blance = this.blance(from)
      if (blance < amount) {
        console.log('not enough blance', from, blance, amount)
        return
      }
      this.boardcast({
        type: 'trans',
        data: signTrans
      })
    }
    this.data.push(signTrans)
    return signTrans
  }
  // 查看余额
  blance (address) {
    // from to amount
    let blance = 0
    this.blockchain.forEach(block => {
      if (!Array.isArray(block.data)) {
        // 创世区块的data是一个字符串
        return
      }
      block.data.forEach(trans => {
        if (address === trans.from) {
          blance -= trans.amount
        }
        if (address === trans.to) {
          blance += trans.amount
        }
      })
    })
    console.log(blance)
    return blance
  }
  isValidTransfer (trans) {
    // 是不是合法的转账
    // 地址即是公钥
    return rsa.verify(trans, trans.from)
  }
  addTrans (trans) {
    if (this.isValidTransfer(trans)) {
      this.data.push(trans)
    }
  }
  replaceTrans (trans) {
    if (trans.every(v => this.isValidTransfer(v))) {
      this.data = trans
    }
  }
  // 挖矿, 打包交易
  mine (address) {
    // 校验所有交易合法性
    // 1. 只要不合法的交易就报错
    // if(!this.data.every(v => this.isValidTransfer(v))) {
    //   console.log('trans is invalid')
    //   return
    // }
    // 2. 过滤不合法的交易
    this.data = this.data.filter(v => this.isValidTransfer(v))

    // 1. 生成新的区块
    // 2. 不停的算哈希 直到符合难度条件 新增区块
    // 挖矿结束，矿工奖励, 挖矿成功给100
    this.transfer('0', address, 100)
    const newBlock = this.generateNewBlock()
    // 区块合法，并且区块链合法，就新增一下
    if (this.isValidBlock(newBlock) && this.isValidChain()) {
      this.blockchain.push(newBlock)
      this.data = []
      console.log('[信息]：挖矿成功')
      this.boardcast({
        type: 'mine',
        data: newBlock
      })
      return newBlock
    } else {
      console.log('error, invalid Block', newBlock)
    }
  }
  // 生成新区块
  generateNewBlock () {
    let nonce = 0
    const index = this.blockchain.length // 区块索引值
    const data = this.data
    const prevHash = this.getLastBlock().hash
    let timestamp = new Date().getTime()
    let hash = this.computeHash(index, prevHash, timestamp, data, nonce)
    while (hash.slice(0, this.difficulty) !== '0'.repeat(this.difficulty)) {
      nonce += 1
      hash = this.computeHash(index, prevHash, timestamp, data, nonce)
    }
    return {
      index,
      data,
      prevHash,
      timestamp,
      nonce,
      hash
    }
  }
  // 计算哈希
  computeHash (index, prevHash, timestamp, data, nonce) {
    return crypto
      .createHash('sha256') // 实际哈希复杂很多，这里只是简化了
      .update(index + prevHash + timestamp + data + nonce)
      .digest('hex')
  }
  computeHashForBlock ({ index, prevHash, timestamp, data, nonce }) {
    return this.computeHash(index, prevHash, timestamp, data, nonce)
  }
  // 校验区块
  isValidBlock (newBlock, lastBlock = this.getLastBlock()) {
    // 1. 区块的index等于最新区块的index+1
    // 2. 区块的timestamp大于最新区块
    // 3. 区块的prevHash 等于最新区块的hash
    // 4. 区块的哈希值符合难度要求
    // 5. 哈希值计算是否正确
    if (newBlock.index !== lastBlock.index + 1) {
      return false
    } else if (newBlock.timestamp <= lastBlock.timestamp) {
      return false
    } else if (newBlock.prevHash !== lastBlock.hash) {
      return false
    } else if (newBlock.hash.slice(0, this.difficulty) !== '0'.repeat(this.difficulty)) {
      return false
    } else if (newBlock.hash !== this.computeHashForBlock(newBlock)) {
      return false
    }
    return true
  }
  // 校验区块链
  isValidChain (chain = this.blockchain) {
    for (let i = chain.length - 1; i >= 1; i = i - 1) {
      if (!this.isValidBlock(chain[i], chain[i - 1])) {
        return false
      }
    }
    if (JSON.stringify(chain[0]) !== JSON.stringify(initBlock)) {
      return false
    }
    return true
  }
  replaceChain (newChain) {
    // 先不校验交易
    if (newChain.length === 1) {
      return
    }
    if (this.isValidChain(newChain) && newChain.length > this.blockchain.length) {
      // 深拷贝一份
      this.blockchain = JSON.parse(JSON.stringify(newChain))
    } else {
      console.log('[错误]：非法链')
    }
  }
}

// let bc = new Blockchain()
// bc.mine()
// bc.blockchain[1].nonce = 22
// bc.mine()
// bc.mine()
// console.log(bc.blockchain)
module.exports = Blockchain
