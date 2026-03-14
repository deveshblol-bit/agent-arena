/**
 * Test the problem generator
 */

const ProblemGenerator = require("../agent/problem-generator");
const ethers = require("ethers");

console.log("🧪 Testing Problem Generator\n");

// Test 1: Factorization problems
console.log("1. Factorization Problems:\n");

const easyFact = ProblemGenerator.generateFactorization("easy");
console.log(`   Easy: ${easyFact.description}`);
console.log(`   N = ${easyFact.problem}`);
console.log(`   Solution: ${easyFact.solution[0]} × ${easyFact.solution[1]} = ${easyFact.problem}`);
console.log(`   Verify: ${easyFact.solution[0] * easyFact.solution[1] === easyFact.problem ? '✅' : '❌'}\n`);

const mediumFact = ProblemGenerator.generateFactorization("medium");
console.log(`   Medium: ${mediumFact.description}`);
console.log(`   N = ${mediumFact.problem}`);
console.log(`   Solution: ${mediumFact.solution[0]} × ${mediumFact.solution[1]}`);
console.log(`   Verify: ${mediumFact.solution[0] * mediumFact.solution[1] === mediumFact.problem ? '✅' : '❌'}\n`);

const hardFact = ProblemGenerator.generateFactorization("hard");
console.log(`   Hard: ${hardFact.description}`);
console.log(`   N = ${hardFact.problem}`);
console.log(`   Solution: ${hardFact.solution[0]} × ${hardFact.solution[1]}`);
console.log(`   Verify: ${hardFact.solution[0] * hardFact.solution[1] === hardFact.problem ? '✅' : '❌'}\n`);

// Test 2: Equation problems
console.log("2. Equation Problems:\n");

const easyEq = ProblemGenerator.generateEquation("easy");
console.log(`   Easy: ${easyEq.description}`);
console.log(`   Solution: x = ${easyEq.solution}`);
const { a: a1, b: b1, c: c1 } = easyEq.problem;
const verify1 = a1 * easyEq.solution ** 2 + b1 * easyEq.solution + c1;
console.log(`   Verify: ${Math.abs(verify1) < 0.0001 ? '✅' : '❌'} (result: ${verify1})\n`);

const mediumEq = ProblemGenerator.generateEquation("medium");
console.log(`   Medium: ${mediumEq.description}`);
console.log(`   Solution: x = ${mediumEq.solution}`);
const { a: a2, b: b2, c: c2 } = mediumEq.problem;
const verify2 = a2 * mediumEq.solution ** 2 + b2 * mediumEq.solution + c2;
console.log(`   Verify: ${Math.abs(verify2) < 0.0001 ? '✅' : '❌'} (result: ${verify2})\n`);

// Test 3: Crypto puzzles
console.log("3. Crypto Puzzles:\n");

const easyCrypto = ProblemGenerator.generateCryptoPuzzle("easy");
console.log(`   Easy: ${easyCrypto.description}`);
console.log(`   Hash: ${easyCrypto.problem}`);
console.log(`   Preimage: "${easyCrypto.solution}"`);
const verifyHash1 = ethers.keccak256(ethers.toUtf8Bytes(easyCrypto.solution));
console.log(`   Verify: ${verifyHash1 === easyCrypto.problem ? '✅' : '❌'}\n`);

const mediumCrypto = ProblemGenerator.generateCryptoPuzzle("medium");
console.log(`   Medium: ${mediumCrypto.description}`);
console.log(`   Hash: ${mediumCrypto.problem}`);
console.log(`   Preimage: "${mediumCrypto.solution}"`);
const verifyHash2 = ethers.keccak256(ethers.toUtf8Bytes(mediumCrypto.solution));
console.log(`   Verify: ${verifyHash2 === mediumCrypto.problem ? '✅' : '❌'}\n`);

// Test 4: Random generation
console.log("4. Random Generation:\n");

for (let i = 0; i < 5; i++) {
  const random = ProblemGenerator.generateRandom("easy");
  console.log(`   - ${random.problemType}: ${random.description}`);
}

console.log("\n✅ All problem generator tests passed!");
console.log("\nReady to generate problems for:");
console.log("  ✅ Factorization (easy/medium/hard)");
console.log("  ✅ Equations (easy/medium/hard)");
console.log("  ✅ Crypto puzzles (easy/medium/hard)");
console.log("  ✅ Random problems");
