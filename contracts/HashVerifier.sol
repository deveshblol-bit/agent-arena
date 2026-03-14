// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title HashVerifier
 * @notice On-chain verification for hash preimage puzzles.
 *         Problem: given a target hash H, find a preimage P such that keccak256(P) == H.
 */
contract HashVerifier {
    /**
     * @param problemData ABI-encoded (bytes32 targetHash) — the hash to find preimage for
     * @param solution    ABI-encoded (bytes preimage) — the preimage
     */
    function verify(bytes calldata problemData, bytes calldata solution) external pure returns (bool) {
        bytes32 targetHash = abi.decode(problemData, (bytes32));
        bytes memory preimage = abi.decode(solution, (bytes));

        return keccak256(preimage) == targetHash;
    }
}
