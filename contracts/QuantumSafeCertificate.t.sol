// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/QuantumSafeCertificate.sol";

contract QuantumSafeCertificateTest is Test {
    QuantumSafeCertificate cert;

    function setUp() public {
        cert = new QuantumSafeCertificate();
    }

    function testMintAndRead() public {
        address alice = address(0xA11CE);
        vm.prank(alice);
        cert.mint("quantum-safe");
        assertTrue(cert.hasCertificate(alice));
        assertEq(cert.totalMinted(), 1);
        QuantumSafeCertificate.Certificate memory c = cert.certificateOf(alice);
        assertEq(c.holder, alice);
        assertEq(c.attestation, "quantum-safe");
        assertGt(c.issuedAt, 0);
    }

    function testOnePerAddress() public {
        address alice = address(0xA11CE);
        vm.prank(alice);
        cert.mint("quantum-safe");
        vm.prank(alice);
        vm.expectRevert(QuantumSafeCertificate.AlreadyCertified.selector);
        cert.mint("again");
    }

    function testBadAttestation() public {
        address alice = address(0xA11CE);
        vm.prank(alice);
        vm.expectRevert(QuantumSafeCertificate.BadAttestation.selector);
        cert.mint("");
    }

    function testNoCertificateByDefault() public {
        assertFalse(cert.hasCertificate(address(0xB0B)));
        QuantumSafeCertificate.Certificate memory c = cert.certificateOf(address(0xB0B));
        assertEq(c.holder, address(0));
    }
}
