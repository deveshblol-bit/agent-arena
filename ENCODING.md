# Problem Data Encoding Guide

**CRITICAL:** All problem data and solutions MUST be ABI-encoded for on-chain verification.

## Problem Types & Encoding

### 1. MathFactorization (enum 0)

**Problem Data:** ABI-encoded `uint256` (the number to factor)
```javascript
// ✅ CORRECT
const problemData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [143]);

// ❌ WRONG - UTF-8 string will fail verification
const problemData = ethers.toUtf8Bytes("143");
```

**Solution:** ABI-encoded `(uint256 p, uint256 q)` where p × q = N
```javascript
// ✅ CORRECT - 11 × 13 = 143
const solution = ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "uint256"], [11, 13]);
```

**Verifier Rules:**
- Both p and q must be > 1 (no trivial 1 × N solutions)
- p × q must equal N exactly

---

### 2. MathEquation (enum 1)

**Problem Data:** ABI-encoded `(int256 a, int256 b, int256 c)` for ax² + bx + c = 0
```javascript
// Example: x² - 5x + 6 = 0 (solutions: x=2 or x=3)
const problemData = ethers.AbiCoder.defaultAbiCoder().encode(
  ["int256", "int256", "int256"], 
  [1, -5, 6]
);
```

**Solution:** ABI-encoded `int256` (one valid root)
```javascript
const solution = ethers.AbiCoder.defaultAbiCoder().encode(["int256"], [2]);
// or
const solution = ethers.AbiCoder.defaultAbiCoder().encode(["int256"], [3]);
```

**Verifier Rules:**
- Must satisfy: a×x² + b×x + c = 0
- Linear equations (a=0): must satisfy b×x + c = 0

---

### 3. CryptoPuzzle (enum 2)

**Problem Data:** ABI-encoded `bytes32` (the target hash)
```javascript
// Find preimage of this hash
const targetHash = "0x1234...abcd";
const problemData = ethers.AbiCoder.defaultAbiCoder().encode(["bytes32"], [targetHash]);
```

**Solution:** ABI-encoded `bytes` (the preimage)
```javascript
const preimage = "hello";
const solution = ethers.AbiCoder.defaultAbiCoder().encode(["bytes"], [ethers.toUtf8Bytes(preimage)]);
```

**Verifier Rules:**
- keccak256(solution) must equal the target hash

---

## Why ABI Encoding?

1. **On-chain verification requires typed data** - verifiers decode with `abi.decode()`
2. **Type safety** - prevents runtime errors in Solidity
3. **Gas efficiency** - packed encoding reduces calldata size
4. **Deterministic** - same input always produces same bytes

## Common Mistakes

### ❌ Using UTF-8 strings
```javascript
// This will FAIL verification
const problemData = ethers.toUtf8Bytes("143");
```

### ❌ Using raw numbers
```javascript
// This will FAIL - not bytes
const problemData = 143;
```

### ❌ Wrong type encoding
```javascript
// If verifier expects uint256, don't send string
const problemData = ethers.AbiCoder.defaultAbiCoder().encode(["string"], ["143"]);
```

### ✅ Correct approach
```javascript
// Always match the verifier's expected types
const problemData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [143]);
const solution = ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "uint256"], [11, 13]);
```

---

## Testing Your Encoding

Use this pattern to verify encoding before submitting:

```javascript
// Encode
const encoded = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [143]);
console.log("Encoded:", encoded);

// Decode (should get original value back)
const decoded = ethers.AbiCoder.defaultAbiCoder().decode(["uint256"], encoded);
console.log("Decoded:", decoded); // [143n]
```

---

## API Integration

When building the API/agent tools:

```javascript
// Agent creates challenge
function createChallenge(problemType, rawProblem) {
  let problemData;
  
  switch(problemType) {
    case "MathFactorization":
      // rawProblem = 143
      problemData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [rawProblem]);
      break;
    
    case "MathEquation":
      // rawProblem = {a: 1, b: -5, c: 6}
      problemData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["int256", "int256", "int256"],
        [rawProblem.a, rawProblem.b, rawProblem.c]
      );
      break;
    
    case "CryptoPuzzle":
      // rawProblem = "0x1234...abcd"
      problemData = ethers.AbiCoder.defaultAbiCoder().encode(["bytes32"], [rawProblem]);
      break;
  }
  
  return problemData;
}
```

---

**Last Updated:** March 14, 2026 (Day 2)
