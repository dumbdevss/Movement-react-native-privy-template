import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { toHex } from 'viem';
import {
    Aptos,
    AptosConfig,
    Network,
    AccountAddress,
    AccountAuthenticatorEd25519,
    Ed25519PublicKey,
    Ed25519Signature,
    generateSigningMessageForTransaction,
    SimpleTransaction,
    Hex,
    Deserializer,
} from '@aptos-labs/ts-sdk';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- Aptos SDK Setup ---
const MOVEMENT_TESTNET_FULLNODE = 'https://testnet.movementnetwork.xyz/v1';
const FAUCET_URL = 'https://faucet.testnet.movementnetwork.xyz/mint';

const aptosConfig = new AptosConfig({
    network: Network.CUSTOM,
    fullnode: MOVEMENT_TESTNET_FULLNODE,
});
const aptos = new Aptos(aptosConfig);

// ======================================
// 1️⃣ Generate hash (Generic Transaction Builder)
// ======================================
app.post('/generate-hash', async (req, res) => {
    const { sender, function: func, typeArguments, functionArguments } = req.body;

    if (!sender || !func || !Array.isArray(functionArguments)) {
        return res.status(400).json({
            error: 'Missing required fields: sender, function, or functionArguments',
        });
    }

    try {
        const senderAddress = AccountAddress.from(sender);

        // Build generic Move transaction
        const rawTxn = await aptos.transaction.build.simple({
            sender: senderAddress,
            data: {
                function: func,
                typeArguments: typeArguments || [],
                functionArguments,
            },
        });

        // Generate hash for Privy signing
        const message = generateSigningMessageForTransaction(rawTxn);
        const hash = toHex(message);

        const rawTxnHex = rawTxn.bcsToHex().toString();

        res.json({
            success: true,
            hash,
            rawTxnHex: rawTxnHex,
        });
    } catch (error) {
        console.error('Error generating signing hash:', error);
        res.status(500).json({ error: 'Failed to generate signing hash' });
    }
});

// ======================================
// 2️⃣ Submit signed transaction
// ======================================
app.post('/submit-transaction', async (req, res) => {
    const { rawTxnHex, publicKey, signature } = req.body;

    if (!rawTxnHex || !publicKey || !signature) {
        return res.status(400).json({ error: 'Missing rawTxnHex, publicKey, or signature' });
    }

    // Process the public key to ensure it's in the correct format
    let processedPublicKey = publicKey;

    // Remove 0x prefix if present
    if (processedPublicKey.toLowerCase().startsWith('0x')) {
        processedPublicKey = processedPublicKey.slice(2);
    }

    // Remove leading zeros if present (sometimes keys have 00 prefix)
    if (processedPublicKey.length === 66 && processedPublicKey.startsWith('00')) {
        processedPublicKey = processedPublicKey.substring(2);
    }

    // Ensure we have exactly 64 characters (32 bytes in hex)
    if (processedPublicKey.length !== 64) {
        throw new Error(`Invalid public key length: expected 64 characters, got ${processedPublicKey.length}. Key: ${processedPublicKey}`);
    }

    try {
        const senderAuthenticator = new AccountAuthenticatorEd25519(
            new Ed25519PublicKey(processedPublicKey),
            new Ed25519Signature(signature)
        );

       const backendRawTxn = SimpleTransaction.deserialize(new Deserializer(Hex.fromHexInput(rawTxnHex).toUint8Array()));

        const pendingTxn = await aptos.transaction.submit.simple({
            transaction: backendRawTxn,
            senderAuthenticator: senderAuthenticator,
        });

        const executedTxn = await aptos.waitForTransaction({ transactionHash: pendingTxn.hash });

        res.json({
            success: executedTxn.success,
            transactionHash: executedTxn.hash,
            vmStatus: executedTxn.vm_status,
        });
    } catch (error) {
        console.error('Error submitting signed transaction:', error);
        res.status(500).json({ error: 'Failed to submit signed transaction' });
    }
});

// ======================================
// 3️⃣ Faucet tokens
// ======================================
app.post('/faucet', async (req, res) => {
    const { address, amount } = req.body;
    if (!address || !amount) {
        return res.status(400).json({ error: 'Missing address or amount' });
    }

    try {
        const response = await fetch(`${FAUCET_URL}?amount=${amount}&address=${address}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Faucet request failed: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error requesting faucet tokens:', error);
        res.status(500).json({ error: 'Failed to request faucet tokens' });
    }
});

// ======================================
// 4️⃣ Get MOVE balance
// ======================================
app.get('/balance/:address', async (req, res) => {
    const { address } = req.params;
    try {
        const accountAddress = AccountAddress.from(address);
        const balance = await aptos.getAccountAPTAmount({ accountAddress });
        res.json({ balance });
    } catch (error) {
        console.error('Error fetching balance:', error);
        res.status(500).json({ error: 'Failed to fetch balance' });
    }
});

// ======================================
// 5️⃣ Get account info
// ======================================
app.get('/account-info/:address', async (req, res) => {
    const { address } = req.params;
    try {
        const accountAddress = AccountAddress.from(address);
        const info = await aptos.getAccountInfo({ accountAddress });
        res.json(info);
    } catch (error) {
        console.error('Error fetching account info:', error);
        res.status(500).json({ error: 'Failed to fetch account info' });
    }
});

// ======================================
// 6️⃣ Health check
// ======================================
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// ======================================
// 7️⃣ View function (read-only)
// ======================================
app.post('/view', async (req, res) => {
    const { function: func, typeArguments, functionArguments } = req.body;

    if (!func) {
        return res.status(400).json({ error: 'Missing required field: function' });
    }

    try {
        const result = await aptos.view({
            payload: {
                function: func, // Module address::module_name::function_name
                typeArguments: typeArguments || [], // Type arguments if required
                functionArguments: functionArguments || [], // Arguments for the function
            },
        });

        res.json({ success: true, result });
    } catch (error) {
        console.error('Error calling view function:', error);
        res.status(500).json({ error: 'Failed to call view function' });
    }
});

app.listen(port, () => {
    console.log(`✅ Backend running at http://localhost:${port}`);
});
