/**
 * Problem Generator
 * Generates math problems with solutions for Agent Arena challenges
 */

const crypto = require("crypto");

class ProblemGenerator {
  /**
   * Generate a factorization problem
   * @param {string} difficulty - "easy" | "medium" | "hard"
   * @returns {object} { problem, solution, encoded }
   */
  static generateFactorization(difficulty = "easy") {
    let p, q;

    switch (difficulty) {
      case "easy":
        // 2-3 digit primes
        p = this.randomPrime(10, 99);
        q = this.randomPrime(10, 99);
        break;

      case "medium":
        // 3-4 digit primes
        p = this.randomPrime(100, 999);
        q = this.randomPrime(100, 999);
        break;

      case "hard":
        // 4-5 digit primes
        p = this.randomPrime(1000, 9999);
        q = this.randomPrime(1000, 9999);
        break;

      default:
        throw new Error(`Unknown difficulty: ${difficulty}`);
    }

    const N = p * q;

    return {
      problem: N,
      solution: [p, q],
      difficulty,
      problemType: "MathFactorization",
      description: `Factor ${N}`,
    };
  }

  /**
   * Generate a quadratic/linear equation problem
   * @param {string} difficulty - "easy" | "medium" | "hard"
   * @returns {object} { problem, solution, encoded }
   */
  static generateEquation(difficulty = "easy") {
    let a, b, c, roots;

    switch (difficulty) {
      case "easy":
        // Linear equation: bx + c = 0
        a = 0;
        b = this.randomInt(-20, 20, [0]);
        c = this.randomInt(-50, 50);
        roots = [-c / b];
        break;

      case "medium":
        // Quadratic with integer roots
        const r1 = this.randomInt(-10, 10);
        const r2 = this.randomInt(-10, 10);
        // (x - r1)(x - r2) = x^2 - (r1+r2)x + r1*r2
        a = 1;
        b = -(r1 + r2);
        c = r1 * r2;
        roots = [r1, r2];
        break;

      case "hard":
        // Quadratic with larger coefficients
        const root1 = this.randomInt(-50, 50);
        const root2 = this.randomInt(-50, 50);
        a = this.randomInt(1, 10);
        b = -a * (root1 + root2);
        c = a * root1 * root2;
        roots = [root1, root2];
        break;

      default:
        throw new Error(`Unknown difficulty: ${difficulty}`);
    }

    return {
      problem: { a, b, c },
      solution: roots[0], // Accept either root
      difficulty,
      problemType: "MathEquation",
      description: a === 0 
        ? `Solve: ${b}x + ${c} = 0`
        : `Solve: ${a}x² ${b >= 0 ? '+' : ''}${b}x ${c >= 0 ? '+' : ''}${c} = 0`,
    };
  }

  /**
   * Generate a crypto puzzle (hash preimage)
   * @param {string} difficulty - "easy" | "medium" | "hard"
   * @returns {object} { problem, solution, encoded }
   */
  static generateCryptoPuzzle(difficulty = "easy") {
    let preimage;

    switch (difficulty) {
      case "easy":
        // 4-character alphanumeric
        preimage = this.randomString(4);
        break;

      case "medium":
        // 6-character alphanumeric
        preimage = this.randomString(6);
        break;

      case "hard":
        // 8-character alphanumeric
        preimage = this.randomString(8);
        break;

      default:
        throw new Error(`Unknown difficulty: ${difficulty}`);
    }

    const ethers = require("ethers");
    const hash = ethers.keccak256(ethers.toUtf8Bytes(preimage));

    return {
      problem: hash,
      solution: preimage,
      difficulty,
      problemType: "CryptoPuzzle",
      description: `Find preimage of ${hash.slice(0, 10)}...`,
    };
  }

  /**
   * Generate a random problem of any type
   */
  static generateRandom(difficulty = "easy") {
    const types = ["factorization", "equation", "crypto"];
    const type = types[Math.floor(Math.random() * types.length)];

    switch (type) {
      case "factorization":
        return this.generateFactorization(difficulty);
      case "equation":
        return this.generateEquation(difficulty);
      case "crypto":
        return this.generateCryptoPuzzle(difficulty);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  /**
   * Check if a number is prime
   */
  static isPrime(n) {
    if (n < 2) return false;
    if (n === 2) return true;
    if (n % 2 === 0) return false;

    const sqrt = Math.sqrt(n);
    for (let i = 3; i <= sqrt; i += 2) {
      if (n % i === 0) return false;
    }
    return true;
  }

  /**
   * Generate a random prime in range [min, max]
   */
  static randomPrime(min, max) {
    let attempts = 0;
    while (attempts < 1000) {
      const n = this.randomInt(min, max);
      if (this.isPrime(n)) return n;
      attempts++;
    }
    throw new Error(`Could not find prime in range [${min}, ${max}]`);
  }

  /**
   * Generate random integer in range [min, max], excluding values in 'exclude' array
   */
  static randomInt(min, max, exclude = []) {
    let n;
    do {
      n = Math.floor(Math.random() * (max - min + 1)) + min;
    } while (exclude.includes(n));
    return n;
  }

  /**
   * Generate random alphanumeric string
   */
  static randomString(length) {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }
}

module.exports = ProblemGenerator;
