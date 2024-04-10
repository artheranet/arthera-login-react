import React, { useCallback, useState } from 'react';
import User from './User';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { decodeJwt } from 'jose';
import { ARTHERA_TESTNET_ID, ArtheraLogin } from '@artherachain/mpc-sdk';

const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

const LoginPage = () => {
  const [socialProvider, setSocialProvider] = useState('');
  const [profile, setProfile] = useState(null);
  const [sdk, _] = useState(new ArtheraLogin(ARTHERA_TESTNET_ID));

  const onLogoutSuccess = useCallback(() => {
    setProfile(null);
    setSocialProvider('');
    sdk.logout();
    // alert('logout success');
  }, []);

  return (
    <>
      {socialProvider && profile ? (
        <User provider={socialProvider} profile={profile} onLogout={onLogoutSuccess} sdk={sdk}/>
      ) : (
        <div style={{display: "flex", justifyContent: "center", alignItems: "center", height: "100vh"}}>
          <div style={{ width: 'fit-content' }}>

            <GoogleOAuthProvider clientId={googleClientId}>
              <GoogleLogin
                onSuccess={async(response) => {
                  if (response.credential) {
                    await sdk.loginWithGoogleToken(googleClientId, response.credential);
                    const wallet = sdk.getWallet();
                    const decodedToken = decodeJwt(response.credential);
                    setProfile({
                      name: decodedToken.name,
                      email: decodedToken.email,
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
