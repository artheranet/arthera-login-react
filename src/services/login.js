import { loginWithGoogleToken } from './mpc';
import { computeAddress } from '@ethersproject/transactions';
import { JsonRpcProvider } from '@ethersproject/providers';
import { ARTHERA_NETWORK_DETAILS, CHAIN_ID } from '../Constants';

export default class Login {
  provider = new JsonRpcProvider(ARTHERA_NETWORK_DETAILS[CHAIN_ID].rpcUrls[0], ARTHERA_NETWORK_DETAILS[CHAIN_ID]);

  async loginWithGoogle(client_id, token, sub) {
    this.userid = sub;
    const pubkey = await loginWithGoogleToken(client_id, this.userid, token);
    this.wallet = computeAddress(`0x${pubkey}`);
  }

  getUserId() {
    return this.userid;
  }

  getWallet() {
    return this.wallet;
  }

  logout() {
    this.userid = null;
    this.wallet = null;
  }
}
