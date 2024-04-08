import React, {useCallback, useEffect, useState} from 'react';
import {
  GithubLoginButton,
  MicrosoftLoginButton,
  TwitterLoginButton,
} from 'react-social-login-buttons';
import {LoginSocialGithub, LoginSocialMicrosoft,} from 'reactjs-social-login';

import LoginSocialTwitter from '../components/LoginSocialTwitter';
import User from './User';
import axios from 'axios';
import {useLocation} from 'react-router-dom';
import CryptoJS from 'crypto-js';
import LoginService from '../services/LoginService';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { decodeJwt } from 'jose';

const LoginPage = () => {
  const location = useLocation();
  const [provider, setProvider] = useState('');
  const [profile, setProfile] = useState(location.state?.userData || null);
  const loginService = new LoginService(); // Instantiate LoginService

  const onLoginStart = useCallback(() => {
    // alert('login start');
  }, []);

  const onLogoutSuccess = useCallback(() => {
    setProfile(null);
    setProvider('');
    // alert('logout success');
  }, []);

  // Existing useEffect for setting redirectUrl and logoUrl
  useEffect(() => {
    // If there's user data in the location state, use the provider information if available.
    if (location.state?.userData) {
      const { provider = 'default', ...userData } = location.state.userData;
      setProvider(provider); // Use the provider from userData or 'default'
      setProfile(userData);
    }
  }, [location.state]);

  // Generate the code_verifier and code_challenge
  const generateCodeVerifierAndChallenge = () => {
    const codeVerifier = CryptoJS.lib.WordArray.random(128).toString(CryptoJS.enc.Base64)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const hash = CryptoJS.SHA256(codeVerifier);
    const codeChallenge = CryptoJS.enc.Base64.stringify(hash)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return { codeVerifier, codeChallenge };
  };

  // Store the codeVerifier in the session or local storage to use later
  const { codeVerifier, codeChallenge } = generateCodeVerifierAndChallenge();

  if(codeVerifier){
    sessionStorage.removeItem('codeVerifier');
    sessionStorage.setItem('codeVerifier', codeVerifier);
  }

  // Your existing login methods here (if any)

  return (
    <>
      {provider && profile ? (
        <User provider={provider} profile={profile} onLogout={onLogoutSuccess} />
      ) : (
        <div className='mt-8 flex justify-content-center'>
          <div className='card' style={{ width: 'fit-content' }}>
            {/* Your existing LoginPage layout and logic here */}

            <GoogleOAuthProvider clientId={process.env.REACT_APP_GG_APP_ID || ''}>
              <GoogleLogin
                onSuccess={async(response) => {
                  if (response.credential) {
                    const decoded = decodeJwt(response.credential);
                    await loginService.loginWithGoogle(response.credential,decoded.sub); // Call loginWithGoogle from LoginService
                    const walletaddress = await loginService.getAddress();
                    // Here you can set the profile with the data you need
                    // For example, if you want to store the name and email:
                    setProfile({
                      name: decoded.name,
                      email: response.email,
                      walletaddress
                    });
                    setProvider('google'); // Or dynamically based on the provider
                  }
                }}
                onError={() => {
                  console.log('Login Failed');
                }}
              />
            </GoogleOAuthProvider>

            {<LoginSocialMicrosoft
              isOnlyGetToken
              code_challenge={codeChallenge}
              code_challenge_method="S256"
              client_id={process.env.REACT_APP_MICROSOFT_APP_ID || ''}
              redirect_uri={'http://localhost:4200/auth'}
              onLoginStart={onLoginStart}
              onResolve={({ provider, data }) => {
                setProvider(provider)
                setProfile(data)
              }}
              onReject={(err) => {
                console.log(err)
              }}
            >
              <MicrosoftLoginButton />
            </LoginSocialMicrosoft>}

            {<LoginSocialGithub
              isOnlyGetToken
              scope="user"
              client_id={process.env.REACT_APP_GITHUB_APP_ID || ''}
              client_secret={process.env.REACT_APP_GITHUB_APP_SECRET || ''}
              redirect_uri={'http://localhost:4200/auth'}
              onLoginStart={onLoginStart}
              onResolve={({ provider, data }) => {
                setProvider('github')
                setProfile(data)
              }}
              onReject={(err) => {
                console.log(err)
              }}
            >
              <GithubLoginButton />
            </LoginSocialGithub>}

            {<LoginSocialTwitter
              isOnlyGetToken
              state='_twitter'
              code_challenge={codeChallenge}
              code_challenge_method="S256"
              client_id={process.env.REACT_APP_TWITTER_V2_APP_KEY || ''}
              redirect_uri={'http://localhost:4200/auth'}
              scope={'tweet.read users.read offline.access'}
              onLoginStart={onLoginStart}
              onResolve={({ provider, data }) => {
                setProvider('twitter')
                setProfile(data)
              }}
              onReject={(err) => {
                console.log(err)
              }}
            >
              <TwitterLoginButton />
            </LoginSocialTwitter>}
          </div>
        </div>
      )}
    </>
  );
};

export default LoginPage;
