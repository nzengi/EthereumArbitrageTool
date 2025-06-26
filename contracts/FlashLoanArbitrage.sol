// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IFlashLoanReceiver.sol";

interface ILendingPool {
    function flashLoan(
        address receiverAddress,
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata interestRateModes,
        address onBehalfOf,
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
}

interface ISushiSwapRouter {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path)
        external view returns (uint[] memory amounts);
}

contract FlashLoanArbitrage is IFlashLoanReceiver, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    ILendingPool public immutable LENDING_POOL;
    address public immutable FEE_COLLECTOR;
    
    // DEX Router addresses (Sepolia Testnet)
    address public constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public constant SUSHISWAP_ROUTER = 0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F;
    
    // Common tokens (Sepolia Testnet)
    address public constant WETH = 0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9;
    address public constant USDC = 0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8;
    
    // Fee percentage (0.1% = 10 basis points)
    uint256 public constant FEE_BPS = 10;

    struct ArbitrageParams {
        address tokenIn;
        address tokenOut;
        string buyDex;
        string sellDex;
        uint256 amountIn;
    }

    event ArbitrageExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountBorrowed,
        uint256 profit,
        string buyDex,
        string sellDex
    );

    event ProfitWithdrawn(address indexed token, uint256 amount, address indexed to);

    modifier onlyLendingPool() {
        require(msg.sender == address(LENDING_POOL), "Caller must be lending pool");
        _;
    }

    constructor(address _lendingPool, address _feeCollector) {
        require(_lendingPool != address(0), "Invalid lending pool address");
        require(_feeCollector != address(0), "Invalid fee collector address");
        LENDING_POOL = ILendingPool(_lendingPool);
        FEE_COLLECTOR = _feeCollector;
    }

    /**
     * @dev Initiates flash loan arbitrage
     * @param asset The asset to borrow
     * @param amount The amount to borrow
     * @param params Encoded arbitrage parameters
     */
    function startArbitrage(
        address asset,
        uint256 amount,
        bytes calldata params
    ) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        
        address[] memory assets = new address[](1);
        assets[0] = asset;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;
        
        uint256[] memory interestRateModes = new uint256[](1);
        interestRateModes[0] = 0; // No debt
        
        LENDING_POOL.flashLoan(
            address(this),
            assets,
            amounts,
            interestRateModes,
            address(this),
            params,
            0
        );
    }

    /**
     * @dev Executes the arbitrage logic after receiving flash loan
     * @param assets The assets being borrowed
     * @param amounts The amounts being borrowed
     * @param premiums The flash loan fees
     * @param initiator The address that initiated the flash loan
     * @param params Encoded arbitrage parameters
     */
    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external override onlyLendingPool returns (bool) {
        require(initiator == address(this), "Invalid initiator");
        
        // Decode arbitrage parameters
        ArbitrageParams memory arbitrageParams = abi.decode(params, (ArbitrageParams));
        
        // Execute arbitrage
        uint256 profit = _executeArbitrage(
            assets[0],
            amounts[0],
            arbitrageParams
        );
        
        // Calculate total amount to repay (borrowed amount + fee)
        uint256 totalDebt = amounts[0] + premiums[0];
        require(profit > totalDebt, "Arbitrage not profitable");
        
        // Calculate and transfer fee to fee collector
        uint256 netProfit = profit - totalDebt;
        uint256 feeAmount = (netProfit * FEE_BPS) / 10000;
        if (feeAmount > 0) {
            IERC20(assets[0]).safeTransfer(FEE_COLLECTOR, feeAmount);
        }
        
        // Approve lending pool to pull the debt amount
        IERC20(assets[0]).safeApprove(address(LENDING_POOL), totalDebt);
        
        emit ArbitrageExecuted(
            arbitrageParams.tokenIn,
            arbitrageParams.tokenOut,
            amounts[0],
            profit - totalDebt,
            arbitrageParams.buyDex,
            arbitrageParams.sellDex
        );
        
        return true;
    }

    /**
     * @dev Internal function to execute the arbitrage logic
     */
    function _executeArbitrage(
        address asset,
        uint256 amount,
        ArbitrageParams memory params
    ) internal returns (uint256) {
        uint256 initialBalance = IERC20(asset).balanceOf(address(this));
        
        // Step 1: Convert borrowed asset to tokenOut on buy DEX
        uint256 tokenOutAmount = _swapOnDex(
            asset,
            params.tokenOut,
            amount,
            params.buyDex
        );
        
        require(tokenOutAmount > 0, "Buy swap failed");
        
        // Step 2: Convert tokenOut back to asset on sell DEX
        uint256 finalAmount = _swapOnDex(
            params.tokenOut,
            asset,
            tokenOutAmount,
            params.sellDex
        );
        
        require(finalAmount > 0, "Sell swap failed");
        
        uint256 currentBalance = IERC20(asset).balanceOf(address(this));
        require(currentBalance >= initialBalance, "Arbitrage resulted in loss");
        
        return currentBalance;
    }

    /**
     * @dev Executes swap on specified DEX
     */
    function _swapOnDex(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        string memory dexName
    ) internal returns (uint256) {
        require(amountIn > 0, "Amount must be greater than 0");
        
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        uint256 deadline = block.timestamp + 300; // 5 minutes
        
        if (keccak256(bytes(dexName)) == keccak256(bytes("UniswapV2"))) {
            return _swapOnUniswap(tokenIn, amountIn, path, deadline);
        } else if (keccak256(bytes(dexName)) == keccak256(bytes("SushiSwap"))) {
            return _swapOnSushiSwap(tokenIn, amountIn, path, deadline);
        } else {
            revert("Unsupported DEX");
        }
    }

    /**
     * @dev Execute swap on Uniswap V2
     */
    function _swapOnUniswap(
        address tokenIn,
        uint256 amountIn,
        address[] memory path,
        uint256 deadline
    ) internal returns (uint256) {
        IUniswapV2Router router = IUniswapV2Router(UNISWAP_V2_ROUTER);
        
        IERC20(tokenIn).safeApprove(UNISWAP_V2_ROUTER, amountIn);
        
        uint256[] memory amountsOut = router.getAmountsOut(amountIn, path);
        uint256 amountOutMin = amountsOut[1] * 995 / 1000; // 0.5% slippage tolerance
        
        uint256[] memory amounts = router.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            address(this),
            deadline
        );
        
        return amounts[1];
    }

    /**
     * @dev Execute swap on SushiSwap
     */
    function _swapOnSushiSwap(
        address tokenIn,
        uint256 amountIn,
        address[] memory path,
        uint256 deadline
    ) internal returns (uint256) {
        ISushiSwapRouter router = ISushiSwapRouter(SUSHISWAP_ROUTER);
        
        IERC20(tokenIn).safeApprove(SUSHISWAP_ROUTER, amountIn);
        
        uint256[] memory amountsOut = router.getAmountsOut(amountIn, path);
        uint256 amountOutMin = amountsOut[1] * 995 / 1000; // 0.5% slippage tolerance
        
        uint256[] memory amounts = router.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            address(this),
            deadline
        );
        
        return amounts[1];
    }

    /**
     * @dev Withdraw profits (only owner)
     */
    function withdrawProfit(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance to withdraw");
        
        IERC20(token).safeTransfer(owner(), balance);
        emit ProfitWithdrawn(token, balance, owner());
    }

    /**
     * @dev Emergency withdraw (only owner)
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }

    /**
     * @dev Get contract balance for a token
     */
    function getBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    /**
     * @dev Estimate arbitrage profit (view function for simulation)
     */
    function estimateArbitrageProfit(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        string calldata buyDex,
        string calldata sellDex
    ) external view returns (uint256 estimatedProfit, uint256 flashLoanFee) {
        // Get amount out from buy DEX
        address[] memory pathBuy = new address[](2);
        pathBuy[0] = tokenIn;
        pathBuy[1] = tokenOut;
        
        uint256 amountOut1;
        if (keccak256(bytes(buyDex)) == keccak256(bytes("UniswapV2"))) {
            uint256[] memory amounts = IUniswapV2Router(UNISWAP_V2_ROUTER).getAmountsOut(amountIn, pathBuy);
            amountOut1 = amounts[1];
        } else if (keccak256(bytes(buyDex)) == keccak256(bytes("SushiSwap"))) {
            uint256[] memory amounts = ISushiSwapRouter(SUSHISWAP_ROUTER).getAmountsOut(amountIn, pathBuy);
            amountOut1 = amounts[1];
        }
        
        // Get amount out from sell DEX
        address[] memory pathSell = new address[](2);
        pathSell[0] = tokenOut;
        pathSell[1] = tokenIn;
        
        uint256 amountOut2;
        if (keccak256(bytes(sellDex)) == keccak256(bytes("UniswapV2"))) {
            uint256[] memory amounts = IUniswapV2Router(UNISWAP_V2_ROUTER).getAmountsOut(amountOut1, pathSell);
            amountOut2 = amounts[1];
        } else if (keccak256(bytes(sellDex)) == keccak256(bytes("SushiSwap"))) {
            uint256[] memory amounts = ISushiSwapRouter(SUSHISWAP_ROUTER).getAmountsOut(amountOut1, pathSell);
            amountOut2 = amounts[1];
        }
        
        // Calculate profit and flash loan fee
        flashLoanFee = amountIn * 5 / 10000; // 0.05% Aave flash loan fee
        
        if (amountOut2 > amountIn + flashLoanFee) {
            estimatedProfit = amountOut2 - amountIn - flashLoanFee;
        } else {
            estimatedProfit = 0;
        }
    }
}
