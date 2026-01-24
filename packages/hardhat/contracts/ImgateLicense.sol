// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ImgateLicense
 * @notice Event-based image licensing with USDC payments on Base
 * @dev Platform fee: 5%, Creator: 95%
 */
contract ImgateLicense is Ownable, ReentrancyGuard {
    // Base testnet USDC contract
    IERC20 public immutable usdc;
    
    // Platform fee recipient
    address public platformFeeRecipient;
    
    // Platform fee percentage (500 = 5%)
    uint256 public constant PLATFORM_FEE_BPS = 500;
    uint256 public constant BPS_DENOMINATOR = 10000;
    
    // License duration (24 hours)
    uint256 public constant LICENSE_DURATION = 24 hours;
    
    // Asset metadata
    struct Asset {
        address creator;
        uint256 price;
        bool exists;
    }
    
    // assetId => Asset
    mapping(bytes32 => Asset) public assets;
    
    // Events
    event AssetRegistered(
        bytes32 indexed assetId,
        address indexed creator,
        uint256 price,
        uint256 timestamp
    );
    
    event Purchased(
        bytes32 indexed assetId,
        address indexed payer,
        address indexed creator,
        uint256 amount,
        uint256 platformFee,
        uint256 creatorAmount,
        uint256 expiresAt,
        uint256 timestamp
    );
    
    event PlatformFeeRecipientUpdated(
        address indexed oldRecipient,
        address indexed newRecipient
    );
    
    /**
     * @notice Constructor
     * @param _usdc USDC token address on Base testnet
     * @param _platformFeeRecipient Initial platform fee recipient
     */
    constructor(address _usdc, address _platformFeeRecipient) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_platformFeeRecipient != address(0), "Invalid fee recipient");
        
        usdc = IERC20(_usdc);
        platformFeeRecipient = _platformFeeRecipient;
    }
    
    /**
     * @notice Register a new asset for licensing
     * @param assetId Unique identifier for the asset
     * @param price Price in USDC (6 decimals)
     */
    function registerAsset(bytes32 assetId, uint256 price) external {
        require(!assets[assetId].exists, "Asset already exists");
        require(price > 0, "Price must be greater than 0");
        
        assets[assetId] = Asset({
            creator: msg.sender,
            price: price,
            exists: true
        });
        
        emit AssetRegistered(assetId, msg.sender, price, block.timestamp);
    }
    
    /**
     * @notice Purchase a license for an asset
     * @param assetId The asset to purchase
     */
    function purchase(bytes32 assetId) external nonReentrant {
        Asset memory asset = assets[assetId];
        require(asset.exists, "Asset does not exist");
        require(asset.price > 0, "Invalid price");
        
        uint256 price = asset.price;
        address creator = asset.creator;
        
        // Calculate splits
        uint256 platformFee = (price * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 creatorAmount = price - platformFee;
        
        // Transfer USDC from buyer
        require(
            usdc.transferFrom(msg.sender, address(this), price),
            "USDC transfer failed"
        );
        
        // Transfer to creator
        require(
            usdc.transfer(creator, creatorAmount),
            "Creator payment failed"
        );
        
        // Transfer platform fee
        require(
            usdc.transfer(platformFeeRecipient, platformFee),
            "Platform fee payment failed"
        );
        
        // Calculate expiry
        uint256 expiresAt = block.timestamp + LICENSE_DURATION;
        
        // Emit purchase event for backend indexing
        emit Purchased(
            assetId,
            msg.sender,
            creator,
            price,
            platformFee,
            creatorAmount,
            expiresAt,
            block.timestamp
        );
    }
    
    /**
     * @notice Update platform fee recipient (owner only)
     * @param newRecipient New fee recipient address
     */
    function updatePlatformFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid recipient");
        
        address oldRecipient = platformFeeRecipient;
        platformFeeRecipient = newRecipient;
        
        emit PlatformFeeRecipientUpdated(oldRecipient, newRecipient);
    }
    
    /**
     * @notice Get asset details
     * @param assetId The asset ID to query
     * @return creator The creator address
     * @return price The price in USDC
     * @return exists Whether the asset exists
     */
    function getAsset(bytes32 assetId) external view returns (
        address creator,
        uint256 price,
        bool exists
    ) {
        Asset memory asset = assets[assetId];
        return (asset.creator, asset.price, asset.exists);
    }
}
