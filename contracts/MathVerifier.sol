// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MathVerifier
 * @notice On-chain verification for math factorization problems.
 *         Problem: given N, find factors p and q such that p * q == N, p > 1, q > 1.
 */
contract MathVerifier {
    /**
     * @param problemData ABI-encoded (uint256 N) — the number to factor
     * @param solution    ABI-encoded (uint256 p, uint256 q) — the two factors
     */
    function verify(bytes calldata problemData, bytes calldata solution) external pure returns (bool) {
        uint256 N = abi.decode(problemData, (uint256));
        (uint256 p, uint256 q) = abi.decode(solution, (uint256, uint256));

        // Both factors must be > 1 (no trivial 1 * N)
        if (p <= 1 || q <= 1) return false;
        // Product must equal N
        if (p * q != N) return false;

        return true;
    }
}
