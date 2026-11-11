// Read-only status check for the deployer account: balance, PQC key status,
// EVM window. Works unfunded. Exits non-zero when the account has no funds.
import { readFileSync } from "node:fs";
import { createClient, deriveUnifiedAccount } from "@qorechain/sdk";
import { evmWindowStatus } from "@qorechain/evm/window";

const REST = "https://api-testnet.qore.host";
const EVM_RPC = "https://evm-testnet.qore.host";

const { mnemonic } = JSON.parse(readFileSync(new URL("../.deployer.json", import.meta.url), "utf8"));
const account = await deriveUnifiedAccount(mnemonic);
const client = createClient({ endpoints: { rest: REST } });

console.log("Native:", account.cosmos);
console.log("EVM:   ", account.evm);

const res = await client.rest.getAllBalances(account.cosmos);
const balances = Array.isArray(res) ? res : res.balances ?? [];
console.log("Balances:", JSON.stringify(balances));
const qor = balances.find((b) => b.denom === "uqor");
console.log("QOR balance:", qor ? `${Number(qor.amount) / 1e6} QOR` : "0 (UNFUNDED)");

// PQC status over the native REST route (the SDK's getPqcStatus uses the
// `qor_` JSON-RPC namespace, which the public endpoints do not serve).
async function pqcStatus(address) {
  const r = await fetch(`${REST}/qorechain/pqc/v1/account/${address}`);
  if (!r.ok) throw new Error(`PQC status HTTP ${r.status}`);
  const j = await r.json();
  return { found: j.found === true, account: j.account ?? null };
}

const pqc = await pqcStatus(account.cosmos);
console.log("PQC registered:", pqc.found ? `YES (${JSON.stringify(pqc.account).slice(0, 120)})` : "NO");

const win = await evmWindowStatus({ rest: REST, address: account.cosmos });
console.log("EVM window:", win.found ? `found, live=${win.live}, ${win.remainingTxs} txs left, ${win.remainingBlocks} blocks left` : "none");

// EVM-side balance + nonce (same 20-byte identity).
const evmBal = await fetch(EVM_RPC, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getBalance", params: [account.evm, "latest"], id: 1 }),
}).then((r) => r.json());
console.log("EVM balance (wei):", BigInt(evmBal.result).toString(), `(${Number(BigInt(evmBal.result)) / 1e18} QOR)`);

if (!qor || Number(qor.amount) === 0) {
  console.log("\nUNFUNDED — claim 100 test QOR at https://dashboard.qorechain.io/faucet");
  console.log(`Paste this address: ${account.cosmos}`);
  process.exit(2);
}
