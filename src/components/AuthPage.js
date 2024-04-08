import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import qs from 'qs'; // qs is used to properly format the body as URL encoded
import LoginService from '../services/LoginService';


const AuthPage = () => {
  console.log(this);
  const navigate = useNavigate();
  const storedCodeVerifier = sessionStorage.getItem('codeVerifier');
  const loginService = new LoginService(navigate); // Assuming LoginService accepts navigate for redirecting after login
  const queryParams = new URLSearchParams(window.location.search);
  const code = queryParams.get('code');
  const state = queryParams.get('state');

  useEffect(() => {
    handleLogin();
  }, [navigate]);


  const handleLogin = async () => {
    if (code) {
      switch (state) {
        case '_microsoft':
          await handleMicrosoftLogin(code);
          break;
        case '_github':
          await handleGithubLogin(code);
          break;
        case '_twitter':
          await handleTwitterLogin(code);
          break;
        default:
      }
    }
  };

  // Function to handle Microsoft token exchange
  const handleMicrosoftLogin = async (code) => {
console.log("code:", code);
console.log("storedCodeVerifier:", storedCodeVerifier);
      const data = qs.stringify({
        client_id: process.env.REACT_APP_MICROSOFT_APP_ID,
        scope: 'User.Read',
        code: code,
        redirect_uri: 'http://localhost:4200/auth',
        grant_type: 'authorization_code',
        code_verifier: storedCodeVerifier,
      });

      const response = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      const accessToken = response.data.access_token;
      const userData = await fetchUserData(accessToken, 'microsoft');
      if (accessToken) {
        await loginService.loginWithMicrosoft(response.data.id_token, userData.id); // Use loginService to handle Microsoft login
        const walletAddress = await loginService.getAddress();

        // Append the wallet address to the user data
        userData.walletaddress = walletAddress;

        // Navigate to the login page with the updated user data
        navigate('/login', { state: { userData } });
      }

  };

  // Function to fetch user data
  const fetchUserData = async (accessToken, provider) => {
    try {
      let response;
      if (provider === 'microsoft') {
        response = await axios.get('https://graph.microsoft.com/v1.0/me', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      }
      // Add more providers here
      const userData = {
        provider: provider,
        name: response.data.displayName,
        email: response.data.mail || response.data.userPrincipalName,
        id: response.data.id,
      };

      return userData;
    } catch (error) {
      return null;
    }
  };
  
  const handleTwitterLogin = async (code) => {
    try {
      console.log("code:", code);
      console.log("storedCodeVerifier:", storedCodeVerifier);
      const accessToken = await loginService.mpcService.exchangeTwitterCodeForToken(code, storedCodeVerifier);
      console.log("accessToken:", accessToken);
      const user = await loginService.mpcService.sendTokenToBackend(accessToken.access_token);
      await loginService.loginWithTwitter(accessToken.access_token, user);
      const walletAddress = await loginService.getAddress();

      const userData = {
        provider: 'twitter',
        name: user.name,
        id: user.id.toString(),
        walletaddress: walletAddress,
      };

      navigate('/login', { state: { userData } });
    } catch (error) {
      console.error('Error during Twitter login:', error);
    }
  };

  const handleGithubLogin = async (code) => {
    console.log("github code:", code);
    const user = await loginService.mpcService.sendCodeToBackend(code);
      await loginService.loginWithGithub(code, user);
      const walletAddress = await loginService.getAddress();

      const userData = {
        provider: 'github',
        name: user.login,
        id: user.id.toString(),
      };
      // const userData = await fetchGithubUserInfo(code);

      if (userData) {
        // Append the wallet address to the user data
        userData.walletaddress = walletAddress;

        // Navigate to the login page with the updated user data
        navigate('/login', { state: { userData } });
      }
  
  };

  return (
    <div>
      <h1>Auth</h1>
      {/* Your logic here */}
    </div>
  );
};

export default AuthPage;