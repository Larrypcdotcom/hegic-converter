const { ethers } = require('hardhat');
const BN = ethers.BigNumber.from;

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-as-promised'));

//------------------------------------------------------------------------------
// Test FakeHegicToken
//------------------------------------------------------------------------------

describe('FakeHegicToken', () => {
  let owner;
  let user;
  let FakeHegicTokenInstance;

  beforeEach(async () => {
    [ owner, user ] = await ethers.getSigners();

    const FakeHegicToken = await ethers.getContractFactory('FakeHegicToken');
    FakeHegicTokenInstance = await FakeHegicToken.deploy();
  })

  it('should mint the owner 100 tokens when deployed, and have 100 total supply', async () => {
    const ownerBalance = await FakeHegicTokenInstance.balanceOf(owner.address);
    expect(ownerBalance).to.equal('100000000000000000000');

    const totalSupply = await FakeHegicTokenInstance.totalSupply();
    expect(totalSupply).to.equal('100000000000000000000');
  });

  it('should transfer 50 tokens from owner to user', async () => {
    await FakeHegicTokenInstance.connect(owner)
      .transfer(user.address, '50000000000000000000');

    const ownerBalance = await FakeHegicTokenInstance.balanceOf(owner.address);
    expect(ownerBalance).to.equal('50000000000000000000');

    const userBalance = await FakeHegicTokenInstance.balanceOf(user.address);
    expect(userBalance).to.equal('50000000000000000000');
  });

  it('should return the corrent token name', async () => {
    const tokenName = await FakeHegicTokenInstance.getTokenName();
    expect(tokenName).to.equal('Fake HEGIC');
  });
});

//------------------------------------------------------------------------------
// Test FakeRHegicToken
//------------------------------------------------------------------------------

describe('FakeRHegicToken', () => {
  let FakeRHegicTokenInstance;

  beforeEach(async () => {
    const FakeRHegicToken = await ethers.getContractFactory('FakeRHegicToken');
    FakeRHegicTokenInstance = await FakeRHegicToken.deploy();
  });

  it('should return the correct token name', async () => {
    const tokenName = await FakeRHegicTokenInstance.getTokenName();
    expect(tokenName).to.equal('Fake rHEGIC');
  });
});

//------------------------------------------------------------------------------
// Test IOUTokenRedemption
//------------------------------------------------------------------------------

describe('IOUTokenRedemption', () => {
  let owner;
  let FakeHegicTokenInstance;
  let FakeRHegicTokenInstance;
  let IOUTokenRedemptionInstance;

  beforeEach(async () => {
    [ owner ] = await ethers.getSigners();

    const FakeHegicToken = await ethers.getContractFactory('FakeHegicToken');
    FakeHegicTokenInstance = await FakeHegicToken.deploy();

    const FakeRHegicToken = await ethers.getContractFactory('FakeRHegicToken');
    FakeRHegicTokenInstance = await FakeRHegicToken.deploy();

    const IOUTokenRedemption = await ethers.getContractFactory('IOUTokenRedemption');
    IOUTokenRedemptionInstance = await IOUTokenRedemption
      .deploy(FakeRHegicTokenInstance.address, FakeHegicTokenInstance.address, 5);

    await FakeHegicTokenInstance.connect(owner)
      .transfer(IOUTokenRedemptionInstance.address, '100000000000000000000');

    await FakeRHegicTokenInstance.connect(owner)
      .approve(IOUTokenRedemptionInstance.address, '100000000000000000000');

    await IOUTokenRedemptionInstance.connect(owner).deposit('50000000000000000000');
  });

  it('should take rHEGIC deposit and record relevant data in state variables', async () => {
    const balance = await FakeRHegicTokenInstance.balanceOf(IOUTokenRedemptionInstance.address);
    expect(balance).to.equal('50000000000000000000');

    const depositData = await IOUTokenRedemptionInstance.deposits(owner.address);
    expect(depositData.amountDeposited).to.equal('50000000000000000000');
  });

  it('should reject if user attempts to make more than one deposit', async () => {
    await expect(IOUTokenRedemptionInstance.connect(owner).deposit('50000000000000000000'))
      .to.be.rejectedWith('This account has already deposited');
  });

  it('should transfer correct amount of output token user redeems', async () => {
    await IOUTokenRedemptionInstance.connect(owner).redeem();
    const amountRedeemed = await FakeHegicTokenInstance.balanceOf(owner.address);

    const blocksToRelease = await IOUTokenRedemptionInstance.blocksToRelease();
    const currentBlock = await ethers.provider.getBlockNumber();
    const userDeposit = await IOUTokenRedemptionInstance.deposits(owner.address);

    const correctRedeemableAmount = BN(userDeposit.amountDeposited)
      .mul(BN(currentBlock).sub(userDeposit.blockDeposited)).div(blocksToRelease);

    expect(amountRedeemed).to.equal(correctRedeemableAmount);
  });
});

//------------------------------------------------------------------------------
// Test FakeHegicStakingPool
//------------------------------------------------------------------------------

describe('FakeHegicStakingPool', () => {
  let owner;
  let FakeHegicTokenInstance;
  let FakeHegicStakingPoolInstance;

  beforeEach(async () => {
    [ owner ] = await ethers.getSigners();

    const FakeHegicToken = await ethers.getContractFactory('FakeHegicToken');
    FakeHegicTokenInstance = await FakeHegicToken.deploy();

    const FakeHegicStakingPool = await ethers.getContractFactory('FakeHegicStakingPool');
    FakeHegicStakingPoolInstance = await FakeHegicStakingPool
      .deploy(FakeHegicTokenInstance.address);
  });

  it('should take 50 HEGIC deposit and issue 50 sHEGIC back', async () => {
    await FakeHegicTokenInstance.connect(owner)
      .approve(FakeHegicStakingPoolInstance.address, '50000000000000000000');

    await FakeHegicStakingPoolInstance.connect(owner)
      .deposit('50000000000000000000');

    const poolBalance = await FakeHegicTokenInstance.balanceOf(FakeHegicStakingPoolInstance.address);
    expect(poolBalance).to.equal('50000000000000000000');

    const userBalance = await FakeHegicStakingPoolInstance.balanceOf(owner.address);
    expect(userBalance).to.equal('50000000000000000000');
  });
});

//------------------------------------------------------------------------------
// Test Fake zLOT contracts
//------------------------------------------------------------------------------

describe('FakeZHegicToken & FakeHegicPoolV2', () => {
  let owner;
  let FakeHegicTokenInstance;
  let FakeZHegicTokenInstance;
  let FakeHegicPoolV2Instance;

  beforeEach(async () => {
    [ owner ] = await ethers.getSigners();

    const FakeHegicToken = await ethers.getContractFactory('FakeHegicToken');
    FakeHegicTokenInstance = await FakeHegicToken.deploy();

    const FakeZHegicToken = await ethers.getContractFactory('FakeZHegicToken');
    FakeZHegicTokenInstance = await FakeZHegicToken.deploy();

    const FakeHegicPoolV2 = await ethers.getContractFactory('FakeHegicPoolV2');
    FakeHegicPoolV2Instance = await FakeHegicPoolV2
      .deploy(FakeHegicTokenInstance.address, FakeZHegicTokenInstance.address);

    await FakeZHegicTokenInstance.connect(owner).setPool(FakeHegicPoolV2Instance.address);

    await FakeHegicTokenInstance.connect(owner)
      .approve(FakeHegicPoolV2Instance.address, '100000000000000000000');
  });

  it('should take HEGIC deposit and mint correct amount of zHEGIC token', async () => {
    for (i = 0; i < 4; i++) {
      await FakeHegicPoolV2Instance.connect(owner).deposit('25000000000000000000');
    }

    const balance = await FakeZHegicTokenInstance.balanceOf(owner.address);
    expect(balance).to.equal('81803232998885172797');
  });
})
