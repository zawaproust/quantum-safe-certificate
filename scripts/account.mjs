// Generate (or load) the project's testnet-only deployer account.
// Unified eth-native account: ONE key renders as qor1... (Native) + 0x...
// (EVM) with ONE shared balance. Testnet ONLY (qorechain-diana, EVM 9800).
// NEVER use this mnemonic on mainnet or with real funds.
// The mnemonic is written to .deployer.json (mode 600) and is git-ignored.
import { writeFileSync, readFileSync, existsSync, chmodSync } from "node:fs";
import { generateMnemonic, deriveUnifiedAccount } from "@qorechain/sdk";

const PATH = new URL("../.deployer.json", import.meta.url).pathname;

let mnemonic;
if (existsSync(PATH)) {
  mnemonic = JSON.parse(readFileSync(PATH, "utf8")).mnemonic;
  console.log("Loaded existing deployer account from .deployer.json");
} else {
  mnemonic = generateMnemonic();
  writeFileSync(PATH, JSON.stringify({ mnemonic, network: "qorechain-diana" }, null, 2));
  chmodSync(PATH, 0o600);
  console.log("Generated NEW deployer account (saved to .deployer.json, mode 600)");
}

const account = await deriveUnifiedAccount(mnemonic);
console.log("Native (qor1):", account.cosmos);
console.log("EVM    (0x):  ", account.evm);
console.log("SVM    (b58): ", account.svm);
console.log("Public key:   ", account.publicKey);
console.log("\nFund it from the faucet: https://dashboard.qorechain.io/faucet");
console.log("Paste the Native address above. 100 test QOR per claim, once/24h.");
