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

## Update 2026-11-12 ~06:00 WIB — faucet sign-in 403 on user's phone
- User tried to sign in to dashboard.qorechain.io/faucet from their phone and got
  "403 Forbidden — You don't have permission to access this resource" on the
  sign-in step (screenshot).
- Verified from the VM: dashboard root returns 200, faucet page 307 (redirect to
  sign-in, normal), api-testnet 200. So the dashboard is NOT down — the 403 is
  specific to the user's connection (likely WAF/IP block on their network).
- Docs confirm the dashboard faucet is the ONLY source of test QOR (sign-in
  required, no API, no alternate faucet).
- Next tries for the user: switch network (WiFi <-> mobile data), different
  browser / desktop mode, retry later, or a laptop/PC.

## Update 2026-11-12 ~06:07 WIB — DEPLOYED ✅
- Faucet claim SUCCEEDED via mobile data (the WiFi IP was the block): 100 QOR
  + 1000 fUSD + 0.5 fETH + 0.02 fBTC. Faucet tx:
  04F6421565EAD17C79CFF4CE99DDC8E36735F58A030D2E2FFECD9390B9DC2B54
- PQC key registered: tx 66E37A636F0B4ACB6251765D9B151D185F691E35D840B546BC0C42EC785DD686
- EVM window opened (7200 blocks / 20 txs / 1000 QOR):
  tx E68A81501FFE9430735E9E31266DE4670605E0CCB759B85AAFB04691DD92D5E5
- Contract DEPLOYED: 0x635ce52a842f305e862be82aa51f9de13f7c061c, block 9918262,
  deploy tx 0x0061b1986b582ed36846f785167df78cd0c40765f4e2024c10e4bd6edbcd12b6
  (verified on-chain via eth_getCode; balance after deploy 99.775 QOR).
- Hybrid-signed attestation tx: A648DF40D730887F2467343DC481DBAB4A110F95CE1BF553B6FAE50B4B8A87C2
- Bug fixed: deploy.mjs double-`0x` bytecode prefix (Foundry artifact already
  includes `0x`); fixed with a startsWith guard.
- `npm run build` passes with the real contract address in .env.
- Remaining: register on build.qorechain.io, demo video (<=3 min), submit
  before 2 Dec 2026 23:59 UTC.
