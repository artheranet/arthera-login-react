import React from 'react';

const User = ({ provider, profile, onLogout, onSendTx, txReceipt }) => {
  return (
    <div className="user-info">
      <h2>User Information</h2>
      <p><strong>Provider:</strong> {provider}</p>
      <p><strong>Name:</strong> {profile.name}</p>
      {profile.email && <p><strong>Email:</strong> {profile.email}</p>}
      <p><strong>Wallet Address:</strong> {profile.wallet}</p>
      <button onClick={onLogout}>Logout</button>
      <button onClick={onSendTx}>Send Transaction</button>

      {txReceipt && (<p>Transaction ID: <a href={`https://explorer-test.arthera.net/tx/${txReceipt.hash}`} target={'_blank'} rel="noreferrer"> {txReceipt.hash}</a></p>)}
    </div>
  );
};

export default User;
