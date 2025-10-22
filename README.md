# Movement Privy Wallet - React Native

This example showcases how to build a Movement blockchain wallet using Privy's Expo SDK in a React Native application.

## Getting Started

### 1. Clone the Project

```bash
git clone https://github.com/dumbdevss/Movement-react-native-privy-template.git movement-privy-wallet
cd movement-privy-wallet
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Backend Server

Navigate to the `expo-backend` directory and start the backend server that connects to the Aptos SDK:

```bash
cd expo-backend
npm install
npm start
```

Keep this backend server running - it's required for Movement wallet functionality.

### 4. Configure Privy Dashboard

Before configuring your app, you need to set up your Privy Dashboard:

1. Go to your [Privy Dashboard](https://dashboard.privy.io/apps?page=settings&setting=clients)
2. Configure an app client for mobile
3. **Add your App ID and Client ID** (you'll use these in the next step)
4. **Set App Identifiers** to include:
   - `host.exp.Exponent` (for Expo Go development)
   - `dev.privy.example` (or replace with your own identifier)
5. **Set URL Schemes** to include:
   - `exp` (required for Expo)
   - `myapp` (or replace with your custom scheme)

### 5. Configure Environment

Update the `app.json` file with your Privy credentials and custom settings:

```json
{
  "expo": {
   "extra": {
      "privyAppId": "<APP_ID>",
      "privyClientId": "<CLIENT_ID>",
      "passkeyAssociatedDomain": "https://<your-associated-domain>"
    },
    "scheme": "myapp",
    "ios": {
      "usesAppleSignIn": true,
      "supportsTablet": true,
      "bundleIdentifier": "dev.privy.example",
      "associatedDomains": ["webcredentials:<your-associated-domain>"],
      "infoPlist": {
        "NSAppTransportSecurity": {
          "NSAllowsArbitraryLoads": true
        }
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "dev.privy.example"
    },
  }
}
```

**Customization Options:**

- Replace `myapp` with your own URL scheme (and add it to Dashboard URL schemes)
- Replace `dev.privy.example` with your own bundle identifier (and add it to Dashboard App identifiers)
- Configure `passkeyAssociatedDomain` for iOS passkey support

### 6. Start Development Server

Open a new terminal window (keep the backend running) and start the Expo development server:

```bash
npm start
```

This will start the Expo development server. You can then:

- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your device

## Core Functionality

### 1. Login with Privy

Login or sign up using Privy's pre-built modals optimized for mobile.

[`components/UserScreen.tsx`](./components/UserScreen.tsx)

```tsx
import { usePrivy } from "@privy-io/expo";
const { user } = usePrivy();
// User is automatically shown LoginScreen if not authenticated
```

### 2. Create Movement Wallet

Programmatically create an embedded wallet for the Movement blockchain using the Aptos chain type.

[`components/UserScreen.tsx`](./components/UserScreen.tsx)

```tsx
import { useCreateWallet } from "@privy-io/expo/extended-chains";

const { createWallet } = useCreateWallet();

// Create Movement wallet
await createWallet({
  chainType: "aptos",
});
```

### 3. Send Transactions on Movement

Send transactions on the Movement blockchain with native mobile UX.

[`components/UserScreen.tsx`](./components/UserScreen.tsx)

```tsx
import { useCreateWallet } from "@privy-io/expo/extended-chains";

const { createWallet } = useCreateWallet();

const handleSendTransaction = useCallback(async () => {
  if (!activeWallet) return;

  setIsLoadingSend(true);
  try {
    const result = await signAndSubmitTransaction(
      activeWallet.public_key,
      activeWallet.address,
      "0x1::aptos_account::transfer",
      [],
      [
        "0x9b0e90c9f3d8e5b3d8cfc9a0c0f9621c742e5675b4f4e772fbef457b73ef4e4a", 
        1_00000000
      ] // Replace with your test address
    );

    showModal(
      "Transaction Sent ✅",
      `Hash: ${result.transactionHash}\nStatus: ${result.vmStatus}`
    );
    
    // Refresh balance
    const newBalance = await getWalletBalance(activeWallet.address);
    setWalletBalance(newBalance / 1e8);
  } catch (error: any) {
    console.error("Transaction error:", error);
    showModal(
      "Transaction Failed", 
      error.message || "Failed to send transaction"
    );
  } finally {
    setIsLoadingSend(false);
  }
}, [activeWallet, signAndSubmitTransaction, getWalletBalance]);
```

**Transaction Details:**
- Uses `signAndSubmitTransaction` function from the backend
- Transfers APT tokens using `0x1::aptos_account::transfer`
- Amount is specified in Octas (1 APT = 100,000,000 Octas)
- Automatically refreshes wallet balance after successful transaction

## Configuration Checklist

Before running your app, ensure you have:

- ✅ Started the **expo-backend** server (connects to Aptos SDK)
- ✅ Added your **App ID** and **Client ID** to `app.json`
- ✅ Set App Identifiers in Dashboard: `host.exp.Exponent` and `dev.privy.example` (or your custom identifier)
- ✅ Set URL Schemes in Dashboard: `exp` and `myapp` (or your custom scheme)
- ✅ Updated bundle identifiers in `app.json` if using custom values
- ✅ Configured associated domains for iOS passkey support (optional)

## Architecture

This application uses:
- **Frontend**: Expo React Native with Privy SDK
- **Backend**: Node.js server (`expo-backend`) that interfaces with the Aptos SDK
- **Blockchain**: Movement Network (Aptos-compatible)

The backend server is essential for wallet operations and must be running before using the app.

## Relevant Links

- [Privy Dashboard](https://dashboard.privy.io)
- [Privy Documentation](https://docs.privy.io)
- [Expo SDK](https://www.npmjs.com/package/@privy-io/expo)
- [Expo Documentation](https://docs.expo.dev/)
- [Movement Network](https://movementlabs.xyz/)
- [Aptos SDK Documentation](https://aptos.dev/)

## Support

For issues or questions:
- Check the [Privy Documentation](https://docs.privy.io)
- Join the Movement community
- Review Expo documentation for React Native specific questions