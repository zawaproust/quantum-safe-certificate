// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title QuantumSafeCertificate
/// @notice A minimal certificate registry for the QoreChain "Build Before Q-Day"
///         Developer Fest (Quantum Pass track).
/// @dev One certificate per address. Minting records the holder, the block
///      timestamp, and a short attestation string. The certificate proves the
///      holder completed a quantum-safe flow on QoreChain testnet: a registered
///      ML-DSA-87 key and a hybrid-signed (secp256k1 + ML-DSA-87) transaction.
///      Built with the QoreChain kits (create-qorechain-dapp, qorechain/evm).
contract QuantumSafeCertificate {
    struct Certificate {
        address holder;
        uint64 issuedAt;
        string attestation;
    }

    event CertificateMinted(address indexed holder, uint64 indexed issuedAt, string attestation);

    mapping(address => Certificate) private _certificates;

    uint256 public totalMinted;

    error AlreadyCertified();
    error BadAttestation();

    /// @notice Mint the caller's one quantum-safe certificate.
    /// @param attestation A short human-readable attestation (1-128 chars),
    ///        e.g. "quantum-safe".
    function mint(string calldata attestation) external {
        if (_certificates[msg.sender].holder != address(0)) revert AlreadyCertified();
        if (bytes(attestation).length == 0 || bytes(attestation).length > 128) revert BadAttestation();
        _certificates[msg.sender] = Certificate({
            holder: msg.sender,
            issuedAt: uint64(block.timestamp),
            attestation: attestation
        });
        totalMinted += 1;
        emit CertificateMinted(msg.sender, uint64(block.timestamp), attestation);
    }

    /// @notice Read the certificate held by `holder` (zero address if none).
    function certificateOf(address holder) external view returns (Certificate memory) {
        return _certificates[holder];
    }

    /// @notice Whether `holder` already holds a certificate.
    function hasCertificate(address holder) external view returns (bool) {
        return _certificates[holder].holder != address(0);
    }
}
