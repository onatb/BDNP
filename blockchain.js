/**
 *                          Blockchain Class
 *  The Blockchain class contain the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message`
 *  to verify a message signature. The chain is stored in the array
 *  `this.chain = [];`. Of course each time you run the application the chain will be empty because and array
 *  isn't a persisten storage method.
 *
 */

const SHA256 = require('crypto-js/sha256');
const BlockClass = require('./block.js');
const bitcoinMessage = require('bitcoinjs-message');

class Blockchain {

    /**
     * Constructor of the class, you will need to setup your chain array and the height
     * of your chain (the length of your chain array).
     * Also everytime you create a Blockchain class you will need to initialized the chain creating
     * the Genesis Block.
     * The methods in this class will always return a Promise to allow client applications or
     * other backends to call asynchronous functions.
     */
    constructor() {
        this.chain = [];
        this.height = -1;
        this.initializeChain();
    }

    /**
     * This method will check for the height of the chain and if there isn't a Genesis Block it will create it.
     * You should use the `addBlock(block)` to create the Genesis Block
     * Passing as a data `{data: 'Genesis Block'}`
     */
    async initializeChain() {
        if( this.height === -1){
            let block = new BlockClass.Block({data: 'Genesis Block'});
            await this._addBlock(block);
        }
    }

    /**
     * Utility method that return a Promise that will resolve with the height of the chain
     */
    getChainHeight() {
        return new Promise((resolve, reject) => {
            resolve(this.height);
        });
    }

    /**
     * _addBlock(block) will store a block in the chain
     * @param {*} block
     * The method will return a Promise that will resolve with the block added
     * or reject if an error happen during the execution.
     * You will need to check for the height to assign the `previousBlockHash`,
     * assign the `timestamp` and the correct `height`...At the end you need to
     * create the `block hash` and push the block into the chain array. Don't for get
     * to update the `this.height`
     * Note: the symbol `_` in the method name indicates in the javascript convention
     * that this method is a private method.
     */
    _addBlock(block) {
        let self = this;
        return new Promise(async (resolve, reject) => {
          // Get current time and store it in the block
          block.time = new Date().getTime().toString().slice(0, -3);
          // For blocks other than the Genesis Block
          // Save previous block hash and increase block height
          if(self.height > -1){
            block.previousBlockHash = self.chain[self.height - 1].hash;
            block.height =+ 1;
          }
          // Add block hash (SHA256 requires a string of data)
          block.hash = SHA256(JSON.stringify(block)).toString();
          // Add block to the blockchain and increase the blockchain height
          self.chain.push(block);
          self.height =+ 1;

          if(block){
            resolve(block);
          }
          else {
            reject(Error("Error occured during execution: Adding Block to the Chain Failed!"));
          }
        });
    }

    /**
     * The requestMessageOwnershipVerification(address) method
     * will allow you  to request a message that you will use to
     * sign it with your Bitcoin Wallet (Electrum or Bitcoin Core)
     * This is the first step before submit your Block.
     * The method return a Promise that will resolve with the message to be signed
     * @param {*} address
     */
    requestMessageOwnershipVerification(address) {
        return new Promise((resolve) => {
          // Resolve promise with this format:
          // "<WALLET_ADDRESS>:<CURRENT_TIME>:starRegistry"
          resolve(`${address}:${new Date().getTime().toString().slice(0,-3)}:starRegistry`);
        });
    }

    /**
     * The submitStar(address, message, signature, star) method
     * will allow users to register a new Block with the star object
     * into the chain. This method will resolve with the Block added or
     * reject with an error.
     * Algorithm steps:
     * 1. Get the time from the message sent as a parameter example: `parseInt(message.split(':')[1])`
     * 2. Get the current time: `let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));`
     * 3. Check if the time elapsed is less than 5 minutes
     * 4. Veify the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
     * 5. Create the block and add it to the chain
     * 6. Resolve with the block added.
     * @param {*} address
     * @param {*} message
     * @param {*} signature
     * @param {*} star
     */
    submitStar(address, message, signature, star) {
        let self = this;
        return new Promise(async (resolve, reject) => {
          // Time parameter
          const time = parseInt(message.split(':')[1]);
          // Get current time
          let current_time = parseInt(new Date().getTime().toString().slice(0, -3));
          // Get the time difference between the current time and the given time
          const time_elapsed = (current_time - time) / 60;
          // Verify message is valid using bitcoinMessage
          const verified = bitcoinMessage.verify(message, address, signature);

          // If time elapsed is less than 5 minutes and the message is verified,
          // add block to the blockchain
          if(time_elapsed < 5 && verified){
            let block = new BlockClass.Block({data: {"star":star, "owner": address}});
            await this._addBlock(block);
            resolve(block);
          }
          else {
            reject(Error('Error submitting star! Elapsed time must be less than 5 minutes'));
          }
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block
     *  with the hash passed as a parameter.
     * Search on the chain array for the block that has the hash.
     * @param {*} hash
     */
    getBlockByHash(hash) {
        let self = this;
        return new Promise((resolve, reject) => {
          // Find the block with the given hash
          const result = self.chain.filter(block => block.hash === hash)[0];

          if(result){
            resolve(result);
          }
          else{
            reject(Error('Block not found!'));
          }
          });
    }

    /**
     * This method will return a Promise that will resolve with the Block object
     * with the height equal to the parameter `height`
     * @param {*} height
     */
    getBlockByHeight(height) {
        let self = this;
        return new Promise((resolve, reject) => {
            let block = self.chain.filter(p => p.height === height)[0];
            if(block){
                resolve(block);
            }
            else {
                resolve(null);
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with an array of Stars objects existing in the chain
     * and are belongs to the owner with the wallet address passed as parameter.
     * Remember the star should be returned decoded.
     * @param {*} address
     */
    getStarsByWalletAddress (address) {
        let self = this;
        // Define stars array
        let stars = [];
        return new Promise((resolve, reject) => {
          // For each block in the chain
          self.chain.forEach((block) => {
            // Get decoded block data (Excluding Genesis Block)
            if(block.height > 0){
              // Get block data from getBData() function,
              // which returns a resolved promise
              let resolved_data = block.getBData();
              // Check if the star is owned by the given address
              resolved_data.then(resolved_block => {
                if(resolved_block.body.data.owner === address){
                  // Add star to the stars array
                  stars.push(resolved_block);
                }
              });
            }
          });

          if(stars){
            resolve(stars);
          }

          else{
            reject('No stars found for the given address!');
          }
        });
    }

    /**
     * This method will return a Promise that will resolve with the list of errors when validating the chain.
     * Steps to validate:
     * 1. You should validate each block using `validateBlock`
     * 2. Each Block should check the with the previousBlockHash
     */
    validateChain() {
        let self = this;
        let errorLog = [];
        let previous_hash = null;

        return new Promise(async (resolve, reject) => {
          // Validate each block
          self.chain.forEach((block) => {
            const result = block.validate();
            // If the block is not valid, add block to the error log
            if(result != block){
              errorLog.push(result);
            }
            if(previous_hash != block.previousBlockHash){
              errorLog.push(block);
            }
            previous_hash = block.hash;

          });

          if(errorLog){
              resolve(errorLog);
          }
          else {
              reject("Valid Chain");
          }

        });
    }
}

module.exports.Blockchain = Blockchain;
