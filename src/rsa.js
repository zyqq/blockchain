// 1. 称加密
// 发送者=》密钥+信息=》接受者
// 2. RSA非对称加密
// 公钥（所有人都知道）、私钥（只有你自己才知道）
// 用私钥加密信息，用公钥验证信息是否合法
// 发送者=》{
//     msg: 你好啊，吃饭了么
//     sign: 用私钥加密后的信息
//     公钥: xxx
// } => 接受者

// 1. 生成公私钥对
// 2. 公钥直接当成地址用，或者截取公钥前20位
// 3. 公钥也可以通过私钥计算出来
let fs = require('fs')
let EC = require('elliptic').ec
let ec = new EC('secp256k1')
let keypair = ec.genKeyPair()
const keys = generateKeys()
// 步骤
// 1. 获取公私钥对（永久存储）
function getPub (prv) {
  // 根据私钥算出公钥
  return ec.keyFromPrivate(prv).getPublic('hex').toString()
}
function generateKeys () {
  const fileName = './wallet.json'
  try {
    let res = JSON.parse(fs.readFileSync(fileName))
    if (res.prv && res.pub && getPub(res.prv) === res.pub) {
      keypair = ec.keyFromPrivate(res.prv)
      return res
    } else {
      // 验证失败，重新生成
      throw new Error('invalid wallet.json')
    }
  } catch (error) {
    // 文件不存在或者文件内容不合法，重新生成公私钥
    const res = {
      prv: keypair.getPrivate('hex').toString(),
      pub: keypair.getPublic('hex').toString()
    }
    fs.writeFileSync(fileName, JSON.stringify(res))
    return res
  }
}
// 2. 签名
function sign ({ from, to, amount, timestamp }) {
  const bufferMsg = Buffer.from(`${timestamp}-${amount}-${from}-${to}`)
  let signature = Buffer.from(keypair.sign(bufferMsg).toDER()).toString('hex')
  return signature
}
// 3. 校验签名
function verify ({ from, to, amount, timestamp, signature }, pub) {
  // 校验是没有私钥的
  const keypairTemp = ec.keyFromPublic(pub, 'hex')
  const bufferMsg = Buffer.from(`${timestamp}-${amount}-${from}-${to}`)
  return keypairTemp.verify(bufferMsg, signature)
}

// const trans = { from: 'woniu', to: 'imooc', amount: 100 }
// // 交易数据更改了，则跟签名不对应
// // const trans1 = { from: 'woniu1', to: 'imooc', amount: 100 }
// const signature = sign(trans)
// trans.signature = signature
// // trans1.signature = signature
// console.log(signature)
// const isVerify = verify(trans, keys.pub)
// console.log(isVerify)

module.exports = { sign, verify, keys }
