const vorpal = require('vorpal')()
const Table = require('cli-table')
const Blockchain = require('./blockchain')
const rsa = require('./rsa')
const blockchain = new Blockchain()

// 格式化输出内容为表格形式
function formatLog (data) {
  if (!data || data.length === 0) {
    return
  }
  if (!Array.isArray(data)) {
    data = [ data ]
  }
  const first = data[0]
  const head = Object.keys(first)
  const table = new Table({
    head,
    colWidths: new Array(head.length).fill(15)
  })
  const res = data.map(v => {
    return head.map(h => JSON.stringify(v[h], null, 2))
  })
  table.push(...res)
  console.log(table.toString())
}

vorpal
  .command('mine', '挖矿')
  .action(function (args, callback) {
    const newBlock = blockchain.mine(rsa.keys.pub)
    if (newBlock) {
      formatLog(newBlock)
    }
    callback()
  })
vorpal
  .command('blockchain', '查看区块链')
  .action(function (args, callback) {
    formatLog(blockchain.blockchain)
    callback()
  })

vorpal
  .command('trans <to> <amount>', '转账')
  .action(function (args, callback) {
    // 本地公钥当成转出地址
    let trans = blockchain.transfer(rsa.keys.pub, args.to, args.amount)
    if (trans) {
      formatLog(trans)
    }
    callback()
  })

vorpal
  .command('detail <index>', '查看区块详情')
  .action(function (args, callback) {
    const block = blockchain.blockchain[args.index]
    this.log(JSON.stringify(block, null, 2))
    callback()
  })

vorpal
  .command('blance <address>', '查询余额')
  .action(function (args, callback) {
    const blance = blockchain.blance(args.address)
    if (blance) {
      formatLog({ blance, address: args.address })
    }
    callback()
  })

vorpal
  .command('pub', '查看本地地址')
  .action(function (args, callback) {
    this.log(rsa.keys.pub)
    callback()
  })

vorpal
  .command('peers', '查看网络节点列表')
  .action(function (args, callback) {
    formatLog(blockchain.peers)
    callback()
  })

vorpal
  .command('chat <msg>', '与其他节点交流信息')
  .action(function (args, callback) {
    blockchain.boardcast({
      type: 'hi',
      data: args.msg
    })
    callback()
  })

vorpal
  .command('pending', '查看还没有被打包的交易')
  .action(function (args, callback) {
    formatLog(blockchain.data)
    callback()
  })
// vorpal
//   .command('hello', '你好啊')
//   .action(function(args, callback) {
//     this.log('你好啊，区块链');
//     callback();
//   });

console.log('welcome to yq-chain')
vorpal.exec('help')

vorpal
  .delimiter('yq-chain$') // 命令行工具的前缀
  .show()
