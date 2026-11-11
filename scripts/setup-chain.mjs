// One-time chain setup for the deployer account (testnet qorechain-diana):
//  1. Register the ML-DSA-87 post-quantum key (classical-signed bootstrap tx).
//  2. Open an EVM authorisation window (hybrid-signed native tx) so the account
//     can send EVM transactions (deploy + mint).
// Requires a funded account (faucet: 100 test QOR). Idempotent: both steps
// check on-chain state first and skip when already done.
// Run: node scripts/setup-chain.mjs
import { readFileSync } from "node:fs";
import { StargateClient } from "@cosmjs/stargate";
import {
  createClient,
  deriveUnifiedAccount,
  EthNativeSigner,
  buildRegisterPqcKeyMsg,
  signProofOfPossession,
} from "@qorechain/sdk";
import { openEvmWindowMessage, evmWindowStatus } from "@qorechain/evm/window";

// PQC status over the native REST route (the SDK's getPqcStatus uses the
// `qor_` JSON-RPC namespace, which the public endpoints do not serve).
async function pqcStatus(address) {
  const r = await fetch(`${REST}/qorechain/pqc/v1/account/${address}`);
  if (!r.ok) throw new Error(`PQC status HTTP ${r.status}`);
  const j = await r.json();
  return { found: j.found === true, account: j.account ?? null };
}

const REST = "https://api-testnet.qore.host";
const RPC = "https://rpc-testnet.qore.host";
const CHAIN_ID = "qorechain-diana";

const { mnemonic } = JSON.parse(readFileSync(new URL("../.deployer.json", import.meta.url), "utf8"));
const account = await deriveUnifiedAccount(mnemonic);
const client = createClient({ endpoints: { rest: REST, rpc: RPC } });
const transport = await StargateClient.connect(RPC);

async function authInfo() {
  const { account: base } = await client.rest.get(
    `/cosmos/auth/v1beta1/accounts/${account.cosmos}`,
  );
  return { accountNumber: BigInt(base.account_number), sequence: BigInt(base.sequence) };
}

const balances = await client.rest.getAllBalances(account.cosmos);
const list = Array.isArray(balances) ? balances : balances.balances ?? [];
const qor = list.find((b) => b.denom === "uqor");
if (!qor || Number(qor.amount) === 0) {
  console.error(`UNFUNDED ${account.cosmos} — claim 100 test QOR at https://dashboard.qorechain.io/faucet`);
  process.exit(2);
}
console.log(`Funded: ${Number(qor.amount) / 1e6} QOR`);

// 1) Register the ML-DSA-87 key (classical-signed bootstrap, ~600k gas).
const pqc = await pqcStatus(account.cosmos);
if (pqc.found) {
  console.log(`PQC key already registered — skipping.`);
} else {
  console.log("Registering ML-DSA-87 key...");
  const classical = new EthNativeSigner(account, { signMode: "classical" });
  const res = await classical.signAndBroadcast(transport, {
    chainId: CHAIN_ID,
    ...(await authInfo()),
    messages: [
      buildRegisterPqcKeyMsg(account.cosmos, {
        pqcKeypair: account.pqc,
        ecdsaPubkey: Uint8Array.from(Buffer.from(account.publicKey.slice(2), "hex")),
        proofOfPossession: signProofOfPossession({
          chainId: CHAIN_ID,
          account: account.cosmos,
          keypair: account.pqc,
        }),
      }),
    ],
    fee: { amount: [{ denom: "uqor", amount: "60000" }], gas: "600000" },
  });
  console.log("Register tx:", res.transactionHash, "code:", res.code);
  if (res.code !== 0) {
    console.error("Register failed:", res.rawLog);
    process.exit(1);
  }
}

// 2) Open an EVM authorisation window (hybrid-signed, ~180k gas).
// 7200 blocks, 20 txs, 1000 QOR max value. No allowedTargets: the deploy is a
// contract creation, which a scoped window refuses.
const win = await evmWindowStatus({ rest: REST, address: account.cosmos });
if (win.found && win.live && win.remainingTxs >= 2n) {
  console.log(`EVM window already live (${win.remainingTxs} txs, ${win.remainingBlocks} blocks left) — skipping.`);
} else {
  console.log("Opening EVM authorisation window (7200 blocks, 20 txs, 1000 QOR)...");
  const signer = new EthNativeSigner(account, { rest: REST });
  const msg = openEvmWindowMessage({
    sender: account.cosmos,
    blocks: 7200,
    maxTxs: 20,
    maxValue: "1000000000", // 1000 QOR in uqor
  });
  const res = await signer.signAndBroadcast(transport, {
    chainId: CHAIN_ID,
    ...(await authInfo()),
    messages: [msg],
    fee: { amount: [{ denom: "uqor", amount: "40000" }], gas: "400000" },
  });
  console.log("Open-window tx:", res.transactionHash, "code:", res.code);
  if (res.code !== 0) {
    console.error("Open-window failed:", res.rawLog);
    process.exit(1);
  }
}

console.log("Setup done. Account is quantum-safe with a live EVM window.");
process.exit(0);
