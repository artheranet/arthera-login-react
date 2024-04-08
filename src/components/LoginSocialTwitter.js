/* eslint-disable no-unused-vars */
/* eslint-disable camelcase */
/**
 *
 * LoginSocialTwitter
 *
 */

import React, { memo, useCallback, useEffect } from 'react';

const TWITTER_URL = 'https://twitter.com';
const TWITTER_API_URL = 'https://api.twitter.com';
const PREVENT_CORS_URL = 'https://cors.bridged.cc';

export const LoginSocialTwitter = ({
  client_id,
  className = '',
  redirect_uri,
  children,
  fields = 'created_at,description,entities,id,location,name,pinned_tweet_id,profile_image_url,protected,public_metrics,url,username,verified,withheld',
  state = 'state',
  scope = 'users.read%20tweet.read',
  isOnlyGetCode = false,
  isOnlyGetToken = false,
  onLoginStart,
  onReject,
  onResolve,
  code_challenge = 'challenge',
  code_challenge_method = 'plain',
}) => {
  useEffect(() => {
    const popupWindowURL = new URL(window.location.href);
    const code = popupWindowURL.searchParams.get('code');
    const state = popupWindowURL.searchParams.get('state');
    if (state?.includes('_twitter') && code) {
      localStorage.setItem('twitter', code);
      window.close();
    }
  }, []);

  const onChangeLocalStorage = useCallback(() => {
    window.removeEventListener('storage', onChangeLocalStorage, false);
    const code = localStorage.getItem('twitter');
    if (code) {
      localStorage.removeItem('twitter');
    }
  }, []);

  const onLogin = useCallback(async () => {
    onLoginStart && onLoginStart();
    window.addEventListener('storage', onChangeLocalStorage, false);
    const oauthUrl = `${TWITTER_URL}/i/oauth2/authorize?response_type=code&client_id=${client_id}&redirect_uri=${redirect_uri}&scope=${scope}&state=${state}&code_challenge=${code_challenge}&code_challenge_method=${code_challenge_method}`;
    const width = 450;
    const height = 730;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    window.open(
      oauthUrl,
      'twitter',
      'menubar=no,location=no,resizable=no,scrollbars=no,status=no, width=' +
        width +
        ', height=' +
        height +
        ', top=' +
        top +
        ', left=' +
        left,
    );
  }, [
    scope,
    state,
    client_id,
    onLoginStart,
    redirect_uri,
    onChangeLocalStorage,
    code_challenge,
    code_challenge_method,
  ]);

  return (
    <div className={className} onClick={onLogin}>
      {children}
    </div>
  );
};

export default memo(LoginSocialTwitter);