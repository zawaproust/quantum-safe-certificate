import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  QORECHAIN_REST_ENDPOINTS,
  classifyEvmWindowRejection,
  evmWindowStatus,
  pqcKeyStatus,
  type EvmWindowRejection,
} from "@qorechain/evm";
import { useQuery } from "@tanstack/react-query";
import { formatEther } from "viem";
import {
  useAccount,
  useBalance,
  useBlockNumber,
  usePublicClient,
  useReadContract,
  useSendTransaction,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { CERTIFICATE_ABI } from "./certificateAbi.js";

// Deployed QuantumSafeCertificate on the QoreChain Diana testnet (EVM 9800).
// Set in .env as VITE_CERTIFICATE_ADDRESS after deploying (see scripts/deploy.mjs).
const CERTIFICATE_ADDRESS_RAW = (import.meta.env.VITE_CERTIFICATE_ADDRESS ?? "") as string;
const CERTIFICATE_ADDRESS = CERTIFICATE_ADDRESS_RAW as `0x${string}`;
const HAS_CONTRACT = CERTIFICATE_ADDRESS_RAW !== "";
const EXPLORER = "https://explore.qore.network";
const ATTESTATION = "quantum-safe";

const REMEDY: Record<EvmWindowRejection, string> = {
  "no-pqc-key": "This account has no registered ML-DSA-87 key. Register one on the native lane first.",
  "no-window": "No EVM authorisation window is open. Open one on the native lane, then retry.",
  exhausted: "The window has run out of blocks, transactions or value. Open a new one.",
  invalid: "The chain refused the window parameters.",
};

/** The account's EVM authorisation window, read over the native-lane REST API. */
function WindowStatus({ address, chainId }: { address: `0x${string}`; chainId: number }) {
  const rest = QORECHAIN_REST_ENDPOINTS[chainId];
  const { data, error, isLoading } = useQuery({
    queryKey: ["evm-window", chainId, address],
    queryFn: () => evmWindowStatus({ rest: rest!, address }),
    enabled: rest !== undefined,
    refetchInterval: 10_000,
  });
  if (!rest) return <p>Unknown network.</p>;
  if (isLoading) return <p>Reading the EVM window...</p>;
  if (error) return <p>Could not read the window: {error.message}</p>;
  if (!data?.found) {
    return <p>EVM window: none. Sending from this account is refused until one is opened.</p>;
  }
  return (
    <p>
      EVM window: {data.live ? "live" : "not usable"} ({data.remainingBlocks.toString()} blocks,{" "}
      {data.remainingTxs.toString()} transactions, {data.remainingValue.toString()} uqor left)
    </p>
  );
}

/** Whether the account holds a registered ML-DSA-87 post-quantum key. */
function PqcStatus({ address }: { address: `0x${string}` }) {
  const publicClient = usePublicClient();
  const { data, error, isLoading } = useQuery({
    queryKey: ["pqc-status", address],
    queryFn: () => pqcKeyStatus(publicClient!, address),
    enabled: publicClient !== undefined,
    refetchInterval: 10_000,
  });
  if (isLoading) return <p>Post-quantum status: checking...</p>;
  if (error) return <p>Post-quantum status: could not read ({error.message})</p>;
  if (data?.registered) {
    return (
      <p>
        ✅ Post-quantum status: <strong>quantum-safe</strong> — ML-DSA-87 key registered
        (algorithm {data.algorithmId}, key <code>{data.pubkey.slice(0, 18)}…</code>)
      </p>
    );
  }
  return (
    <p>
      ⚠️ Post-quantum status: <strong>not quantum-safe yet</strong> — no ML-DSA-87 key
      registered for this account. Register one on the native lane (QoreX does it for
      you) before minting.
    </p>
  );
}

/** The certificate section: read the caller's certificate, or mint it. */
function Certificate({ address }: { address: `0x${string}` }) {
  const { data: hasCert, refetch } = useReadContract({
    address: CERTIFICATE_ADDRESS,
    abi: CERTIFICATE_ABI,
    functionName: "hasCertificate",
    args: [address],
    query: { enabled: HAS_CONTRACT, refetchInterval: 10_000 },
  });
  const { data: cert } = useReadContract({
    address: CERTIFICATE_ADDRESS,
    abi: CERTIFICATE_ABI,
    functionName: "certificateOf",
    args: [address],
    query: { enabled: HAS_CONTRACT && hasCert === true },
  });
  const mint = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: mint.data });

  if (!HAS_CONTRACT) {
    return (
      <section>
        <h2>Quantum-Safe Certificate</h2>
        <p>
          The certificate contract is not deployed yet — set{" "}
          <code>VITE_CERTIFICATE_ADDRESS</code> after deploying (see{" "}
          <code>scripts/deploy.mjs</code>).
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2>Quantum-Safe Certificate</h2>
      <p>
        Contract{" "}
        <a href={`${EXPLORER}/address/${CERTIFICATE_ADDRESS}`} target="_blank" rel="noreferrer">
          <code>{CERTIFICATE_ADDRESS}</code>
        </a>
      </p>
      {hasCert === true && cert ? (
        <div style={{ border: "1px solid #2a7", borderRadius: 8, padding: "1rem" }}>
          <p>
            🎓 <strong>Certificate issued</strong>
          </p>
          <p>
            Holder: <code>{cert.holder}</code>
          </p>
          <p>Issued: {new Date(Number(cert.issuedAt) * 1000).toUTCString()}</p>
          <p>
            Attestation: <code>{cert.attestation}</code>
          </p>
        </div>
      ) : (
        <>
          <p>You do not hold a certificate yet. Minting records one certificate for your address.</p>
          <button
            type="button"
            disabled={mint.isPending}
            onClick={() =>
              mint.writeContract({
                address: CERTIFICATE_ADDRESS,
                abi: CERTIFICATE_ABI,
                functionName: "mint",
                args: [ATTESTATION],
              })
            }
          >
            Mint my Quantum-Safe Certificate
          </button>
        </>
      )}
      {mint.data && (
        <p>
          Mint tx:{" "}
          <a href={`${EXPLORER}/tx/${mint.data}`} target="_blank" rel="noreferrer">
            <code>{mint.data}</code>
          </a>{" "}
          ({receipt.isSuccess ? "confirmed ✅" : receipt.isLoading ? "confirming..." : "sent"})
        </p>
      )}
      {mint.error && <p>Mint refused: {mint.error.message}</p>}
      {receipt.isSuccess && (
        <button type="button" onClick={() => refetch()}>
          Refresh certificate
        </button>
      )}
    </section>
  );
}

export function App() {
  const { address, chainId, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { data: block } = useBlockNumber({ watch: true });
  const send = useSendTransaction();
  const rejection = send.error ? classifyEvmWindowRejection(send.error) : undefined;

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Quantum-Safe Certificate</h1>
      <p>
        Check your account&apos;s post-quantum status on QoreChain testnet and mint a
        certificate proving it is quantum-safe (registered ML-DSA-87 key + hybrid-signed
        transaction). Built for the QoreChain &ldquo;Build Before Q-Day&rdquo; Developer Fest,
        Quantum Pass track.
      </p>
      <ConnectButton />
      <p>Latest block: {block?.toString() ?? "..."}</p>

      {isConnected && address && chainId ? (
        <section>
          <p>
            Account <code>{address}</code> on chain {chainId}
          </p>
          <p>Balance: {balance ? `${formatEther(balance.value)} QOR` : "..."}</p>
          <PqcStatus address={address} />
          <WindowStatus address={address} chainId={chainId} />
          <Certificate address={address} />
          <hr />
          <button type="button" disabled={send.isPending} onClick={() => send.sendTransaction({ to: address, value: 0n })}>
            Send 0 QOR to yourself (window test)
          </button>
          {send.data && (
            <p>
              Sent:{" "}
              <a href={`${EXPLORER}/tx/${send.data}`} target="_blank" rel="noreferrer">
                <code>{send.data}</code>
              </a>
            </p>
          )}
          {send.error && <p>Refused: {rejection ? REMEDY[rejection] : send.error.message}</p>}
        </section>
      ) : (
        <p>Connect a wallet (QoreX recommended) to read your account.</p>
      )}
    </main>
  );
}
