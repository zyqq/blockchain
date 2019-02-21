const vorpal = require('vorpal')();
const Table = require('cli-table');
const Blockchain = require('./blockchain');
const blockchain = new Blockchain();

// 格式化输出内容为表格形式
function formatLog(data) {
  if(!Array.isArray(data)){
    data = [ data ]
  }
  const first = data[0]
  const head = Object.keys(first)
  const table = new Table({
    head,
    colWidths: new Array(head.length).fill(15)
  })
  const res = data.map(v=>{
    return head.map(h=>JSON.stringify(v[h], null, 2))
  })
  table.push(...res)
  console.log(table.toString());
}

vorpal
  .command('mine <address>', '挖矿')
  .action(function(args, callback) {
    const newBlock = blockchain.mine(args.address)
    if(newBlock){
      formatLog(newBlock)
    }
    callback();
  });
vorpal
  .command('chain', '查看区块链')
  .action(function(args, callback) {
    formatLog(blockchain.blockchain)
    callback();
  });

vorpal
  .command('trans <from> <to> <amount>', '转账')
  .action(function(args, callback) {
    let trans = blockchain.transfer(args.from, args.to, args.amount)
    if(trans){
      formatLog(trans)
    }
    callback();
  });

vorpal
  .command('detail <index>', '查看区块详情')
  .action(function(args, callback) {
    const block = blockchain.blockchain[args.index]
    this.log(JSON.stringify(block, null ,2))
    callback();
  });

vorpal
  .command('blance <address>', '查询余额')
  .action(function(args, callback) {
    const blance = blockchain.blance(args.address)
    if(blance){
      formatLog({blance,address:args.address})
    }
    callback();
  });
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
  .show();