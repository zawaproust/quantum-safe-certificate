# Quantum-Safe Certificate

Check your account's post-quantum status on QoreChain testnet and mint a
certificate proving it is quantum-safe — a registered ML-DSA-87 key plus a
hybrid-signed (secp256k1 + ML-DSA-87) transaction.

Built for the QoreChain **"Build Before Q-Day" Developer Fest**
([build.qorechain.io](https://build.qorechain.io)), **Quantum Pass** track.

## What it does

1. **Connect** your QoreX wallet (or any injected EVM wallet) on the QoreChain
   Diana testnet (EVM chain ID 9800).
2. **Check** your post-quantum status: the dApp reads whether your account holds
   a registered ML-DSA-87 (Dilithium-5) key, and whether an EVM authorisation
   window is open.
3. **Mint** your one Quantum-Safe Certificate — a `QuantumSafeCertificate`
   contract call that records your address, the issue time, and an attestation
   string on-chain, with the transaction hash and an explorer link.

## How it meets the Quantum Pass requirements

| Requirement | How this project meets it |
|---|---|
| Built with `create-qorechain-dapp` | Scaffolded with `npx create-qorechain-dapp --template viem-wagmi --network testnet` |
| Connect QoreX | RainbowKit with the QoreX wallet first (`src/wagmi.ts`) |
| Deploy on testnet | `QuantumSafeCertificate` deployed to `qorechain-diana` (EVM 9800) — see `deployed.json` |
| One hybrid-signed transaction | `scripts/attest.mjs` sends a native-lane transfer signed hybrid (secp256k1 + ML-DSA-87); the setup also opens the EVM window with a hybrid-signed `MsgOpenEVMWindow` — see `attestation.json` |

## Run it

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
```

Set the deployed contract address first (written by `scripts/deploy.mjs`):

```sh
# .env
VITE_CERTIFICATE_ADDRESS=0x...
```

## On-chain pieces (testnet `qorechain-diana`, EVM 9800)

> Status: the contract is written and tested, the deploy scripts are ready, and
> the deployer account is created — but the account is **unfunded** (the faucet
> needs a dashboard sign-in; see BUILD_NOTES.md). The addresses below are filled
> in once the deploy runs.

- Deployer account (Native): `qor1k9lwgypx4uk0fyrzq5x5z3mscw2nugx4n8wgwl`
- Deployer account (EVM): `0xB17EE41026AF2Cf49062050D414770C3953E20D5`
- Certificate contract: *(pending deploy — see `deployed.json` after deploy)*
- Hybrid-signed attestation tx: *(pending — see `attestation.json` after deploy)*
- Explorer: https://explore.qore.network (toggle to Testnet)

## Chain scripts

All in `scripts/` (Node 20+, testnet only, no real funds):

```sh
node scripts/account.mjs        # (re)print the deployer addresses
node scripts/pqc-status.mjs     # balance + PQC status + EVM window (read-only)
node scripts/setup-chain.mjs    # register ML-DSA-87 key + open EVM window (needs funds)
node scripts/deploy.mjs         # deploy QuantumSafeCertificate (needs window)
node scripts/attest.mjs         # hybrid-signed attestation tx (needs registered key)
```

## Contract

`contracts/QuantumSafeCertificate.sol` (Solidity 0.8.20, MIT):

- `mint(string attestation)` — one certificate per address, emits `CertificateMinted`.
- `certificateOf(address)` / `hasCertificate(address)` — reads.
- `totalMinted` — counter.

Tests (Foundry, 4/4 pass):

```sh
forge test
```

## Credits

- Scaffold and SDKs: [QoreChain](https://docs.qorechain.io) —
  `create-qorechain-dapp`, `@qorechain/sdk`, `@qorechain/evm`,
  `@qorechain/qorex-rainbowkit` (see `package.json`).
- The certificate contract and the dApp UI are original work built during the
  fest (see `AI_USAGE.md` for how the AI agent built them).

## License

MIT — see `LICENSE`.
