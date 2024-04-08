import { useCallback } from 'react';
import { hashMessage, splitSignature, hexlify, hexZeroPad, joinSignature } from '@ethersproject/bytes';
import { keccak256 } from '@ethersproject/keccak256';
import { serialize } from '@ethersproject/transactions';
import { resolveProperties } from '@ethersproject/properties';
import { _TypedDataEncoder } from '@ethersproject/hash';
import { AuthMethod } from '../services/mpc.service';

const useMpcSigner = (mpcService, address, provider) => {
    const getAddress = useCallback(async () => {
        return address;
    }, [address]);

    const signMessage = useCallback(async (message) => {
        const signature = await signDigest(hashMessage(message));
        return joinSignature(signature);
    }, [mpcService]);

    const signDigest = useCallback(async (data) => {
        const dataHex = hexlify(data);
        const sign = await mpcService.sign(dataHex.slice(2), AuthMethod.GOOGLE);
        const r = sign.slice(0, 64);
        const s = sign.slice(64, 128);
        const recid = sign.slice(128, 130) === "00" ? 0 : 1;

        return splitSignature({
            recoveryParam: recid,
            r: hexZeroPad(`0x${r}`, 32),
            s: hexZeroPad(`0x${s}`, 32),
        });
    }, [mpcService]);

    const signTransaction = useCallback(async (transaction) => {
        return resolveProperties(transaction).then(async (tx) => {
            if (tx.from != null) {
                if (getAddress(tx.from) !== address) {
                    throw new Error(`transaction from address mismatch (from:${tx.from} address:${address})`);
                }
                delete tx.from;
            }
            const signature = await signDigest(keccak256(serialize(tx)));
            return serialize(tx, signature);
        });
    }, [address, mpcService]);

    const resolveEnsNames = async (domain, types, value) => {

        const resolvedDomain = { ...domain };
        if (domain.name && typeof domain.name === 'string') {
            resolvedDomain.name = await provider.resolveName(domain.name) || domain.name;
        }

        const resolvedValue = { ...value };
        for (const key of Object.keys(types)) {
            const fields = types[key];
            for (const field of fields) {
                if (field.type === 'address' && value[field.name] && typeof value[field.name] === 'string') {
                    resolvedValue[field.name] = await provider.resolveName(value[field.name]) || value[field.name];
                }
            }
        }

        return { resolvedDomain, resolvedValue };
    };


    const _signTypedData = useCallback(async (domain, types, value) => {
        if (!provider) {
            throw new Error("Provider is required for ENS name resolution.");
        }

        const { resolvedDomain, resolvedValue } = await resolveEnsNames(domain, types, value);

        const encodedData = _TypedDataEncoder.encode(resolvedDomain, types, resolvedValue);
        const signature = await signDigest(keccak256(encodedData));
        return joinSignature(signature);
    }, [mpcService, provider]);

    return { getAddress, signMessage, signDigest, signTransaction, _signTypedData };
};

export default useMpcSigner;
