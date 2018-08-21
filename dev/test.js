const BlockChain = require('./bc');
const bc = new BlockChain();
const nonce = 321321;
const previousHashBlock = '2EWQD2EWQDSA';
const currentBlockData = [
    {
        amount: 321,
        sender: '321321',
        recipient: '32EWQ231'
    },
    {
        amount: 34212,
        sender: '321321',
        recipient: '32EWQ231'
    },
    {
        amount: 322,
        sender: '321321',
        recipient: '32EWQ231'
    }
];

console.log(bc.proofOfWork(previousHashBlock, currentBlockData, nonce));
