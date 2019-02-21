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
  constructor() {
    this.blockchain = [initBlock]
    this.data = []
    this.difficulty = 4
  }
  // 获取最新区块
  getLastBlock(){
    return this.blockchain[this.blockchain.length-1]
  }
  // 转账
  transfer(from, to, amount) {
    // TODO:签名校验
    if(from!=='0'){
      // 交易非挖矿
      const blance = this.blance(from)
      if(blance<amount){
        console.log('not enough blance', from, blance, amount)
        return
      }
    }
    const transObj = {from, to, amount}
    this.data.push(transObj)
    return transObj
  }
  // 查看余额
  blance(address){
    // from to amount
    let blance = 0
    this.blockchain.forEach(block=>{
      if(!Array.isArray(block.data)){
        // 创世区块的data是一个字符串
        return
      }
      block.data.forEach(trans=>{
        if(address == trans.from){
          blance -= trans.amount
        }
        if(address == trans.to){
          blance += trans.amount
        }
      })
    })
    console.log(blance)
    return blance
  }
  // 挖矿, 打包交易
  mine(address) {
    // 1. 生成新的区块
    // 2. 不停的算哈希 直到符合难度条件 新增区块
    // 挖矿结束，矿工奖励, 挖矿成功给100
    this.transfer('0', address, 100)
    const newBlock = this.generateNewBlock()
    // 区块合法，并且区块链合法，就新增一下
    if(this.isValidBlock(newBlock) && this.isValidChain()) {
      this.blockchain.push(newBlock)
      this.data = []
      return newBlock
    } else {
      console.log('error, invalid Block', newBlock)
    }
    return
  }
  // 生成新区块
  generateNewBlock() {
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
  computeHash(index, prevHash, timestamp, data, nonce) {
    return crypto
      .createHash('sha256') // 实际哈希复杂很多，这里只是简化了
      .update(index + prevHash + timestamp + data + nonce)
      .digest('hex')
  }
  computeHashForBlock({index, prevHash, timestamp, data, nonce}){
    return this.computeHash(index, prevHash, timestamp, data, nonce)
  }
  // 校验区块
  isValidBlock(newBlock, lastBlock = this.getLastBlock()) {
    // 1. 区块的index等于最新区块的index+1
    // 2. 区块的timestamp大于最新区块
    // 3. 区块的prevHash 等于最新区块的hash
    // 4. 区块的哈希值符合难度要求
    // 5. 哈希值计算是否正确
    if(newBlock.index !== lastBlock.index+1){
      return false
    } else if (newBlock.timestamp <= lastBlock.timestamp) {
      return false
    } else if(newBlock.prevHash !== lastBlock.hash) {
      return false
    } else if (newBlock.hash.slice(0, this.difficulty) !== '0'.repeat(this.difficulty)){
      return false
    } else if (newBlock.hash !== this.computeHashForBlock(newBlock)){
      return false
    }
    return true
  }
  // 校验区块链
  isValidChain(chain = this.blockchain) {
    for(let i = chain.length-1; i>=1; i=i-1) {
      if(!this.isValidBlock(chain[i], chain[i-1])){
        return false
      }
    }
    if(JSON.stringify(chain[0]) !== JSON.stringify(initBlock)){
      return false
    }
    return true
  }
}

// let bc = new Blockchain()
// bc.mine()
// bc.blockchain[1].nonce = 22
// bc.mine()
// bc.mine()
// console.log(bc.blockchain)
module.exports = Blockchain