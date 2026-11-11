import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { injectedWallet } from "@rainbow-me/rainbowkit/wallets";
import { qorechain, qorechainTestnet } from "@qorechain/evm";
import { qorexWallet } from "@qorechain/qorex-rainbowkit";
import { createConfig, http } from "wagmi";
import type { Chain } from "viem";

// QoreX first, then any other injected (EIP-1193) wallet. Neither uses
// WalletConnect, so the project id is only a placeholder unless you add a
// WalletConnect-based wallet.
const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [() => qorexWallet({ pollAccountsOnFocus: true }), injectedWallet],
    },
  ],
  {
    appName: "QoreChain dApp",
    projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "unused",
  },
);

// The testnet is listed first, so a fresh connection lands there.
// NOTE: @qorechain/evm 0.12.0's chain objects were typed against an older viem
// whose PrepareTransactionRequestPhase had 3 values; viem 2.57 adds a 4th
// ("afterFillTransactionError"). The cast is type-only — at runtime the chain
// objects are plain viem chains and work unchanged.
export const config = createConfig({
  chains: [qorechainTestnet as Chain, qorechain as Chain],
  connectors,
  transports: {
    [qorechainTestnet.id]: http(),
    [qorechain.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
