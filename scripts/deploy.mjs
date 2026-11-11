// Deploy QuantumSafeCertificate to the QoreChain Diana testnet EVM (chain 9800).
// Requires: funded deployer account + registered PQC key + live EVM window
// (run: node scripts/setup-chain.mjs first). Writes the address to
// deployed.json and to .env as VITE_CERTIFICATE_ADDRESS.
// Run: node scripts/deploy.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { qorechainTestnet } from "@qorechain/evm";

const EVM_RPC = "https://evm-testnet.qore.host";
const artifact = JSON.parse(
  readFileSync(new URL("../out/QuantumSafeCertificate.sol/QuantumSafeCertificate.json", import.meta.url), "utf8"),
);
const CERTIFICATE_ABI = artifact.abi;
const BYTECODE = `0x${artifact.bytecode.object}`;

const { mnemonic } = JSON.parse(readFileSync(new URL("../.deployer.json", import.meta.url), "utf8"));
// Re-derive the unified account's private key from the mnemonic (eth path m/44'/60'/0'/0/0).
const { deriveUnifiedAccount } = await import("@qorechain/sdk");
const account = await deriveUnifiedAccount(mnemonic);
const walletAccount = privateKeyToAccount(account.privateKey);

const publicClient = createPublicClient({ chain: qorechainTestnet, transport: http(EVM_RPC) });
const walletClient = createWalletClient({
  account: walletAccount,
  chain: qorechainTestnet,
  transport: http(EVM_RPC),
});

console.log("Deployer:", walletAccount.address);
const bal = await publicClient.getBalance({ address: walletAccount.address });
console.log("Balance:", (Number(bal) / 1e18).toFixed(6), "QOR");
if (bal === 0n) {
  console.error("UNFUNDED — claim test QOR at https://dashboard.qorechain.io/faucet");
  process.exit(2);
}

console.log("Deploying QuantumSafeCertificate...");
const hash = await walletClient.deployContract({ abi: CERTIFICATE_ABI, bytecode: BYTECODE });
console.log("Deploy tx:", hash);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log("Contract:", receipt.contractAddress, "| status:", receipt.status, "| block:", receipt.blockNumber);
if (receipt.status !== "success") {
  console.error("Deploy failed");
  process.exit(1);
}

const deployed = {
  network: "qorechain-diana",
  chainId: 9800,
  contract: "QuantumSafeCertificate",
  address: receipt.contractAddress,
  deployTx: hash,
  block: receipt.blockNumber.toString(),
  deployer: walletAccount.address,
  explorer: `https://explore.qore.network/tx/${hash}`,
  contractExplorer: `https://explore.qore.network/address/${receipt.contractAddress}`,
};
writeFileSync(new URL("../deployed.json", import.meta.url), JSON.stringify(deployed, null, 2));
console.log("Wrote deployed.json");

// Update .env with the contract address for the frontend.
const envPath = new URL("../.env", import.meta.url);
let env = readFileSync(envPath, "utf8");
if (env.includes("VITE_CERTIFICATE_ADDRESS=")) {
  env = env.replace(/^VITE_CERTIFICATE_ADDRESS=.*$/m, `VITE_CERTIFICATE_ADDRESS=${receipt.contractAddress}`);
} else {
  env += `\nVITE_CERTIFICATE_ADDRESS=${receipt.contractAddress}\n`;
}
writeFileSync(envPath, env);
console.log("Updated .env with VITE_CERTIFICATE_ADDRESS");
process.exit(0);
