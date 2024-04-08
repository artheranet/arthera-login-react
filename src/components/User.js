import React from 'react';

const User = ({ provider, profile, onLogout }) => {
  return (
    <div className="user-info">
      <h2>User Information</h2>
      <p><strong>Provider:</strong> {provider}</p>
      <p><strong>Name:</strong> {profile.name}</p>
      {profile.email && <p><strong>Email:</strong> {profile.email}</p>}
      <p><strong>Wallet Address:</strong> {profile.walletaddress}</p>
      <button onClick={onLogout}>Logout</button>
    </div>
  );
};

export default User;