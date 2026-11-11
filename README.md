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

> Status: **live on testnet** — deployed and verified 2026-11-12.

- Deployer account (Native): `qor1k9lwgypx4uk0fyrzq5x5z3mscw2nugx4n8wgwl`
- Deployer account (EVM): `0xB17EE41026AF2Cf49062050D414770C3953E20D5`
- Certificate contract: [`0x635ce52a842f305e862be82aa51f9de13f7c061c`](https://explore.qore.network/address/0x635ce52a842f305e862be82aa51f9de13f7c061c) (deploy tx [`0x0061b1986b582ed36846f785167df78cd0c40765f4e2024c10e4bd6edbcd12b6`](https://explore.qore.network/tx/0061b1986b582ed36846f785167df78cd0c40765f4e2024c10e4bd6edbcd12b6), block 9918262) — see `deployed.json`
- ML-DSA-87 key registration tx: [`66E37A636F0B4ACB6251765D9B151D185F691E35D840B546BC0C42EC785DD686`](https://explore.qore.network/tx/66E37A636F0B4ACB6251765D9B151D185F691E35D840B546BC0C42EC785DD686)
- EVM window open tx: [`E68A81501FFE9430735E9E31266DE4670605E0CCB759B85AAFB04691DD92D5E5`](https://explore.qore.network/tx/E68A81501FFE9430735E9E31266DE4670605E0CCB759B85AAFB04691DD92D5E5)
- Hybrid-signed attestation tx: [`A648DF40D730887F2467343DC481DBAB4A110F95CE1BF553B6FAE50B4B8A87C2`](https://explore.qore.network/tx/A648DF40D730887F2467343DC481DBAB4A110F95CE1BF553B6FAE50B4B8A87C2) — see `attestation.json`
- Certificate mint tx: [`0x27b80ac557c1d70760f0d9db01ce265f06288412575ba4588396099f28aad12a`](https://explore.qore.network/tx/27b80ac557c1d70760f0d9db01ce265f06288412575ba4588396099f28aad12a) (block 9919234, holder `0xB17EE41026AF2Cf49062050D414770C3953E20D5`, attestation `quantum-safe`) — see `mint.json`. Note: the QoreChain explorer indexes native-lane txs; EVM txs are verified via the EVM RPC receipt.
- Registration proof tx: [`9D726290647206C83487CA638BCFC2FC067AC303EE47DC0AED7596CD7880CC5D`](https://explore.qore.network/tx/9D726290647206C83487CA638BCFC2FC067AC303EE47DC0AED7596CD7880CC5D) (block 9919203, 0.000001 QOR, memo `bbqd-link:xvT9n2d6qYrV`) — see `proof.json`
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
