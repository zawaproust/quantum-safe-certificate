// QoreX proof transaction for build.qorechain.io registration.
// Hybrid-signed native bankSend: 0.000001 QOR to self with the site's memo.
// Run: node scripts/proof.mjs
import { readFileSync, writeFileSync } from "node:fs";
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
const MEMO = "bbqd-link:xvT9n2d6qYrV";
const AMOUNT_QOR = "0.000001";

async function pqcStatus(address) {
  const r = await fetch(`${REST}/qorechain/pqc/v1/account/${address}`);
  if (!r.ok) throw new Error(`PQC status HTTP ${r.status}`);
  const j = await r.json();
  return { found: j.found === true };
}

const { mnemonic } = JSON.parse(readFileSync(new URL("../.deployer.json", import.meta.url), "utf8"));
const account = await deriveUnifiedAccount(mnemonic);
const client = createClient({ endpoints: { rest: REST, rpc: RPC } });
const transport = await StargateClient.connect(RPC);

const pqc = await pqcStatus(account.cosmos);
if (!pqc.found) {
  console.error("PQC key NOT registered");
  process.exit(2);
}
console.log(`PQC key registered. Sending proof tx (${AMOUNT_QOR} QOR, memo ${MEMO})...`);

async function authInfo() {
  const { account: base } = await client.rest.get(
    `/cosmos/auth/v1beta1/accounts/${account.cosmos}`,
  );
  return { accountNumber: BigInt(base.account_number), sequence: BigInt(base.sequence) };
}

const signer = new EthNativeSigner(account, { rest: REST });
const res = await signer.bankSend(
  transport,
  account.cosmos, // self-transfer
  [{ denom: "uqor", amount: toBase(AMOUNT_QOR) }],
  {
    chainId: CHAIN_ID,
    ...(await authInfo()),
    fee: { amount: [{ denom: "uqor", amount: "40000" }], gas: "400000" },
    memo: MEMO,
  },
);
console.log("Proof tx:", res.transactionHash, "code:", res.code);
if (res.code !== 0) {
  console.error("Proof tx failed");
  process.exit(1);
}

const out = {
  network: "qorechain-diana",
  chainId: CHAIN_ID,
  type: "QoreX registration proof (hybrid-signed native bankSend)",
  from: account.cosmos,
  to: account.cosmos,
  amount: `${AMOUNT_QOR} QOR`,
  memo: MEMO,
  txHash: res.transactionHash,
  explorer: `https://explore.qore.network/tx/${res.transactionHash}`,
};
writeFileSync(new URL("../proof.json", import.meta.url), JSON.stringify(out, null, 2));
console.log("Wrote proof.json");
process.exit(0);
