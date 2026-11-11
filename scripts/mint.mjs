// Mint the Quantum-Safe Certificate on the QoreChain Diana testnet EVM (chain 9800).
// Calls mint("quantum-safe") on the deployed QuantumSafeCertificate contract.
// Requires: funded deployer + registered PQC key + live EVM window.
// Run: node scripts/mint.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { qorechainTestnet } from "@qorechain/evm";

const EVM_RPC = "https://evm-testnet.qore.host";
const artifact = JSON.parse(
  readFileSync(new URL("../out/QuantumSafeCertificate.sol/QuantumSafeCertificate.json", import.meta.url), "utf8"),
);
const CERTIFICATE_ABI = artifact.abi;
const deployed = JSON.parse(readFileSync(new URL("../deployed.json", import.meta.url), "utf8"));
const CONTRACT = deployed.address;

const { mnemonic } = JSON.parse(readFileSync(new URL("../.deployer.json", import.meta.url), "utf8"));
const { deriveUnifiedAccount } = await import("@qorechain/sdk");
const account = await deriveUnifiedAccount(mnemonic);
const walletAccount = privateKeyToAccount(account.privateKey);

const publicClient = createPublicClient({ chain: qorechainTestnet, transport: http(EVM_RPC) });
const walletClient = createWalletClient({
  account: walletAccount,
  chain: qorechainTestnet,
  transport: http(EVM_RPC),
});

console.log("Minter:", walletAccount.address);
console.log("Contract:", CONTRACT);

// Check: does this address already hold a certificate?
const hasCert = await publicClient.readContract({
  address: CONTRACT,
  abi: CERTIFICATE_ABI,
  functionName: "hasCertificate",
  args: [walletAccount.address],
});
console.log("Already holds certificate:", hasCert);
if (hasCert) {
  const cert = await publicClient.readContract({
    address: CONTRACT,
    abi: CERTIFICATE_ABI,
    functionName: "certificateOf",
    args: [walletAccount.address],
  });
  console.log("Certificate:", JSON.stringify(cert, (k, v) => (typeof v === "bigint" ? v.toString() : v), 2));
  process.exit(0);
}

console.log('Minting certificate ("quantum-safe")...');
const hash = await walletClient.writeContract({
  address: CONTRACT,
  abi: CERTIFICATE_ABI,
  functionName: "mint",
  args: ["quantum-safe"],
});
console.log("Mint tx:", hash);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log("Status:", receipt.status, "| block:", receipt.blockNumber);
if (receipt.status !== "success") {
  console.error("Mint failed");
  process.exit(1);
}

const cert = await publicClient.readContract({
  address: CONTRACT,
  abi: CERTIFICATE_ABI,
  functionName: "certificateOf",
  args: [walletAccount.address],
});
console.log("Certificate:", JSON.stringify(cert, (k, v) => (typeof v === "bigint" ? v.toString() : v), 2));

const out = {
  network: "qorechain-diana",
  chainId: 9800,
  contract: CONTRACT,
  minter: walletAccount.address,
  attestation: "quantum-safe",
  mintTx: hash,
  block: receipt.blockNumber.toString(),
  explorer: `https://explore.qore.network/tx/${hash}`,
  certificate: JSON.parse(JSON.stringify(cert, (k, v) => (typeof v === "bigint" ? v.toString() : v))),
};
writeFileSync(new URL("../mint.json", import.meta.url), JSON.stringify(out, null, 2));
console.log("Wrote mint.json");
process.exit(0);
