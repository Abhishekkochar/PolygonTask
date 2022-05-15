// SPDX-License-Identifier: MIT

pragma solidity ^0.8.1;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import './ERC721Permit.sol';
import "./ERC721Standard.sol";

contract MockNft is ERC721Standard, ERC721Permit{
    address public OWNER;

    //BaseURI string
    string private baseURI;
    
    // Bool to init the sales.
    bool public activeSale = false;

    // This is where the funds will go
    address public feeTo;

    // Selling NFT for 50 dai
    uint256 public salePrice  = 1 ether;

    //init IERC20
    IERC20 daiToken;


    //Modifier - onlyOwner
    modifier onlyOwner(){
        require(msg.sender == OWNER, "NOT_OWNER");
        _;
    }

    /**
     * @dev Initializes the contract by setting a `name` and a `symbol` to the token collection.
     */
    constructor(string memory name, string memory symbol, address _feeTo, address _daiAddress) ERC721Standard(name, symbol) validAddress(_feeTo) {
        OWNER = msg.sender;
        feeTo = _feeTo;
        daiToken = IERC20(_daiAddress);
     }

    /*
    * @notice allows the owner to render the sale inactive/active, in other words pausing and resuming
    */
    function setSaleState() external onlyOwner{
        activeSale = !activeSale;
    }

    /// @notice Mint next to
    function mint() public {
        require(activeSale, "SALE_NOT_ACTIVE");
        uint256 nftPrice = salePrice;
        require(daiToken.balanceOf(msg.sender) >= nftPrice, "INSUFFICENT_DAI_BALANCE");
        daiToken.transferFrom(msg.sender, feeTo, nftPrice);
        _mint(msg.sender);
    }

    /// @notice Allows to get approved using a permit and transfer in the same call
    /// @dev this supposes that the permit is for msg.sender
    /// @param from current owner
    /// @param to recipient
    /// @param tokenId the token id
    /// @param _data optional data to add
    /// @param deadline the deadline for the permit to be used
    /// @param signature of permit
    function safeTransferFromWithPermit(
        address from,
        address to,
        uint256 tokenId,
        bytes memory _data,
        uint256 deadline,
        bytes memory signature
    ) external {
        // use the permit to get msg.sender approved
        permit(msg.sender, tokenId, deadline, signature);

        // do the transfer
        safeTransferFrom(from, to, tokenId, _data);
    }

    // @inheritdoc ERC721
    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(ERC721Standard, ERC721Permit) {
        // do normal transfer
        super._transfer(from, to, tokenId);
    }

     /// @notice allows the owner to set the baseURI
    function setBaseURI(string memory _tokenBaseURI) external onlyOwner {
        baseURI = _tokenBaseURI;
    }

}