// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IFlashLoanReceiver {
    /**
     * @dev Executes an operation after receiving the flash-borrowed asset (for flashLoanSimple)
     * @param asset The address of the flash-borrowed asset
     * @param amount The amount of the flash-borrowed asset
     * @param premium The fee of the flash-borrowed asset
     * @param initiator The address of the flashloan initiator
     * @param params The byte-encoded params passed when initiating the flashloan
     * @return True if the execution of the operation succeeds, false otherwise
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}