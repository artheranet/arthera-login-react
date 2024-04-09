import React, { useCallback, useState } from 'react';
import User from './User';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { decodeJwt } from 'jose';
import Login from '../services/login';

const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

const LoginPage = () => {
  const [socialProvider, setSocialProvider] = useState('');
  const [profile, setProfile] = useState(null);
  const login = new Login();

  const onLogoutSuccess = useCallback(() => {
    setProfile(null);
    setSocialProvider('');
    login.logout();
    // alert('logout success');
  }, []);

  return (
    <>
      {socialProvider && profile ? (
        <User provider={socialProvider} profile={profile} onLogout={onLogoutSuccess} />
      ) : (
        <div style={{display: "flex", justifyContent: "center", alignItems: "center", height: "100vh"}}>
          <div style={{ width: 'fit-content' }}>

            <GoogleOAuthProvider clientId={googleClientId}>
              <GoogleLogin
                onSuccess={async(response) => {
                  if (response.credential) {
                    const decoded = decodeJwt(response.credential);
                    await login.loginWithGoogle(googleClientId, response.credential, decoded.sub);
                    const wallet = login.getWallet();
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
