import React, { useCallback, useState } from 'react';
import User from './User';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { decodeJwt } from 'jose';
import { ArtheraLogin } from '@artherachain/mpc-sdk';

const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

const LoginPage = () => {
  const [socialProvider, setSocialProvider] = useState('');
  const [profile, setProfile] = useState(null);
  const [txReceipt, setTxReceipt] = useState(null);
  const [sdk, setSdk] = useState(new ArtheraLogin(10243));

  const onLogoutSuccess = useCallback(() => {
    setProfile(null);
    setSocialProvider('');
    sdk.logout();
    // alert('logout success');
  }, []);

  const onSendTx = useCallback(async () => {
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

  return (
    <>
      {socialProvider && profile ? (
        <User provider={socialProvider} profile={profile} onLogout={onLogoutSuccess} onSendTx={onSendTx} txReceipt={txReceipt}/>
      ) : (
        <div style={{display: "flex", justifyContent: "center", alignItems: "center", height: "100vh"}}>
          <div style={{ width: 'fit-content' }}>

            <GoogleOAuthProvider clientId={googleClientId}>
              <GoogleLogin
                onSuccess={async(response) => {
                  if (response.credential) {
                    const decoded = decodeJwt(response.credential);
                    await sdk.loginWithGoogleToken(googleClientId, decoded.sub, response.credential);
                    const wallet = sdk.getWallet();
                    setProfile({
                      name: decoded.name,
                      email: decoded.email,
                      wallet
                    });
                    setSocialProvider('google');
                  }
                }}
                onError={() => {
                  console.log('Login Failed');
                }}
              />
            </GoogleOAuthProvider>
          </div>
        </div>
      )}
    </>
  );
};

export default LoginPage;
