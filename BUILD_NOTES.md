# Build notes — Quantum-Safe Certificate

Date: 2026-11-12. Hackathon deadline: 2 Dec 2026 23:59 UTC.

## What works (verified)

- **Scaffold:** `create-qorechain-dapp@0.12.0 --template viem-wagmi --network testnet`
  (had to pass `--yes`; without it the CLI waits on an interactive prompt).
- **Contract:** `contracts/QuantumSafeCertificate.sol` compiles (solc 0.8.20);
  `forge test` 4/4 pass.
- **dApp:** `npm run build` passes (typecheck + Vite). Includes: QoreX connect,
  balance, block number, PQC status badge (`pqcKeyStatus`), EVM window status,
  mint flow, explorer links (`https://explore.qore.network/tx/<hash>` — verified
  the `/tx/` pattern returns 200).
- **Deployer account (testnet-only):** unified eth-native account.
  - Native: `qor1k9lwgypx4uk0fyrzq5x5z3mscw2nugx4n8wgwl`
  - EVM: `0xB17EE41026AF2Cf49062050D414770C3953E20D5`
  - Mnemonic in `.deployer.json` (mode 600, git-ignored, testnet-only).
- **Status script:** `node scripts/pqc-status.mjs` reads the live testnet and
  correctly reports: balance 0, PQC not registered, no EVM window.
- **Ops scripts ready:** `setup-chain.mjs` (register ML-DSA-87 key +
  open EVM window), `deploy.mjs` (deploy via viem), `attest.mjs`
  (hybrid-signed native self-transfer, 0.01 QOR).

## What is blocked — faucet (needs the owner's sign-in)

- The deployer account is **unfunded (0 test QOR)**. The only source is the
  dashboard faucet (100 QOR/claim, once/24h):
  https://dashboard.qorechain.io/faucet — **sign-in required (email, Apple, or
  Google)**. The agent cannot sign in as the owner, and will not ask for the
  owner's credentials.
- **To unblock:** the owner signs in to the dashboard, opens the faucet, and
  pastes `qor1k9lwgypx4uk0fyrzq5x5z3mscw2nugx4n8wgwl`. Then run:
  ```sh
  node scripts/pqc-status.mjs   # confirm 100 QOR arrived
  node scripts/setup-chain.mjs  # register PQC key + open EVM window
  node scripts/deploy.mjs       # deploy contract, writes deployed.json + .env
  node scripts/attest.mjs       # hybrid-signed attestation tx
  npm run build                 # rebuild dApp with the contract address
  ```
- After that, fill in the contract address + tx hash in `README.md`, and the
  dApp is fully demoable. Nothing was faked: no contract address or tx hash is
  claimed anywhere until the real deploy runs.

## Fixes applied along the way (for the next person)

- `create-qorechain-dapp` needs `--yes --no-install` for non-interactive use.
- First `npm install` hit transient `TAR_ENTRY_ERROR EPERM` and left
  `node_modules/viem/_types/index.d.ts` empty (0 lines) — fixed with a forced
  `npm install viem@latest` (2.57.18). If the build complains about viem
  types, check that file is non-empty.
- `@qorechain/evm@0.12.0` chain objects were typed against an older viem
  (3-phase `PrepareTransactionRequestPhase`); viem 2.57 adds a 4th phase.
  Fixed with a type-only `as Chain` cast in `src/wagmi.ts` (runtime unaffected).
- The SDK's `getPqcStatus` uses the `qor_` JSON-RPC namespace, which the public
  endpoints do not serve (`-32601`). The scripts query PQC status over REST
  directly: `GET /qorechain/pqc/v1/account/{address}`.
- `client.rest.getAllBalances` returns `{balances: [...], pagination}` — not a
  bare array.

## Testnet facts used

- Testnet `qorechain-diana`, EVM chain ID 9800 (`0x2648`); mainnet is 9801 —
  never used. EVM RPC `https://evm-testnet.qore.host`, REST
  `https://api-testnet.qore.host`, RPC `https://rpc-testnet.qore.host`.
- EVM txs need (1) a registered ML-DSA-87 key and (2) an open EVM window;
  contract creation is refused under a scoped (`allowedTargets`) window, so the
  setup opens a general window (7200 blocks, 20 txs, 1000 QOR).
- Opening a window advances the account nonce — viem reads the nonce fresh at
  deploy time, so deploy AFTER opening the window.
