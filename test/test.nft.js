const { expect } = require('chai');
const { ethers } = require('hardhat');
const { expectRevert } = require('@openzeppelin/test-helpers');


describe('NFTMockWithPermit & Gas Optimisation Check', () => {
    // helper to sign using (spender, tokenId, nonce, deadline)
    async function sign(spender, tokenId, nonce, deadline) {
        const typedData = {
            types: {
                Permit: [
                    { name: 'spender', type: 'address' },
                    { name: 'tokenId', type: 'uint256' },
                    { name: 'nonce', type: 'uint256' },
                    { name: 'deadline', type: 'uint256' },
                ],
            },
            primaryType: 'Permit',
            domain: {
                name: await mNft.name(),
                version: '1',
                chainId: chainId,
                verifyingContract: mNft.address,
            },
            message: {
                spender,
                tokenId,
                nonce,
                deadline,
            },
        };

        // sign Permit
        const signature = await deployer._signTypedData(
            typedData.domain,
            { Permit: typedData.types.Permit },
            typedData.message,
        );

        return signature;
    }


    before(async () => {
        [deployer, acc1, acc2, treasury] = await ethers.getSigners();

        // get chainId
        chainId = await ethers.provider.getNetwork().then((n) => n.chainId);
    });

    beforeEach(async () => {
        // deploying Mock dai
        const MDai = await hre.ethers.getContractFactory("MDai");
        mDai = await MDai.connect(deployer).deploy();
        //deploying mockNFT contract
        const NFTMock = await ethers.getContractFactory('MockNft');
        mNft = await NFTMock.deploy("Mock NFT", "mNft", treasury.address, mDai.address);
        
        //Transfering mDai and approving Nft mNft 
        amount = ethers.utils.parseEther( "500");
        await mDai.connect(deployer).transfer(acc1.address, amount);
        await mDai.connect(deployer).approve(mNft.address, amount);
        await mDai.connect(acc1).approve(mNft.address, amount);      
        
        //setting sale status Active
        await mNft.connect(deployer).setSaleState();
        //minting NFT to deployer
        await mNft.mint();
    
    });

    describe('Permit Testing', async function () {
        it('Increments nonce after each transfer', async function () {
            expect(await mNft.nonces(0)).to.be.equal(0);
            await mNft.transferFrom(deployer.address, acc1.address,0);
            expect(await mNft.nonces(0)).to.be.equal(1);
            await mNft.connect(acc1).transferFrom(acc1.address, deployer.address, 0);
            expect(await mNft.nonces(0)).to.be.equal(2);
        });

        it('Using permit for approval', async function () {
            // set deadline in 7 days
            const deadline = parseInt(+new Date() / 1000) + 7 * 24 * 60 * 60;
            // sign Permit for acc1
            const signature = await sign(acc1.address, 0, await mNft.nonces(0), deadline);
            // verify that acc1 is not approved before permit is used
            expect(await mNft.getApproved(0)).to.not.equal(acc1.address );
            // use permit
            await mNft.connect(acc1).permit(acc1.address, 0, deadline, signature);
            // verify that now acc1 is approved
            expect(await mNft.getApproved(0)).to.be.equal(acc1.address);
        });

        it('No permit after a transfer if nonce is not same', async function () {
            // set deadline in 7 days
            const deadline = parseInt(+new Date() / 1000) + 7 * 24 * 60 * 60;
            // sign Permit for acc1
            const signature = await sign(acc1.address, 0, await mNft.nonces(0), deadline);
            // first transfer to acc2
            await mNft.transferFrom( deployer.address, acc2.address, 0);
            // then send back to deployer so owner is right (but nonce won't be)
            await mNft.connect(acc2).transferFrom( acc2.address, deployer.address, 0);
            // then try to use permit, should throw because nonce is not valid anymore
            await expect(mNft.connect(acc1).permit(acc1.address, 0, deadline, signature), "INVALID_SIGNATURE");
        });

        it('Can not use a permit with right nonce but wrong owner', async function () {
          // first transfer to someone
          await mNft.transferFrom( deployer.address, acc2.address, 0);
          // set deadline in 7 days
          const deadline = parseInt(+new Date() / 1000) + 7 * 24 * 60 * 60;
          // sign Permit for acc1
          // Permit will be signed using deployer account, so nonce is right, but owner isn't
          const signature = await sign(acc1.address, 0, 0, // nonce is one here
            deadline
          );
          // then try to use permit, should throw because owner is wrong
          await expectRevert(mNft.connect(acc1).permit(acc1.address, 0, deadline, signature),"INVALID_SIGNATURE");
        });

        it('Not able to use expired permit', async function () {
          // set deadline 7 days in the past
          const deadline = parseInt(+new Date() / 1000) - 7 * 24 * 60 * 60;
          // sign Permit for acc1
          // this Permit is expired as deadline is in the past
          const signature = await sign(acc1.address, 0, await mNft.nonces(0), deadline);
          await expectRevert(mNft.connect(acc1).permit(acc1.address, 0, deadline, signature), "DEADLINE_EXPIRED");
        });

        it('Approved / approvedForAll accounts can create valid permits', async function () {
          // first send token to acc2
          await mNft.transferFrom(deployer.address, acc2.address, 0);
          // set deadline in 7 days
          const deadline = parseInt(+new Date() / 1000) + 7 * 24 * 60 * 60;
          // get a signature from deployer for acc1
          // sign Permit for acc1
          const signature = await sign( acc1.address, 0,  await mNft.nonces(0), deadline);
          // acc1 tries to use signature, it should fail because deployer is not approved
          await expectRevert(mNft.connect(acc1).permit(acc1.address, 0, deadline, signature),"INVALID_SIGNATURE");
          // acc2 approves deployer
           await mNft.connect(acc2).setApprovalForAll(deployer.address, true);
          // // now usin the permit should work because deployer is approvedForAll on acc2 tokens
          await mNft.connect(acc1).permit(acc1.address, 0, deadline, signature);
          // acc1 should now be approved on tokenId one
          expect(await mNft.getApproved(0)).to.be.equal(acc1.address);
        });

        it('Using permit to approved and transfer in same tx (via safeTransferwithPermit)', async function () {
          // set deadline in 7 days
          const deadline = parseInt(+new Date() / 1000) + 7 * 24 * 60 * 60;
          // sign Permit for acc1
          const signature = await sign(acc1.address, 0, await mNft.nonces(0), deadline);
          expect(await mNft.getApproved(0)).to.not.equal(acc1.address);
          await mNft.connect(acc1).safeTransferFromWithPermit(
                  deployer.address, acc1.address, 0, [], deadline, signature);
          expect(await mNft.ownerOf(0)).to.be.equal( acc1.address);
        });

        it('Not able to use permit to approve and transfer in same tx via wrong sender', async function () {
          // set deadline in 7 days
          const deadline = parseInt(+new Date() / 1000) + 7 * 24 * 60 * 60;
          // sign Permit for acc1
          const signature = await sign(acc1.address, 0, await mNft.nonces(0), deadline);
          // try to use permit for acc1 with acc2 account, fails.
          await expectRevert(mNft.connect(acc2).safeTransferFromWithPermit(
                      deployer.address, acc1.address,
                      0, [], deadline, signature), "INVALID_SIGNATURE")
        });
      });

    describe("Gas Optimisation", async function(){
        it("Gas reduction after txs", async function(){
          const gas = [];
          for (let i=0; i<5; i++){
            const tx = await mNft.connect(acc1).mint();
            gas[i] = tx.gasPrice;
            console.log(`TX price of tx ${i + 1} is:  ${tx.gasPrice}`);
            };
        });
    });

    describe("Treasury Check", async function(){
        it("Treasury Balance", async function(){
          //Balance should be equal to 1 ether
          expect(await mDai.balanceOf(treasury.address)).to.be.equal("1000000000000000000");
        });
    });
});
