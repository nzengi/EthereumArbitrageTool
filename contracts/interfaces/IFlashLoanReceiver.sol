// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IFlashLoanReceiver
 * @dev Interface for Aave flash loan receiver
 */
interface IFlashLoanReceiver {
    /**
     * @dev Executes an operation after receiving the flash-borrowed assets
     * @param assets The addresses of the flash-borrowed assets
     * @param amounts The amounts of the flash-borrowed assets
     * @param premiums The fee of each flash-borrowed asset
     * @param initiator The address of the flash loan initiator
     * @param params The byte-encoded params passed when initiating the flash loan
     * @return True if the execution of the operation succeeds, false otherwise
     */
    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}
