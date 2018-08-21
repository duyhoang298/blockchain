const express = require('express');
const bodyParser = require('body-parser');
const uuid = require('uuid');
const axios = require('axios');

const app = express();
const Blockchain = require('./bc');

const port = process.argv[2];
const nodeAddress = uuid()
  .split('-')
  .join('');
const bitcoin = new Blockchain();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/blockchain', (req, res) => {
  res.send(bitcoin);
});

app.post('/transaction', (req, res) => {
  const newTransaction = req.body;
  const blockIndex = bitcoin.addTransactionToPendingTransactions(newTransaction);
  res.json({ note: `Transaction will be added in block ${blockIndex}` });
});

app.post('/transaction/broadcast', (req, res) => {
  const { amount, sender, recipient } = req.body;
  const newTransaction = bitcoin.createNewTransactions(amount, sender, recipient);
  console.log(newTransaction);
  bitcoin.addTransactionToPendingTransactions(newTransaction);

  const reqPromises = [];
  bitcoin.networkNodes.forEach(networkNodeUrl => {
    const requestOptions = {
      method: 'post',
      url: networkNodeUrl + '/transaction',
      data: newTransaction
    };

    reqPromises.push(axios(requestOptions));
  });

  Promise.all(reqPromises).then(() => {
    res.json({ note: `Transaction created and broadcast successfully` });
  });
});

app.get('/mine', (req, res) => {
  /*
        1. Get last block 
        2. Get previous block hash
        3. Get current block data from pendingTansctions
        4. Get nonce form POW
        5. get blockHash 
        6. Create new transactions
        7. Create new block 

    */
  const lastBlock = bitcoin.getLastBlock();
  const previousBlockHash = lastBlock.hash;
  const currentBlockData = {
    transactions: bitcoin.pendingTransactions,
    index: lastBlock.index + 1
  };
  const nonce = bitcoin.proofOfWork(previousBlockHash, currentBlockData);
  const blockHash = bitcoin.hashBlock(previousBlockHash, currentBlockData, nonce);

  const newBlock = bitcoin.createNewBlock(nonce, previousBlockHash, blockHash);
  const reqPromises = [];
  bitcoin.networkNodes.forEach(networkNodeUrl => {
    const requestOptions = {
      method: 'POST',
      url: networkNodeUrl + '/recieve-new-block',
      data: { newBlock }
    };

    reqPromises.push(axios(requestOptions));
  });

  Promise.all(reqPromises)
    .then(() => {
      const requestOptions = {
        method: 'POST',
        url: bitcoin.currentNodeUrl + '/transaction/broadcast',
        data: {
          amout: 12.5,
          sender: '00',
          recipient: nodeAddress
        }
      };

      return axios(requestOptions);
    })
    .then(() => {
      res.json({
        note: 'New bloack mined successfully',
        block: newBlock
      });
    });
});

app.post('/recieve-new-block', (req, res) => {
  const { newBlock } = req.body;
  const lastBlock = bitcoin.getLastBlock();
  const correctHash = lastBlock.hash === newBlock.previousBlockHash;
  const correctIndex = lastBlock['index'] + 1 === newBlock['index'];

  if (correctHash && correctIndex) {
    bitcoin.chain.push(newBlock);
    bitcoin.pendingTransactions = [];
    res.json({
      note: 'New block recived and accepted',
      newBlock
    });
  } else {
    res.json({
      note: 'New block rejected',
      newBlock
    });
  }
});

app.post('/register-and-broadcast-node', (req, res) => {
  const { newNodeUrl } = req.body;
  if (bitcoin.networkNodes.indexOf(newNodeUrl) === -1) bitcoin.networkNodes.push(newNodeUrl);

  const regNodesPromise = [];
  bitcoin.networkNodes.forEach(networkNodeUrl => {
    const requestOptions = {
      method: 'POST',
      url: networkNodeUrl + '/register-node',
      data: { newNodeUrl }
    };

    regNodesPromise.push(axios(requestOptions));
  });

  Promise.all(regNodesPromise)
    .then(() => {
      const bulkRegisterOptions = {
        method: 'POST',
        url: newNodeUrl + '/register-nodes-bulk',
        data: { allNetworkNodes: [...bitcoin.networkNodes, bitcoin.currentNodeUrl] }
      };
      return axios(bulkRegisterOptions);
    })
    .then(() => {
      res.json({ note: 'New node registered with network successfully' });
    });
});

app.post('/register-node', (req, res) => {
  const { newNodeUrl } = req.body;
  const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(newNodeUrl) === -1;
  const notCurrentNode = bitcoin.currentNodeUrl !== newNodeUrl;

  if (nodeNotAlreadyPresent && notCurrentNode) bitcoin.networkNodes.push(newNodeUrl);
  res.json({ note: 'New node registered success with node' });
});

// register multiple nodes at once
app.post('/register-nodes-bulk', (req, res) => {
  const { allNetworkNodes } = req.body;
  allNetworkNodes.forEach(networkNodeUrl => {
    const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(networkNodeUrl) === -1;
    const notCurrentNode = bitcoin.currentNodeUrl !== networkNodeUrl;

    if (nodeNotAlreadyPresent && notCurrentNode) bitcoin.networkNodes.push(networkNodeUrl);
  });

  res.json({ note: 'Bulk registration successful ' + bitcoin.currentNodeUrl });
});

app.listen(port, () => {
  console.log(`listening on port ${port} ...`);
});
