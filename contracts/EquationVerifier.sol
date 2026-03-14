// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title EquationVerifier
 * @notice On-chain verification for polynomial equation problems.
 *         Problem: given coefficients [a, b, c] of ax^2 + bx + c = 0,
 *         find an integer x that satisfies the equation.
 *         Uses signed integers to support negative coefficients and solutions.
 */
contract EquationVerifier {
    /**
     * @param problemData ABI-encoded (int256 a, int256 b, int256 c) — coefficients
     * @param solution    ABI-encoded (int256 x) — the solution
     */
    function verify(bytes calldata problemData, bytes calldata solution) external pure returns (bool) {
        (int256 a, int256 b, int256 c) = abi.decode(problemData, (int256, int256, int256));
        int256 x = abi.decode(solution, (int256));

        // Evaluate ax^2 + bx + c
        int256 result = a * x * x + b * x + c;

        return result == 0;
    }
}
