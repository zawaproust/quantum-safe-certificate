// The hybrid-signed "certificate attestation": a native-lane QOR transfer
// signed with BOTH secp256k1 and ML-DSA-87 (the PQCHybridSignature extension).
// This is the transaction that proves the deployer account is quantum-safe.
// Sends 0.01 QOR to the account itself (a self-transfer, no value leaves).
// Requires: funded account + registered PQC key (run setup-chain.mjs first).
// Run: node scripts/attest.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { StargateClient } from "@cosmjs/stargate";
import {
  createClient,
  deriveUnifiedAccount,
  EthNativeSigner,
  toBase,
} from "@qorechain/sdk";

const REST = "https://api-testnet.qore.host";
const RPC = "https://rpc-testnet.qore.host";
const CHAIN_ID = "qorechain-diana";

// PQC status over the native REST route (the SDK's getPqcStatus uses the
// `qor_` JSON-RPC namespace, which the public endpoints do not serve).
async function pqcStatus(address) {
  const r = await fetch(`${REST}/qorechain/pqc/v1/account/${address}`);
  if (!r.ok) throw new Error(`PQC status HTTP ${r.status}`);
  const j = await r.json();
  return { found: j.found === true, account: j.account ?? null };
}

const { mnemonic } = JSON.parse(readFileSync(new URL("../.deployer.json", import.meta.url), "utf8"));
const account = await deriveUnifiedAccount(mnemonic);
const client = createClient({ endpoints: { rest: REST, rpc: RPC } });
const transport = await StargateClient.connect(RPC);

const pqc = await pqcStatus(account.cosmos);
if (!pqc.found) {
  console.error("PQC key NOT registered — run: node scripts/setup-chain.mjs");
  process.exit(2);
}
console.log(`PQC key registered. Sending hybrid-signed attestation...`);

async function authInfo() {
  const { account: base } = await client.rest.get(
    `/cosmos/auth/v1beta1/accounts/${account.cosmos}`,
  );
  return { accountNumber: BigInt(base.account_number), sequence: BigInt(base.sequence) };
}

// Hybrid is the default signMode for EthNativeSigner.
const signer = new EthNativeSigner(account, { rest: REST });
const res = await signer.bankSend(
  transport,
  account.cosmos, // self-transfer: 0.01 QOR back to the same account
  [{ denom: "uqor", amount: toBase("0.01") }],
  {
    chainId: CHAIN_ID,
    ...(await authInfo()),
    fee: { amount: [{ denom: "uqor", amount: "40000" }], gas: "400000" },
    memo: "quantum-safe-certificate attestation",
  },
);
console.log("Attestation tx:", res.transactionHash, "code:", res.code);
if (res.code !== 0) {
  console.error("Attestation failed");
  process.exit(1);
}

const out = {
  network: "qorechain-diana",
  chainId: CHAIN_ID,
  type: "hybrid-signed native bankSend (secp256k1 + ML-DSA-87)",
  from: account.cosmos,
  to: account.cosmos,
  amount: "0.01 QOR",
  txHash: res.transactionHash,
  explorer: `https://explore.qore.network/tx/${res.transactionHash}`,
};
const path = new URL("../attestation.json", import.meta.url);
const prev = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : [];
const all = Array.isArray(prev) ? prev : [prev];
all.push(out);
writeFileSync(path, JSON.stringify(all, null, 2));
console.log("Wrote attestation.json");
process.exit(0);
