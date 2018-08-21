const express = require('express');
const bodyParser = require('body-parser');
const uuid = require('uuid');
const axios = require('axios');
const morgan = require('morgan');
const app = express();
const Blockchain = require('./bc');

const port = process.argv[2];
const nodeAdress = uuid()
    .split('-')
    .join('');
const bitcoin = new Blockchain();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/blockchain', (req, res) => {
    res.send(bitcoin);
});
app.post('/transaction', (req, res) => {
    let { amount, sender, recipient } = req.body;
    const blockIndex = bitcoin.createNewTransactions(amount, sender, recipient);
    res.json({ note: `Transaction will be added in block ${blockIndex}` });
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
    const previousBlockHash = lastBlock['hash'];
    const currentBlockData = {
        transactions: bitcoin.pendingTransactions,
        index: lastBlock['index'] + 1
    };
    const nonce = bitcoin.proofOfWork(previousBlockHash, currentBlockData);
    const blockHash = bitcoin.hashBlock(previousBlockHash, currentBlockData, nonce);
    bitcoin.createNewTransactions(12.5, '00', nodeAdress);

    const newBlock = bitcoin.createNewBlock(nonce, previousBlockHash, blockHash);
    res.json({
        note: 'New bloack mined successfully',
        block: newBlock
    });
});

app.post('/register-and-broadcast-node', (req, res) => {
    const { newNodeUrl } = req.body;
    if (bitcoin.networkNodes.indexOf(newNodeUrl) == -1) bitcoin.networkNodes.push(newNodeUrl);

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
        .then(data => {
            const bulkRegisterOptions = {
                method: 'POST',
                url: newNodeUrl + '/register-nodes-bulk',
                data: { allNetworkNodes: [...bitcoin.networkNodes, bitcoin.currentNodeUrl] }
            };

            return axios(bulkRegisterOptions);
        })
        .then(data => {
            res.json({ note: 'New node registered with network successfully' });
        });
});

app.post('/register-node', (req, res) => {
    const { newNodeUrl } = req.body;
    const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(newNodeUrl) == -1;
    const notCurrentNode = bitcoin.currentNodeUrl !== newNodeUrl;

    if (nodeNotAlreadyPresent && notCurrentNode) bitcoin.networkNodes.push(newNodeUrl);
    res.json({ note: 'New node registered success with node' });
});

//register multiple nodes at once
app.post('/register-nodes-bulk', (req, res) => {
    const { allNetworkNodes } = req.body;
    allNetworkNodes.forEach(networkNodeUrl => {
        const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(networkNodeUrl) == -1;
        const notCurrentNode = bitcoin.currentNodeUrl !== networkNodeUrl;

        if (nodeNotAlreadyPresent && notCurrentNode) bitcoin.networkNodes.push(networkNodeUrl);
    });

    res.json({ note: 'Bulk registration successful ' + bitcoin.currentNodeUrl });
});

app.listen(port, () => {
    console.log(`listening on port ${port} ...`);
});
