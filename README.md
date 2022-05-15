There are two primary contracts ERC721Standard.sol & ERC721Permit.sol in contracts/Contract directory.

ERC721Standard.sol is the base contract on the new implementation for efficient gas fees upon minting. Instead of using the default function provided by ERC721 for minting with passing arguments of address to and tokenId, this contract will use the length of the array called __owners__ (previously it was mapping). Essentially, when calling the mint function in contract MockNft. 

The idea behind this is to avoid storing the same data at two different places, in this scenario, tokenid to address mapping, instead, we use the array. For every mint, tokenId will increment (++tokenid). This also provides flexibility in terms of totalSupply. As the token id will always be same as array.length, which can also be implemented to get the total supply.   

We can have multiple NFT contracts derived from the base contract to use its functionalities.

ERC721Permit.sol allows us to approve and transfer in the same Transaction thus saving more gas in the future while being one step close to needing ether to interact with EVM chains. The permit is sort of divided into two hashes, first one being DOMAIN_SEPARATOR: primarily being based on the contract's name, version, chainId & address. This First is also very much needed to complete the second part of the hash. Which consists of the first part and spender info such as an address, tokenId, nonce and time. Once the given time has passed (in tests it is set to 7 days) permits get void, and a re-issue will be needed. 

MockNft.sol has a bit more complexity, a User can only buy a nft via Mockdai. The price is set to be 1 dai. Owner will have to set the sale status true for minting. This function can only be called by the owner. As this contract derives functions from both ERC721Standard and ERC721Permit, allowing us to use safeTransferFromWithPermit function which will call the permit function in ERC721Permit. 


Multiple different NFTs can be created via importing these two contracts as bases for easy access to gas efficiency and permit. 

Ropsten Deployment address:

NFT Contract Address: 0x3E8557170340b928E1D5E1edBab589F8bBc301d6 (https://ropsten.etherscan.io/address/0x3e8557170340b928e1d5e1edbab589f8bbc301d6)

MockDai Address: 0xc9183dF3DB6C8FfBAd778AE515e0bbd96c785D56 (https://ropsten.etherscan.io/address/0xc9183dF3DB6C8FfBAd778AE515e0bbd96c785D56#writeContract)

Try running some of the following tasks:

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
node scripts/sample-script.js
npx hardhat help
```
