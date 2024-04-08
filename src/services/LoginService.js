import { JsonRpcProvider } from "@ethersproject/providers";
import { computeAddress } from "@ethersproject/transactions";
import { decodeJwt } from "jose";
import { AuthMethod } from '../services/mpc.service';
import { CHAIN_ID, ARTHERA_NETWORK_DETAILS } from '../Constants';
import MpcService from "./mpc.service";

export default class LoginService {
    provider = null;
    wallet = null;
    userid = null;
    redirectUrl = null;
    mpcService = new MpcService();
    authService = null;
    history = null;

    constructor(history) {
        this.history = history;
    }

    isLoggedIn() {
        if (this.wallet) {
            return true;
        }

        return !!(this.wallet && this.provider);
    }

    async afterLogin() {
        // Implement any necessary logic after login
    }

    async loginWithMicrosoft(token, id) {
        this.userid = id;
        const publicKey = await this.mpcService.getPublicKey(AuthMethod.MICROSOFT, this.userid, token);
        this.wallet = computeAddress(`0x${publicKey}`);
        this.provider = new JsonRpcProvider(ARTHERA_NETWORK_DETAILS[CHAIN_ID].rpcUrls[0], ARTHERA_NETWORK_DETAILS[CHAIN_ID]);
    }

    async loginWithGithub(code, user) {
        console.log("github code:", code);
        this.userid = user.id.toString();
        const token = user.access_token;
        const publicKey = await this.mpcService.getPublicKey(AuthMethod.GITHUB, this.userid, token);
        this.wallet = computeAddress(`0x${publicKey}`);
        this.provider = new JsonRpcProvider(ARTHERA_NETWORK_DETAILS[CHAIN_ID].rpcUrls[0], ARTHERA_NETWORK_DETAILS[CHAIN_ID]);

    }

    async loginWithTwitter(token, user) {
        console.log("user:", user);
        this.userid = user.id.toString();
        const publicKey = await this.mpcService.getPublicKey(AuthMethod.TWITTER, this.userid, token);
        this.wallet = computeAddress(`0x${publicKey}`);
        this.provider = new JsonRpcProvider(ARTHERA_NETWORK_DETAILS[CHAIN_ID].rpcUrls[0], ARTHERA_NETWORK_DETAILS[CHAIN_ID]);
    }

    async loginWithGoogle(token, sub) {
        this.userid = sub;
        const publicKey = await this.mpcService.getPublicKey(AuthMethod.GOOGLE, this.userid, token);
        this.wallet = computeAddress(`0x${publicKey}`);
        this.provider = new JsonRpcProvider(ARTHERA_NETWORK_DETAILS[CHAIN_ID].rpcUrls[0], ARTHERA_NETWORK_DETAILS[CHAIN_ID]);
    }

    async getAddress() {
        if(!this.wallet) {
            return null;
        }
        if (typeof this.wallet === 'object') {
            return this.wallet.address;
        }
        return this.wallet;
    }

    getProvider() {
        return this.provider;
    }

    async logout() {
        this.provider = null;
        this.wallet = null;
        this.userid = null;
        this.mpcService.logout();
        const oauthProvider = sessionStorage.getItem('oauth2_provider');
        if (oauthProvider && oauthProvider !== 'twitter' && oauthProvider !== 'github') {
            await this.authService.signOut(true);
        }
        sessionStorage.clear();
    }

    async continue() {
        const searchParams = new URLSearchParams(window.location.search);
        this.redirectUrl = searchParams.get('redirectUrl');
        if (this.redirectUrl) {
            window.location.href = this.redirectUrl;
        } else {
            await this.history.push('/home');
        }
    }

    async init(redirectUrl, logoUrl) {
        await this.loginWithRedirect(redirectUrl, logoUrl);
    }

    isLoggedInProvider() {
        const provider = sessionStorage.getItem('oauth2_provider');

        if (provider === 'twitter' || provider === 'github') {
            try {
                return this.userid || false;
            } catch (error) {
                console.error(`Error decoding JWT token for ${provider}:`, error);
                return false;
            }
        }

        try {
            const decoded = decodeJwt(this.userid);
            return !!decoded.sub;
        } catch (error) {
            console.error("Error decoding JWT token:", error);
            return false;
        }
    }
}
