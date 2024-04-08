import React, {useCallback, useEffect, useState} from 'react';
import {
  GithubLoginButton,
  GoogleLoginButton,
  MicrosoftLoginButton,
  TwitterLoginButton,
} from 'react-social-login-buttons';
import {LoginSocialGithub, LoginSocialGoogle, LoginSocialMicrosoft,} from 'reactjs-social-login';

import LoginSocialTwitter from '../components/LoginSocialTwitter';
import User from './User';
import axios from 'axios';
import {useLocation} from 'react-router-dom';
import CryptoJS from 'crypto-js';
import LoginService from '../services/LoginService';

const LoginPage = () => {
  const location = useLocation();
  const [provider, setProvider] = useState('');
  const [profile, setProfile] = useState(location.state?.userData || null);
  const loginService = new LoginService(); // Instantiate LoginService

  const onLoginStart = useCallback(() => {
    alert('login start');
  }, []);

  const onLogoutSuccess = useCallback(() => {
    setProfile(null);
    setProvider('');
    alert('logout success');
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

  const fetchGoogleUserInfo = async (accessToken) => {
    try {
      const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      // Assuming the response contains the user info
      if (response.data) {
        await loginService.loginWithGoogle(accessToken, response.data.sub); // Call loginWithGoogle from LoginService
        const walletaddress = await loginService.getAddress();
        console.log('response.data: ', response.data);
        // Here you can set the profile with the data you need
        // For example, if you want to store the name and email:
        setProfile({
          name: response.data.name,
          email: response.data.email,
          walletaddress: walletaddress
        });
        setProvider('google'); // Or dynamically based on the provider
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error);
    }
  };

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

            <LoginSocialGoogle
              isOnlyGetToken
              client_id={process.env.REACT_APP_GG_APP_ID || ''}
              onLoginStart={onLoginStart}
              onResolve={async ({ provider, data }) => {
                console.log('provider: ', provider, 'data: ', data);
                if (data.access_token) {
                  await fetchGoogleUserInfo(data.access_token);
                }
              }}
              onReject={(err) => {
                console.log(err);
              }}
            >
              <GoogleLoginButton />
            </LoginSocialGoogle>

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
