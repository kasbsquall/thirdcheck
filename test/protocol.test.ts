import { expect } from "chai";
import { ethers } from "hardhat";

/**
 * Unit tests for the protocol surface that does not touch the precompile: the VerifiedRegistry, and
 * the SettlementHub's fee math, registry-aware discount, access control, and order guards. The full
 * settle() path calls the BlockProver precompile through ThirdCheckLib, which is the identical audited
 * path the ThirdCheck bench exercises on CC3; it is proven there, not re-mocked here.
 */
describe("VerifiedRegistry", () => {
  async function deploy() {
    const [owner, other, treasury] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("VerifiedRegistry");
    const registry = await Registry.deploy();
    await registry.waitForDeployment();
    // A real contract address to verify (the registry itself has code).
    const contractAddr = await registry.getAddress();
    return { registry, owner, other, treasury, contractAddr };
  }

  const VERSION = ethers.encodeBytes32String("tc-v3");

  it("verifies a contract and reports it verified", async () => {
    const { registry, contractAddr } = await deploy();
    await expect(registry.verify(contractAddr, 10000, VERSION))
      .to.emit(registry, "ConsumerVerified");
    expect(await registry.isVerifiedNow(contractAddr)).to.equal(true);
    const rec = await registry.getVerification(contractAddr);
    expect(rec.score).to.equal(10000);
    expect(rec.version).to.equal(VERSION);
    expect(rec.revoked).to.equal(false);
  });

  it("rejects verifying an EOA (no code)", async () => {
    const { registry, other } = await deploy();
    await expect(registry.verify(other.address, 100, VERSION))
      .to.be.revertedWithCustomError(registry, "NotAContract");
  });

  it("rejects a score above 10000", async () => {
    const { registry, contractAddr } = await deploy();
    await expect(registry.verify(contractAddr, 10001, VERSION))
      .to.be.revertedWithCustomError(registry, "BadScore");
  });

  it("only owner or an allowed verifier can write", async () => {
    const { registry, other, contractAddr } = await deploy();
    await expect(registry.connect(other).verify(contractAddr, 100, VERSION))
      .to.be.revertedWithCustomError(registry, "NotAuthorized");
    await registry.setVerifier(other.address, true);
    await expect(registry.connect(other).verify(contractAddr, 100, VERSION))
      .to.emit(registry, "ConsumerVerified");
  });

  it("revoke makes it no longer verified", async () => {
    const { registry, contractAddr } = await deploy();
    await registry.verify(contractAddr, 100, VERSION);
    await registry.revoke(contractAddr);
    expect(await registry.isVerifiedNow(contractAddr)).to.equal(false);
  });

  it("an unverified address is not verified", async () => {
    const { registry, contractAddr } = await deploy();
    expect(await registry.isVerifiedNow(contractAddr)).to.equal(false);
  });
});

describe("SettlementHub", () => {
  const FEE = 100; // 1%
  const DISCOUNT = 50; // 0.5%

  async function deploy() {
    const [owner, treasury, other] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("VerifiedRegistry");
    const registry = await Registry.deploy();
    await registry.waitForDeployment();
    const Hub = await ethers.getContractFactory("SettlementHub");
    const hub = await Hub.deploy(treasury.address, FEE);
    await hub.waitForDeployment();
    return { hub, registry, owner, treasury, other };
  }

  it("rejects a fee above the hard cap at construction", async () => {
    const [, treasury] = await ethers.getSigners();
    const Hub = await ethers.getContractFactory("SettlementHub");
    await expect(Hub.deploy(treasury.address, 101)).to.be.revertedWithCustomError(
      await ethers.getContractFactory("SettlementHub"),
      "FeeTooHigh",
    );
  });

  it("quotes the base fee with no registry", async () => {
    const { hub, other } = await deploy();
    const amount = ethers.parseEther("10");
    expect(await hub.quoteFee(other.address, amount)).to.equal((amount * BigInt(FEE)) / 10000n);
  });

  it("applies the verified discount to a verified operator", async () => {
    const { hub, registry } = await deploy();
    const registryAddr = await registry.getAddress();
    // Verify a real contract (the registry) and use it as the operator being quoted.
    await registry.verify(registryAddr, 10000, ethers.encodeBytes32String("tc-v3"));
    await hub.setConfig(await hub.treasury(), FEE, DISCOUNT, registryAddr);

    const amount = ethers.parseEther("10");
    const discounted = (amount * BigInt(FEE - DISCOUNT)) / 10000n;
    expect(await hub.quoteFee(registryAddr, amount)).to.equal(discounted);
    // An unverified contract still pays the full fee.
    const hubAddr = await hub.getAddress();
    expect(await hub.quoteFee(hubAddr, amount)).to.equal((amount * BigInt(FEE)) / 10000n);
  });

  it("setConfig is owner-only and enforces caps", async () => {
    const { hub, registry, other, treasury } = await deploy();
    const registryAddr = await registry.getAddress();
    await expect(
      hub.connect(other).setConfig(treasury.address, FEE, DISCOUNT, registryAddr),
    ).to.be.revertedWithCustomError(hub, "NotOwner");
    await expect(
      hub.setConfig(treasury.address, 101, 0, registryAddr),
    ).to.be.revertedWithCustomError(hub, "FeeTooHigh");
    await expect(
      hub.setConfig(treasury.address, 50, 60, registryAddr),
    ).to.be.revertedWithCustomError(hub, "FeeTooHigh");
  });

  it("openOrder validates input and records the operator", async () => {
    const { hub, owner, other } = await deploy();
    const orderId = ethers.encodeBytes32String("order-1");
    const src = other.address;
    await expect(
      hub.openOrder(orderId, other.address, 1, src, 10, 5, { value: ethers.parseEther("1") }),
    ).to.be.revertedWithCustomError(hub, "BadWindow");
    await expect(
      hub.openOrder(orderId, other.address, 1, src, 5, 10, { value: 0 }),
    ).to.be.revertedWithCustomError(hub, "ZeroValue");

    await hub.openOrder(orderId, other.address, 1, src, 5, 10, { value: ethers.parseEther("1") });
    const o = await hub.orders(orderId);
    expect(o.operator).to.equal(owner.address);
    expect(o.amount).to.equal(ethers.parseEther("1"));

    await expect(
      hub.openOrder(orderId, other.address, 1, src, 5, 10, { value: ethers.parseEther("1") }),
    ).to.be.revertedWithCustomError(hub, "OrderExists");
  });

  it("settle rejects an unknown order", async () => {
    const { hub } = await deploy();
    const merkle = { root: ethers.ZeroHash, siblings: [] } as any;
    const cont = { lowerEndpointDigest: ethers.ZeroHash, roots: [] } as any;
    await expect(
      hub.settle(ethers.encodeBytes32String("nope"), 1, 5, "0x", merkle, cont),
    ).to.be.revertedWithCustomError(hub, "UnknownOrder");
  });
});
