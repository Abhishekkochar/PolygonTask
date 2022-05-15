//SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;

import "hardhat/console.sol";
import '@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol';
import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import "./ERC721Standard.sol";
import '../interfaces/IERC721Permit.sol';

abstract contract ERC721Permit is ERC721Standard, IERC721Permit {
    bytes32 public constant PERMIT_TYPEHASH =
        keccak256(
            'Permit(address spender,uint256 tokenId,uint256 nonce,uint256 deadline)'
        );

    mapping(uint256 => uint256) private _nonces;

    // this are saved as immutable for cheap access
    bytes32 private immutable _domainSeparator;
    uint256 private immutable _domainChainId;

    constructor() {
        uint256 chainId = block.chainid;
        _domainChainId = chainId;
        _domainSeparator = _calculateDomainSeparator(chainId);
    }

    /// @notice Builds the DOMAIN_SEPARATOR (eip712) at time of use.
    function DOMAIN_SEPARATOR() public view override returns (bytes32) {
        uint256 chainId = block.chainid;
        return
            (chainId == _domainChainId)
                ? _domainSeparator
                : _calculateDomainSeparator(chainId);
    }

    function _calculateDomainSeparator(uint256 chainId) internal view returns (bytes32){
        return
            keccak256(
                abi.encode(
                    keccak256(
                        'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'
                    ),
                    keccak256(bytes(name())),
                    keccak256(bytes('1')),
                    block.chainid,
                    address(this)
                )
            );
    }

    /// @notice Allows to retrieve current nonce for token
    /// @param tokenId token id
    /// @return current token nonce
    function nonces(uint256 tokenId) public view override returns (uint256) {
        require(_exists(tokenId), 'UNKNOWN_TOKEN');
        return _nonces[tokenId];
    }

    /// @notice function to be called by anyone to approve `spender` using a Permit signature
    /// @dev Anyone can call this to approve `spender`, even a third-party
    /* /// @param owner the owner of the token */
    /// @param spender the actor to approve
    /// @param tokenId the token id
    /// @param deadline the deadline for the permit to be used
    /// @param signature permit
    function permit(address spender, uint256 tokenId, uint256 deadline, bytes memory signature) public override {
        require(deadline >= block.timestamp, 'DEADLINE_EXPIRED');
        bytes32 digest = _buildDigest(
            // owner,
            spender,
            tokenId,
            _nonces[tokenId],
            deadline
        );

        (address recoveredAddress, ) = ECDSA.tryRecover(digest, signature);
        //console.log(_isApprovedOrOwner(recoveredAddress, tokenId));
        require(
            // verify if the recovered address is owner or approved on tokenId
            // and make sure recoveredAddress is not address(0), else getApproved(tokenId) might match
            
            (recoveredAddress != address(0) &&
                _isApprovedOrOwner(recoveredAddress, tokenId)) ||
                // else try to recover signature using SignatureChecker, this allows to recover signature by contracts
                SignatureChecker.isValidSignatureNow(
                    ownerOf(tokenId),
                    digest,
                    signature
                ),
            'INVALID_SIGNATURE'
        );

        _approve(spender, tokenId);
    }

    /// @notice Builds the permit digest to sign
    /// @param spender the token spender
    /// @param tokenId the tokenId
    /// @param nonce the nonce to make a permit for
    /// @param deadline the deadline before when the permit can be used
    /// @return the digest (following eip712) to sign
    function _buildDigest(
        address spender,
        uint256 tokenId,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes32) {
        return
            ECDSA.toTypedDataHash(
                DOMAIN_SEPARATOR(),
                keccak256(
                    abi.encode(
                        PERMIT_TYPEHASH,
                        spender,
                        tokenId,
                        nonce,
                        deadline
                    )
                )
            );
    }

    /// @dev helper to easily increment a nonce for a given tokenId
    /// @param tokenId the tokenId to increment the nonce for
    function _incrementNonce(uint256 tokenId) internal {
        _nonces[tokenId]++;
    }

    // @dev _transfer override to be able to increment the nonce
    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override {
        //increment the nonce to be sure it can't be reused
        _incrementNonce(tokenId);

        //normal transfer
        super._transfer(from, to, tokenId);
    }

}