// SPDX-License-Identifier: MIT

pragma solidity 0.8.20;

import {IBaseToken} from "./interfaces/IBaseToken.sol";
import {ISystemContract} from "./interfaces/ISystemContract.sol";
import {MSG_VALUE_SYSTEM_CONTRACT, DEPLOYER_SYSTEM_CONTRACT, BOOTLOADER_FORMAL_ADDRESS, L1_MESSENGER_CONTRACT} from "./Constants.sol";
import {IMailbox} from "./interfaces/IMailbox.sol";

/**
 * @author Matter Labs
 * @custom:security-contact security@matterlabs.dev
 * @notice Native BTC contract.
 * @dev It does NOT provide interfaces for personal interaction with tokens like `transfer`, `approve`, and `transferFrom`.
 * Instead, this contract is used by the bootloader and `MsgValueSimulator`/`ContractDeployer` system contracts
 * to perform the balance changes while simulating the `msg.value` Ethereum behavior.
 */
contract L2BaseToken is IBaseToken, ISystemContract {
    /// @notice The balances of the users.
    mapping(address account => uint256 balance) internal balance;

    /// @notice The total amount of tokens that have been minted.
    uint256 public override totalSupply;

    /// @notice Transfer tokens from one address to another.
    /// @param _from The address to transfer the BTC from.
    /// @param _to The address to transfer the BTC to.
    /// @param _amount The amount of BTC in wei being transferred.
    /// @dev This function can be called only by trusted system contracts.
    /// @dev This function also emits "Transfer" event, which might be removed
    /// later on.
    function transferFromTo(address _from, address _to, uint256 _amount) external override {
        require(
            msg.sender == MSG_VALUE_SYSTEM_CONTRACT ||
                msg.sender == address(DEPLOYER_SYSTEM_CONTRACT) ||
                msg.sender == BOOTLOADER_FORMAL_ADDRESS,
            "Only system contracts with special access can call this method"
        );

        uint256 fromBalance = balance[_from];
        require(fromBalance >= _amount, "Transfer amount exceeds balance");
        unchecked {
            balance[_from] = fromBalance - _amount;
            // Overflow not possible: the sum of all balances is capped by totalSupply, and the sum is preserved by
            // decrementing then incrementing.
            balance[_to] += _amount;
        }

        emit Transfer(_from, _to, _amount);
    }

    /// @notice Returns BTC balance of an account
    /// @dev It takes `uint256` as an argument to be able to properly simulate the behaviour of the
    /// Ethereum's `BALANCE` opcode that accepts uint256 as an argument and truncates any upper bits
    /// @param _account The address of the account to return the balance of.
    function balanceOf(uint256 _account) external view override returns (uint256) {
        return balance[address(uint160(_account))];
    }

    /// @notice Increase the total supply of tokens and balance of the receiver.
    /// @dev This method is only callable by the bootloader.
    /// @param _account The address which to mint the funds to.
    /// @param _amount The amount of BTC in wei to be minted.
    function mint(address _account, uint256 _amount) external override onlyCallFromBootloader {
        totalSupply += _amount;
        balance[_account] += _amount;
        emit Mint(_account, _amount);
    }

    /// @notice Initiate the withdrawal of the base token, funds will be available to claim on L1 `finalizeEthWithdrawal` method.
    /// @param _l1Receiver The address on L1 to receive the funds.
    function withdraw(bytes calldata _l1Receiver) external payable override {
        // Scaled down the amount to L1 BTC with 8 decimals.
        uint256 l1Amount = msg.value / 10_000_000_000;
        require(l1Amount > 0, "Minimum withdrawal amount not met");

        uint256 amount = _burnMsgValue();

        // Send the L2 log, a user could use it as proof of the withdrawal
        bytes memory message = _getL1WithdrawMessage(_l1Receiver, l1Amount);
        L1_MESSENGER_CONTRACT.sendToL1(message);

        emit Withdrawal(msg.sender, _l1Receiver, amount);
    }

    /// @dev The function burn the sent `msg.value`.
    /// NOTE: Since this contract holds the mapping of all ether balances of the system,
    /// the sent `msg.value` is added to the `this` balance before the call.
    /// So the balance of `address(this)` is always bigger or equal to the `msg.value`!
    function _burnMsgValue() internal returns (uint256 amount) {
        amount = msg.value;

        // Silent burning of the ether
        unchecked {
            // This is safe, since this contract holds the ether balances, and if user
            // sends a `msg.value` it will be added to the contract (`this`) balance.
            balance[address(this)] -= amount;
            totalSupply -= amount;
        }
    }

    /// @dev Get the message to be sent to L1 to initiate a withdrawal.
    function _getL1WithdrawMessage(bytes calldata _to, uint256 _amount) internal pure returns (bytes memory) {
        return abi.encodePacked(IMailbox.finalizeEthWithdrawal.selector, _to, _amount);
    }

    /// @dev Get the message to be sent to L1 to initiate a withdrawal.
    function _getExtendedWithdrawMessage(
        address _to,
        uint256 _amount,
        address _sender,
        bytes memory _additionalData
    ) internal pure returns (bytes memory) {
        // solhint-disable-next-line func-named-parameters
        return abi.encodePacked(IMailbox.finalizeEthWithdrawal.selector, _to, _amount, _sender, _additionalData);
    }

    /// @dev This method has not been stabilized and might be
    /// removed later on.
    function name() external pure override returns (string memory) {
        return "Bitcoin";
    }

    /// @dev This method has not been stabilized and might be
    /// removed later on.
    function symbol() external pure override returns (string memory) {
        return "BTC";
    }

    /// @dev This method has not been stabilized and might be
    /// removed later on.
    function decimals() external pure override returns (uint8) {
        return 18;
    }
}
