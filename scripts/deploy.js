
const hre = require("hardhat");

async function main() {
  //This is the account where the mint fee would go. In this scenario this account is also the owner.
  const treasury = "0x09D4198B9c75442f8C2Fae18EB5925f310003296"; 
  //deploying mDai
  const MockDai = await hre.ethers.getContractFactory("MDai");
  const mDai = await MockDai.deploy();

  //deploying MockNft
  const NFTMock = await ethers.getContractFactory('MockNft');
  mNft = await NFTMock.deploy("Mock NFT", "mNft", treasury, mDai.address);

  console.log("Mock dai deployed at:", mDai.address);
  console.log("NFT deployed at:", mNft.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
