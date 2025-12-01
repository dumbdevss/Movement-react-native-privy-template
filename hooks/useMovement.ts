// hooks/useMovementWallet.ts
import { useCallback } from "react";
import { useSignRawHash } from "@privy-io/expo/extended-chains";

const API_BASE_URL = "https://privy-backend-1.onrender.com"; // ⬅️ replace with your deployed backend URL

export function useMovementWallet() {
  const { signRawHash } = useSignRawHash();

  /**
   * 🔹 Sign + Submit transaction using backend + Privy
   */
  const signAndSubmitTransaction = useCallback(
    async (
      publicKey: string,
      walletAddress: string,
      func: string,
      typeArguments: string[] = [],
      functionArguments: any[] = []
    ) => {
      try {
        // Step 1: Request hash + rawTxnHex from backend
        const hashResponse = await fetch(`${API_BASE_URL}/generate-hash`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sender: walletAddress,
            function: func,
            typeArguments,
            functionArguments,
          }),
        });

        if (!hashResponse.ok) {
          throw new Error("❌ Failed to generate transaction hash");
        }

        const { hash, rawTxnHex } = await hashResponse.json();

        // Step 2: Sign hash using Privy
        const { signature } = await signRawHash({
          address: walletAddress,
          chainType: "aptos",
          hash,
        });

        // Step 3: Submit signed transaction back to backend
        const submitResponse = await fetch(`${API_BASE_URL}/submit-transaction`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rawTxnHex,
            publicKey,
            signature,
          }),
        });

        if (!submitResponse.ok) {
          throw new Error("❌ Failed to submit signed transaction");
        }

        const result = await submitResponse.json();

        if (!result.success) {
          throw new Error(`VM Error: ${result.vmStatus || "Unknown failure"}`);
        }

        return result;
      } catch (error) {
        console.error("🚨 Error in signAndSubmitTransaction:", error);
        throw error;
      }
    },
    [signRawHash]
  );

  /**
   * 🔹 Get wallet balance
   */
  const getWalletBalance = useCallback(async (walletAddress: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/balance/${walletAddress}`);
      if (!res.ok) throw new Error("❌ Failed to fetch balance");
      const { balance } = await res.json();
      return balance;
    } catch (error) {
      console.error("Error fetching balance:", error);
      throw error;
    }
  }, []);

  /**
   * 🔹 Get account info
   */
  const getAccountInfo = useCallback(async (walletAddress: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/account-info/${walletAddress}`);
      if (!res.ok) throw new Error("❌ Failed to fetch account info");
      const info = await res.json();
      return info;
    } catch (error) {
      console.error("Error fetching account info:", error);
      throw error;
    }
  }, []);

  /**
   * 🔹 Faucet
   */
  const requestFaucet = useCallback(async (walletAddress: string, amount = 1000000000) => {
    try {
      const res = await fetch(`${API_BASE_URL}/faucet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: walletAddress, amount }),
      });

      if (!res.ok) throw new Error("❌ Faucet request failed");
      const data = await res.json();
      return data;
    } catch (error) {
      console.error("Error requesting faucet:", error);
      throw error;
    }
  }, []);

  const viewFunction = useCallback(async (func: string, typeArguments: string[] = [], functionArguments: any[] = []) => {
    try {
      const res = await fetch(`${API_BASE_URL}/view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          function: func,
          typeArguments,
          functionArguments,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to call view function');
      }

      const data = await res.json();
      return data.result;
    } catch (error) {
      console.error('Error calling view function:', error);
      throw error;
    }
  }, []);

  return {
    signAndSubmitTransaction,
    getWalletBalance,
    getAccountInfo,
    requestFaucet,
    viewFunction,
  };
}
