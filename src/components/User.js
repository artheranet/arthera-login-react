import React, { useCallback, useState } from 'react';

const ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "version",
        "type": "uint8"
      }
    ],
    "name": "Initialized",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "counter",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "increment",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "initialize",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "isOwner",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

import Web3 from 'web3';

import { ARTHERA_NETWORK_DETAILS, ARTHERA_TESTNET_ID } from '@artherachain/mpc-sdk';

const User = ({ provider, profile, onLogout, sdk }) => {
  const [txReceipt, setTxReceipt] = useState(null);

  const onSendTxEthers = useCallback(async () => {
    try {
      const receipt = await sdk.getSigner().sendTransaction({
        to: sdk.getWallet(),
        value: "100000000000000000"
      });
      setTxReceipt(receipt);
    } catch (e) {
      alert(e);
    }
  });

  const onSendTxWeb3 = useCallback(async () => {
    const web3 = new Web3(ARTHERA_NETWORK_DETAILS[10243].rpcUrls[0]);
    const contract = new web3.eth.Contract(ABI, "0xcF9366a34BBB2166b0FA61461f898428fA4926ac");
    const tx_data = contract.methods.increment().encodeABI();
    const nonce = await web3.eth.getTransactionCount(profile.wallet);

    const rawTx = {
      from: profile.wallet,
      to: '0xcF9366a34BBB2166b0FA61461f898428fA4926ac',
      nonce: '0x'+web3.utils.toBN(nonce).toString('hex'),
      gasLimit: '0x2DC6C0',
      gasPrice: '0x3d1ac2e0',
      data: tx_data,
      value: '0x0',
      chainId: ARTHERA_TESTNET_ID
    };

    const signedTx = await sdk.getSigner().signTransaction(rawTx);

    web3.eth.sendSignedTransaction(signedTx)
      .on("receipt", (receipt) => {
        console.log(setTxReceipt(receipt.transactionHash));
      });

  });

  return (
    <div className="user-info">
      <h2>User Information</h2>
      <p><strong>Provider:</strong> {provider}</p>
      <p><strong>Name:</strong> {profile.name}</p>
      {profile.email && <p><strong>Email:</strong> {profile.email}</p>}
      <p><strong>Wallet Address:</strong> {profile.wallet}</p>
      <button onClick={onLogout}>Logout</button>
      <button onClick={onSendTxEthers}>Send Transaction with ethers.js</button>
      <button onClick={onSendTxWeb3}>Send Transaction with web3.js</button>

      {txReceipt && (<p>Transaction ID: <a href={`https://explorer-test.arthera.net/tx/${txReceipt.hash}`} target={'_blank'} rel="noreferrer"> {txReceipt.hash}</a></p>)}
    </div>
  );
};

export default User;
