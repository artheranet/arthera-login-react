import React, { useCallback, useState } from 'react';

import Web3 from 'web3';

import { ARTHERA_NETWORK_DETAILS, ARTHERA_TESTNET_ID } from '@artherachain/mpc-sdk';
import { SIMPLE_CONTRACT_ABI, SIMPLE_CONTRACT_ADDRESS } from '../constants';

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
    const contract = new web3.eth.Contract(SIMPLE_CONTRACT_ABI, SIMPLE_CONTRACT_ADDRESS);
    const tx_data = contract.methods.increment().encodeABI();
    const nonce = await web3.eth.getTransactionCount(profile.wallet);

    const rawTx = {
      from: profile.wallet,
      to: SIMPLE_CONTRACT_ADDRESS,
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
