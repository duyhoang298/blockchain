const sha256 = require('sha256');
const uuid = require('uuid');

const currentNodeUrl = process.argv[3];
const listNodes = [
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3004',
  'http://localhost:3005'
].filter(nodeUrl => nodeUrl !== currentNodeUrl);

function BlockChain() {
  this.chain = [];
  this.pendingTransactions = [];

  this.currentNodeUrl = currentNodeUrl;
  this.networkNodes = listNodes;

  this.createNewBlock(100, '0', '0');
}

BlockChain.prototype.createNewBlock = function(nonce, previousBlockHash, hash) {
  const newBlock = {
    index: this.chain.length + 1,
    timestamp: Date.now(),
    transactions: this.pendingTransactions,
    nonce,
    hash,
    previousBlockHash
  };

  this.pendingTransactions = [];
  this.chain.push(newBlock);

  return newBlock;
};

BlockChain.prototype.getLastBlock = function() {
  return this.chain[this.chain.length - 1];
};

BlockChain.prototype.createNewTransactions = function(amount, sender, recipient) {
  const newTransaction = {
    amount,
    sender,
    recipient,
    transactionId: uuid()
      .split('-')
      .join('')
  };

  return newTransaction;
};

BlockChain.prototype.addTransactionToPendingTransactions = function(transactionObj) {
  this.pendingTransactions.push(transactionObj);
  return this.getLastBlock()['index'] + 1;
};

BlockChain.prototype.hashBlock = function(previousBlockHash, currentBlockData, nonce) {
  const dataAsString = previousBlockHash + nonce.toString() + JSON.stringify(currentBlockData);
  const hash = sha256(dataAsString);
  return hash;
};

BlockChain.prototype.proofOfWork = function(previousBlockHash, currentBlockData) {
  let nonce = 0;
  let hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
  while (hash.substring(0, 4) !== '0000') {
    nonce++;
    hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
  }

  return nonce;
};

module.exports = BlockChain;
