const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HashVerifier", function () {
  let verifier;

  beforeEach(async () => {
    verifier = await (await ethers.getContractFactory("HashVerifier")).deploy();
  });

  it("should verify correct preimage", async () => {
    const preimage = ethers.toUtf8Bytes("secret123");
    const targetHash = ethers.keccak256(preimage);

    const problemData = ethers.AbiCoder.defaultAbiCoder().encode(["bytes32"], [targetHash]);
    const solution = ethers.AbiCoder.defaultAbiCoder().encode(["bytes"], [preimage]);

    expect(await verifier.verify(problemData, solution)).to.be.true;
  });

  it("should reject wrong preimage", async () => {
    const preimage = ethers.toUtf8Bytes("secret123");
    const targetHash = ethers.keccak256(preimage);
    const wrongPreimage = ethers.toUtf8Bytes("wrong");

    const problemData = ethers.AbiCoder.defaultAbiCoder().encode(["bytes32"], [targetHash]);
    const solution = ethers.AbiCoder.defaultAbiCoder().encode(["bytes"], [wrongPreimage]);

    expect(await verifier.verify(problemData, solution)).to.be.false;
  });
});

describe("EquationVerifier", function () {
  let verifier;

  beforeEach(async () => {
    verifier = await (await ethers.getContractFactory("EquationVerifier")).deploy();
  });

  it("should verify correct solution to x^2 - 4 = 0 (x=2)", async () => {
    // 1*x^2 + 0*x + (-4) = 0 → x = 2
    const problemData = ethers.AbiCoder.defaultAbiCoder().encode(
      ["int256", "int256", "int256"], [1, 0, -4]
    );
    const solution = ethers.AbiCoder.defaultAbiCoder().encode(["int256"], [2]);

    expect(await verifier.verify(problemData, solution)).to.be.true;
  });

  it("should verify x = -2 also solves x^2 - 4 = 0", async () => {
    const problemData = ethers.AbiCoder.defaultAbiCoder().encode(
      ["int256", "int256", "int256"], [1, 0, -4]
    );
    const solution = ethers.AbiCoder.defaultAbiCoder().encode(["int256"], [-2]);

    expect(await verifier.verify(problemData, solution)).to.be.true;
  });

  it("should verify linear equation 2x + 6 = 0 (x=-3)", async () => {
    // 0*x^2 + 2*x + 6 = 0 → x = -3
    const problemData = ethers.AbiCoder.defaultAbiCoder().encode(
      ["int256", "int256", "int256"], [0, 2, 6]
    );
    const solution = ethers.AbiCoder.defaultAbiCoder().encode(["int256"], [-3]);

    expect(await verifier.verify(problemData, solution)).to.be.true;
  });

  it("should reject wrong solution", async () => {
    const problemData = ethers.AbiCoder.defaultAbiCoder().encode(
      ["int256", "int256", "int256"], [1, 0, -4]
    );
    const solution = ethers.AbiCoder.defaultAbiCoder().encode(["int256"], [3]);

    expect(await verifier.verify(problemData, solution)).to.be.false;
  });
});
