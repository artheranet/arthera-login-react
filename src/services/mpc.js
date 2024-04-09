import { MPC_AUTH_ENDPOINT } from '../Constants';

export const loginWithGoogleToken =  async (client_id, user_id, token) => {
  let resp = await fetch(`${MPC_AUTH_ENDPOINT}/v1/login_google_jwt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id,
      token,
      client_id,
    }),
  });

  switch (resp.status) {
    case 200:
      return (await resp.json()).public_key;
    case 401:
      throw new Error('Unauthorized access - status 401');
    case 404:
      throw new Error('Endpoint not found - status 404');
    default:
      throw new Error('status ' + resp.status);
  }
}
