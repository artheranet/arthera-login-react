import nacl from "tweetnacl";

export const genInstanceId = () => {
    const bytes = new Uint8Array(32);
    window.crypto.getRandomValues(bytes);
    return bytes;
};

export const encodeHex = (a) =>
    a.reduce((s, b) => s + b.toString(16).padStart(2, "0"), "");

export const decodeHex = (s) => {
    let bytes = s.match(/[0-9A-Fa-f]{2}/g);
    if (!bytes) {
        throw new Error("bad hex string");
    }
    return Uint8Array.from(bytes.map((byte) => parseInt(byte, 16)));
};

export const verifyingKey = (sk) => {
    if (sk.length !== nacl.sign.seedLength) {
        throw new Error("Invalid SK size");
    }

    const keyPair = nacl.sign.keyPair.fromSeed(sk);
    return new Uint8Array(keyPair.publicKey);
};

const start = async (endpoint, instance, opts) => {
    let resp = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            instance: encodeHex(instance),
            opts,
        }),
    });

    switch (resp.status) {
        case 200:
            return await resp.json();
        case 401:
            throw new Error("Unauthorized access - status 401");
        case 404:
            throw new Error("Endpoint not found - status 404");
        default:
            throw new Error("status " + resp.status);
    }
};

export const AuthMethod = {
    NONE: 0,
    GOOGLE: 1,
    GITHUB: 2,
    FACEBOOK: 3,
    MICROSOFT: 4,
    AMAZON: 5,
    TWITTER: 6,
};

export default class MpcService {
    constructor() {
        const nodes = [
            {
                endpoint: "https://mpc1-test.arthera.net",
                publicKey: decodeHex("0f62495af313faefd1d200c94813c2b5527e5bed44fb151c6826635c0ed49544"),
            },
            {
                endpoint: "https://mpc2-test.arthera.net",
                publicKey: decodeHex("6aa40c5bb6dfb020493ca9b170e67ebe7523c63fabd3db5fe9e37f90bd935e4b"),
            },
            {
                endpoint: "https://mpc3-test.arthera.net",
                publicKey: decodeHex("19a66701338a0638a0b3dda9ea7fe23074d20bdbf96d2ce7bee736467009c916"),
            },
            {
                endpoint: "https://mpc4-test.arthera.net",
                publicKey: decodeHex("8f99bafe90c4f13a530453c4147edf53674530a7a1286a9385e8bc4549b4d86d"),
            },
            {
                endpoint: "https://mpc5-test.arthera.net",
                publicKey: decodeHex("f34d2a6acdbd54bae61f3677c68a214d27f9423d5f314b5f930dfc18f20a1698"),
            },
        ];

        this.cluster = {
            setup: {
                relay: "http://localhost:8080",
                publicKey: verifyingKey(
                    decodeHex("b2012ec2ce6c7b64d58caf81f024a2a7e39ad3cb446973ff3ab363e8593f845d")
                ),
            },
            nodes,
        };

        this.threshold = 3;
        this.ttl = 10;
    }

    async getPublicKey(authMethod, userId, token) {
        if (this.userId === userId && this.publicKey) return this.publicKey;

        const account = await this.getAccount(userId);
        if (account) {
            this.idToken = token;
            this.publicKey =
                account.public_keys[Math.floor(Math.random() * account.public_keys.length)];
            this.userId = userId;
            return this.publicKey;
        }

        let instance = genInstanceId();
        const nodeCount = this.cluster.nodes.length;
        if (nodeCount < 1 || this.threshold < 1 || this.ttl < 1) {
            throw new Error("Node count, threshold, and timeout value must be greater than 0");
        }
        const payload = {
            setup: {
                keygen: {
                    n: nodeCount,
                    t: this.threshold,
                },
            },
            timeout: this.ttl,
        };

        const authTokens = await this.getAuthTokens(userId, token, payload, this.cluster, authMethod);
        const opts = {
            setup: {
                t: this.threshold,
                parties: this.cluster.nodes.map((n) => {
                    return { rank: 0, public_key: encodeHex(n.publicKey) };
                }),
                auth_token: "",
            },
            instance: encodeHex(instance),
            ttl: this.ttl,
        };

        const resp = await Promise.all(
            this.cluster.nodes.map(async (n, i) => {
                opts.setup.auth_token = authTokens[i];
                return await start(n.endpoint + "/v1/keygen", instance, opts);
            })
        );

        this.publicKey = resp[Math.floor(Math.random() * resp.length)].public_key;
        this.userId = userId;
        this.idToken = token;
        return this.publicKey;
    }

    async sign(message, authMethod) {
        function shuffle(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
        }

        shuffle(this.cluster.nodes);
        const selectedNodes = this.cluster.nodes.slice(0, this.threshold);
        const newCluster = {
            setup: this.cluster.setup,
            nodes: selectedNodes,
        };

        const payload = {
            setup: {
                sign: {
                    n: this.cluster.nodes.length,
                    t: this.threshold,
                    message: message,
                },
            },
            timeout: this.ttl,
        };

        const auth_tokens = await this.getAuthTokens(
            this.userId,
            this.idToken,
            payload,
            newCluster,
            authMethod
        );

        const instanceId = genInstanceId();
        let opts = {
            setup: {
                parties: newCluster.nodes.map((n) => {
                    return { rank: 0, public_key: encodeHex(n.publicKey) };
                }),
                message,
                public_key: this.publicKey,
                hash_algo: "hashu32",
                auth_token: "",
            },
            instance: encodeHex(instanceId),
            ttl: 10,
        };

        let resp = await Promise.all(
            newCluster.nodes.slice(0, this.threshold).map(async (n, i) => {
                opts.setup.auth_token = auth_tokens[i];
                return await start(n.endpoint + "/v1/signgen", instanceId, opts);
            })
        );

        return resp[Math.floor(Math.random() * resp.length)].sign;
    }

    async getAuthTokens(userId, token, payload, cluster, auth_method) {
        switch (auth_method) {
            case AuthMethod.GOOGLE:
                return this.createGoogleAccount(payload, token, userId, cluster);
            case AuthMethod.GITHUB:
                return this.createGithubAccount(payload, token, userId, cluster);
            case AuthMethod.MICROSOFT:
                return this.createMicrosoftAccount(payload, token, userId, cluster);
            case AuthMethod.FACEBOOK:
                return this.createFacebookAccount(payload, token, userId, cluster);
            case AuthMethod.TWITTER:
                return this.createTwitterAccount(payload, token, userId, cluster);
            default:
                throw new Error("Unsupported authentication method");
        }
    }

    async createGoogleAccount(payload, token, uuid, cluster) {
        const nodeURLs = cluster.nodes.map((node) => node.endpoint);

        payload["time"] = new Date();

        const authPromises = nodeURLs.map(async (url) => {
            return fetch(`${url}/v1/register_google_jwt`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    token: token,
                    payload,
                    uuid,
                }),
            })
                .then((response) => {
                    if (response.status === 200) {
                        return response.json();
                    } else {
                        throw new Error(`Error registering with ${url}`);
                    }
                })
                .then((json) => {
                    return json.token;
                });
        });

        const nodeAuthTokens = await Promise.all(authPromises);
        let tokens = {};
        for (let i = 0; i < cluster.nodes.length; i++) {
            tokens[i] = nodeAuthTokens[i];
        }

        return tokens;
    }

    async createGithubAccount(payload, token, uuid, cluster) {
        const nodeURLs = cluster.nodes.map((node) => node.endpoint);

        payload["time"] = new Date();

        const authPromises = nodeURLs.map(async (url) => {
            return fetch(`${url}/v1/register_github_jwt`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    token: token,
                    payload,
                    uuid,
                }),
            })
                .then((response) => {
                    if (response.status === 200) {
                        return response.json();
                    } else {
                        throw new Error(`Error registering with ${url}`);
                    }
                })
                .then((json) => {
                    return json.token;
                });
        });

        const nodeAuthTokens = await Promise.all(authPromises);
        let tokens = {};
        for (let i = 0; i < cluster.nodes.length; i++) {
            tokens[i] = nodeAuthTokens[i];
        }

        return tokens;
    }

    async sendCodeToBackend(code) {
        if (this.cluster.nodes.length === 0) {
            throw new Error("No nodes available in the cluster.");
        }

        const firstNodeUrl = this.cluster.nodes[0].endpoint;

        const response = await fetch(`${firstNodeUrl}/v1/get_github_token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code }),
        });

        if (!response.ok) {
            throw new Error(`Error verifying code with ${firstNodeUrl}`);
        }

        const json = await response.json();
        return {
            id: json.user_info.id,
            login: json.user_info.login,
            access_token: json.access_token,
        };
    }
    
    async sendTokenToBackend(token) {
        if (this.cluster.nodes.length === 0) {
            throw new Error("No nodes available in the cluster.");
        }
    
        const payload = {
            token: token,
        };
    
        const firstNodeUrl = this.cluster.nodes[0].endpoint;
    
        const response = await fetch(`${firstNodeUrl}/v1/verify_twitter_token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
    
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error details:', errorData);
            throw new Error(`Error verifying token with ${firstNodeUrl}: ${response.status} - ${response.statusText}`);
        }
    
        const json = await response.json();
        return {
            id: json.id,
            name: json.name,
            username: json.username,
        };
    }
    
    async exchangeTwitterCodeForToken(code, codeVerifier) {
        if (this.cluster.nodes.length === 0) {
            throw new Error("No nodes available in the cluster.");
        }
    
        const firstNodeUrl = this.cluster.nodes[0].endpoint;
    
        const payload = {
            token: code,
            code_verifier: codeVerifier,
        };
    
        const response = await fetch(`${firstNodeUrl}/v1/exchange_code_for_token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
    
        if (!response.ok) {
            throw new Error(`Error exchanging Twitter code for token with ${firstNodeUrl}`);
        }
    
        const json = await response.json();
        return {
            access_token: json.access_token,
        };
    }

    async createMicrosoftAccount(payload, token, uuid, cluster) {
        const nodeURLs = cluster.nodes.map((node) => node.endpoint);

        payload["time"] = new Date();

        const authPromises = nodeURLs.map(async (url) => {
            return fetch(`${url}/v1/register_microsoft_jwt`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    token: token,
                    payload,
                    uuid,
                }),
            })
                .then((response) => {
                    if (response.status === 200) {
                        return response.json();
                    } else {
                        throw new Error(`Error registering with ${url}`);
                    }
                })
                .then((json) => {
                    return json.token;
                });
        });

        const nodeAuthTokens = await Promise.all(authPromises);
        let tokens = {};
        for (let i = 0; i < cluster.nodes.length; i++) {
            tokens[i] = nodeAuthTokens[i];
        }

        return tokens;
    }

    async createFacebookAccount(payload, token, uuid, cluster) {
        const nodeURLs = cluster.nodes.map((node) => node.endpoint);

        payload["time"] = new Date();

        const authPromises = nodeURLs.map(async (url) => {
            return fetch(`${url}/v1/register_facebook_jwt`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    token: token,
                    payload,
                    uuid,
                }),
            })
                .then((response) => {
                    if (response.status === 200) {
                        return response.json();
                    } else {
                        throw new Error(`Error registering with ${url}`);
                    }
                })
                .then((json) => {
                    return json.token;
                });
        });

        const nodeAuthTokens = await Promise.all(authPromises);
        let tokens = {};
        for (let i = 0; i < cluster.nodes.length; i++) {
            tokens[i] = nodeAuthTokens[i];
        }

        return tokens;
    }

    async createTwitterAccount(payload, token, uuid, cluster) {
        const nodeURLs = cluster.nodes.map((node) => node.endpoint);

        payload["time"] = new Date();

        const authPromises = nodeURLs.map(async (url) => {
            return fetch(`${url}/v1/register_twitter_jwt`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    token: token,
                    payload,
                    uuid,
                }),
            })
                .then((response) => {
                    if (response.status === 200) {
                        return response.json();
                    } else {
                        throw new Error(`Error registering with ${url}`);
                    }
                })
                .then((json) => {
                    return json.token;
                });
        });

        const nodeAuthTokens = await Promise.all(authPromises);
        let tokens = {};
        for (let i = 0; i < cluster.nodes.length; i++) {
            tokens[i] = nodeAuthTokens[i];
        }

        return tokens;
    }

    async getAccount(uuid) {
        const nodeURLs = this.cluster.nodes.map((node) => node.endpoint);
        const accountDataPromises = nodeURLs.map((url) => {
            return fetch(`${url}/v1/get_account?uuid=${uuid}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            }).then((response) => {
                if (response.status === 200) {
                    return response.json();
                } else {
                    throw new Error(`Error authenticating with ${url}`);
                }
            });
        });
        const accountData = await Promise.all(accountDataPromises);
        const accountTypes = accountData.map((data) => {
            return data.account_type;
        });
        const accountTypesSet = new Set(accountTypes);
        if (accountTypesSet.size !== 1) {
            throw new Error("Nodes returned different account types");
        }

        const publicKeys = accountData.map((data) => {
            return data.public_keys;
        });

        const publicKeySet = new Set(publicKeys.flat());
        for (let i = 0; i < accountData.length; i++) {
            if (accountData[i].public_keys.length !== publicKeySet.size) {
                throw new Error("Nodes returned different public key lists");
            }
            if (accountTypesSet.has("unknown")) {
                return null;
            }
            return {
                account_type: accountTypesSet.values().next().value,
                public_keys: Array.from(publicKeySet),
            };
        }


    }
    logout() {
        this.publicKey = null;
        this.idToken = null;
        this.userId = null;
    }
}

