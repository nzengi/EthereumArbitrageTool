// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IFlashLoanReceiver.sol";

interface IPool {
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path)
        external view returns (uint[] memory amounts);
    
    function WETH() external pure returns (address);
}

contract FlashLoanArbitrageMainnet is ReentrancyGuard, Ownable, IFlashLoanReceiver {
    using SafeERC20 for IERC20;

    // Aave V3 Pool Address (Mainnet)
    IPool public constant AAVE_POOL = IPool(0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2);
    
    // DEX Router addresses (Mainnet)
    address public constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public constant SUSHISWAP_ROUTER = 0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F;
    
    // Token addresses (Mainnet)
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    
    // Fee percentage (0.1% = 10 basis points) - only on profits
    uint256 public constant FEE_BPS = 10;
    uint256 public constant MAX_INT = 2**256 - 1;

    address public feeCollector;
    uint256 public minProfitThreshold = 0.005 ether; // $12 minimum for small capital

    struct ArbitrageParams {
        address tokenA;
        address tokenB;
        uint256 amountIn;
        address router1; // Buy on this DEX
        address router2; // Sell on this DEX
        uint256 minProfitWei;
    }

    event ArbitrageExecuted(
        address indexed tokenA,
        address indexed tokenB,
        uint256 amountBorrowed,
        uint256 profit,
        address buyDex,
        address sellDex
    );

    event ProfitWithdrawn(address indexed token, uint256 amount, address indexed to);
    event FeeCollectorUpdated(address indexed oldCollector, address indexed newCollector);
    event MinProfitUpdated(uint256 oldThreshold, uint256 newThreshold);

    constructor(address _feeCollector) Ownable(msg.sender) {
        require(_feeCollector != address(0), "Invalid fee collector");
        feeCollector = _feeCollector;
    }

    /**
     * @dev Initiates flash loan arbitrage - optimized for small capital
     * @param asset The asset to borrow (should be tokenA)
     * @param amount The amount to borrow (recommended: 1 ETH for small capital)
     * @param params Encoded arbitrage parameters
     */
    function startArbitrage(
        address asset,
        uint256 amount,
        bytes calldata params
    ) external nonReentrant onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        require(asset != address(0), "Invalid asset address");
        
        // Decode params to validate
        ArbitrageParams memory arbParams = abi.decode(params, (ArbitrageParams));
        require(arbParams.tokenA != address(0) && arbParams.tokenB != address(0), "Invalid token addresses");
        require(arbParams.router1 != address(0) && arbParams.router2 != address(0), "Invalid router addresses");
        
        // Execute flash loan
        AAVE_POOL.flashLoanSimple(
            address(this),
            asset,
            amount,
            params,
            0 // referralCode
        );
    }

    /**
     * @dev This function is called after your contract has received the flash loaned amount
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool) {
        require(msg.sender == address(AAVE_POOL), "Caller must be AAVE Pool");
        require(initiator == address(this), "Invalid initiator");
        
        // Decode arbitrage parameters
        ArbitrageParams memory arbParams = abi.decode(params, (ArbitrageParams));
        
        // Execute arbitrage
        uint256 finalBalance = _executeArbitrage(asset, amount, arbParams);
        
        // Calculate repayment amount (Aave V3 fee: 0.09%)
        uint256 totalDebt = amount + premium;
        require(finalBalance >= totalDebt, "Not enough balance to repay loan");
        
        // Calculate profit
        uint256 profit = finalBalance - totalDebt;
        require(profit >= arbParams.minProfitWei, "Profit below minimum threshold");
        
        // Take fee if there's profit (0.1% of profit, not borrowed amount)
        if (profit > 0) {
            uint256 feeAmount = (profit * FEE_BPS) / 10000;
            if (feeAmount > 0 && feeAmount < profit) {
                IERC20(asset).safeTransfer(feeCollector, feeAmount);
            }
        }
        
        // Approve AAVE pool to pull the repayment
        IERC20(asset).approve(address(AAVE_POOL), totalDebt);
        
        emit ArbitrageExecuted(
            arbParams.tokenA,
            arbParams.tokenB,
            amount,
            profit,
            arbParams.router1,
            arbParams.router2
        );
        
        return true;
    }

    /**
     * @dev Internal function to execute arbitrage logic
     */
    function _executeArbitrage(
        address asset,
        uint256 amount,
        ArbitrageParams memory params
    ) internal returns (uint256) {
        // Step 1: Swap tokenA to tokenB on first DEX
        uint256 tokenBAmount = _performSwap(
            params.tokenA,
            params.tokenB,
            amount,
            params.router1
        );
        
        require(tokenBAmount > 0, "First swap failed");
        
        // Step 2: Swap tokenB back to tokenA on second DEX
        uint256 finalTokenAAmount = _performSwap(
            params.tokenB,
            params.tokenA,
            tokenBAmount,
            params.router2
        );
        
        require(finalTokenAAmount > amount, "Arbitrage not profitable");
        
        return IERC20(asset).balanceOf(address(this));
    }

    /**
     * @dev Performs token swap on specified DEX
     */
    function _performSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address router
    ) internal returns (uint256) {
        require(amountIn > 0, "Invalid amount");
        
        IERC20(tokenIn).approve(router, amountIn);
        
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        uint256[] memory amounts = IUniswapV2Router(router).swapExactTokensForTokens(
            amountIn,
            0, // Accept any amount of tokens out
            path,
            address(this),
            block.timestamp + 300 // 5 minutes deadline
        );
        
        return amounts[1];
    }

    /**
     * @dev Get expected output amount for a swap
     */
    function getAmountsOut(
        uint256 amountIn,
        address tokenIn,
        address tokenOut,
        address router
    ) external view returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        uint256[] memory amounts = IUniswapV2Router(router).getAmountsOut(amountIn, path);
        return amounts[1];
    }

    /**
     * @dev Calculate potential profit for arbitrage - optimized for small capital
     */
    function calculateArbitrageProfit(
        address tokenA,
        address tokenB,
        uint256 amount,
        address router1,
        address router2
    ) external view returns (uint256 profit, bool profitable) {
        try this.getAmountsOut(amount, tokenA, tokenB, router1) returns (uint256 tokenBAmount) {
            try this.getAmountsOut(tokenBAmount, tokenB, tokenA, router2) returns (uint256 finalAmount) {
                if (finalAmount > amount) {
                    profit = finalAmount - amount;
                    profitable = profit >= minProfitThreshold;
                } else {
                    profit = 0;
                    profitable = false;
                }
            } catch {
                profit = 0;
                profitable = false;
            }
        } catch {
            profit = 0;
            profitable = false;
        }
    }

    // Admin functions
    function setFeeCollector(address _feeCollector) external onlyOwner {
        require(_feeCollector != address(0), "Invalid fee collector");
        address oldCollector = feeCollector;
        feeCollector = _feeCollector;
        emit FeeCollectorUpdated(oldCollector, _feeCollector);
    }

    function setMinProfitThreshold(uint256 _minProfitThreshold) external onlyOwner {
        uint256 oldThreshold = minProfitThreshold;
        minProfitThreshold = _minProfitThreshold;
        emit MinProfitUpdated(oldThreshold, _minProfitThreshold);
    }

    /**
     * @dev Withdraw profits (only owner)
     */
    function withdrawProfit(address token, uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        require(IERC20(token).balanceOf(address(this)) >= amount, "Insufficient balance");
        
        IERC20(token).safeTransfer(msg.sender, amount);
        emit ProfitWithdrawn(token, amount, msg.sender);
    }

    /**
     * @dev Emergency withdrawal (only owner)
     */
    function emergencyWithdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(msg.sender, balance);
            emit ProfitWithdrawn(token, balance, msg.sender);
        }
    }

    // View functions
    function getContractBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    receive() external payable {}
} 