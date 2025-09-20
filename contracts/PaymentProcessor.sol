// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title PaymentProcessor
 * @dev Secure payment processing contract with automatic revenue distribution
 */
contract PaymentProcessor is Ownable, ReentrancyGuard, Pausable {
    // Structs
    struct PaymentRecord {
        uint256 eventId;
        address payer;
        address organizer;
        uint256 amount;
        uint256 platformFee;
        uint256 organizerShare;
        uint256 timestamp;
        bool processed;
    }

    struct OrganizerBalance {
        uint256 totalEarned;
        uint256 availableBalance;
        uint256 withdrawnAmount;
        uint256 lastWithdrawal;
    }

    // State variables
    mapping(uint256 => PaymentRecord) public paymentRecords;
    mapping(address => OrganizerBalance) public organizerBalances;
    mapping(uint256 => uint256[]) public eventPayments;

    uint256 public paymentCount;
    uint256 public platformFeePercentage = 5; // 5% platform fee
    uint256 public constant MAX_PLATFORM_FEE = 20; // Maximum 20% platform fee

    address public eventContract; // Address of the EventContract
    address public ticketContract; // Address of the TicketNFT contract

    // Events
    event PaymentProcessed(
        uint256 indexed paymentId,
        uint256 indexed eventId,
        address indexed payer,
        uint256 amount,
        uint256 platformFee,
        uint256 organizerShare
    );

    event WithdrawalMade(
        address indexed organizer,
        uint256 amount,
        uint256 timestamp
    );

    event PlatformFeeUpdated(
        uint256 oldFee,
        uint256 newFee,
        uint256 timestamp
    );

    event EmergencyWithdrawal(
        address indexed to,
        uint256 amount,
        uint256 timestamp
    );

    // Modifiers
    modifier onlyEventContract() {
        require(msg.sender == eventContract, "Only EventContract can call this function");
        _;
    }

    modifier validAmount(uint256 amount) {
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= 100 ether, "Amount cannot exceed 100 ETH");
        _;
    }

    modifier hasAvailableBalance(address organizer, uint256 amount) {
        require(organizerBalances[organizer].availableBalance >= amount, "Insufficient available balance");
        _;
    }

    constructor(address _eventContract, address _ticketContract) {
        require(_eventContract != address(0), "Invalid event contract address");
        require(_ticketContract != address(0), "Invalid ticket contract address");

        eventContract = _eventContract;
        ticketContract = _ticketContract;
    }

    /**
     * @dev Process payment for event registration
     * @param eventId The ID of the event
     * @param payer The address making the payment
     * @param organizer The event organizer's address
     * @param amount The total payment amount
     */
    function processPayment(
        uint256 eventId,
        address payer,
        address organizer,
        uint256 amount
    ) external payable onlyEventContract validAmount(amount) whenNotPaused nonReentrant {
        require(msg.value == amount, "Incorrect payment amount");
        require(payer != address(0), "Invalid payer address");
        require(organizer != address(0), "Invalid organizer address");

        // Calculate fees
        uint256 platformFee = (amount * platformFeePercentage) / 100;
        uint256 organizerShare = amount - platformFee;

        // Create payment record
        paymentCount++;
        uint256 paymentId = paymentCount;

        paymentRecords[paymentId] = PaymentRecord({
            eventId: eventId,
            payer: payer,
            organizer: organizer,
            amount: amount,
            platformFee: platformFee,
            organizerShare: organizerShare,
            timestamp: block.timestamp,
            processed: true
        });

        // Update organizer balance
        organizerBalances[organizer].totalEarned += organizerShare;
        organizerBalances[organizer].availableBalance += organizerShare;

        // Track payment for event
        eventPayments[eventId].push(paymentId);

        emit PaymentProcessed(paymentId, eventId, payer, amount, platformFee, organizerShare);
    }

    /**
     * @dev Process payment for event registration (only for testing - owner can call)
     * @param eventId The ID of the event
     * @param payer The address making the payment
     * @param organizer The event organizer's address
     * @param amount The total payment amount
     */
    function testProcessPayment(
        uint256 eventId,
        address payer,
        address organizer,
        uint256 amount
    ) external payable onlyOwner validAmount(amount) whenNotPaused nonReentrant {
        require(msg.value == amount, "Incorrect payment amount");
        require(payer != address(0), "Invalid payer address");
        require(organizer != address(0), "Invalid organizer address");

        // Calculate fees
        uint256 platformFee = (amount * platformFeePercentage) / 100;
        uint256 organizerShare = amount - platformFee;

        // Create payment record
        paymentCount++;
        uint256 paymentId = paymentCount;

        paymentRecords[paymentId] = PaymentRecord({
            eventId: eventId,
            payer: payer,
            organizer: organizer,
            amount: amount,
            platformFee: platformFee,
            organizerShare: organizerShare,
            timestamp: block.timestamp,
            processed: true
        });

        // Update organizer balance
        organizerBalances[organizer].totalEarned += organizerShare;
        organizerBalances[organizer].availableBalance += organizerShare;

        // Track payment for event
        eventPayments[eventId].push(paymentId);

        emit PaymentProcessed(paymentId, eventId, payer, amount, platformFee, organizerShare);
    }

    /**
     * @dev Withdraw available balance for organizer
     * @param amount The amount to withdraw
     */
    function withdrawOrganizerFunds(uint256 amount)
        external
        nonReentrant
        whenNotPaused
        hasAvailableBalance(msg.sender, amount)
    {
        require(amount >= 0.01 ether, "Minimum withdrawal amount is 0.01 ETH");

        // Update organizer balance
        organizerBalances[msg.sender].availableBalance -= amount;
        organizerBalances[msg.sender].withdrawnAmount += amount;
        organizerBalances[msg.sender].lastWithdrawal = block.timestamp;

        // Transfer funds
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdrawal failed");

        emit WithdrawalMade(msg.sender, amount, block.timestamp);
    }

    /**
     * @dev Withdraw platform fees (only owner)
     */
    function withdrawPlatformFees() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;

        require(balance > 0, "No platform fees to withdraw");

        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Platform fee withdrawal failed");

        emit EmergencyWithdrawal(owner(), balance, block.timestamp);
    }

    /**
     * @dev Update platform fee percentage (only owner)
     * @param newFeePercentage The new platform fee percentage (0-20)
     */
    function updatePlatformFee(uint256 newFeePercentage) external onlyOwner {
        require(newFeePercentage <= MAX_PLATFORM_FEE, "Platform fee cannot exceed maximum");
        require(newFeePercentage >= 0, "Platform fee cannot be negative");

        uint256 oldFee = platformFeePercentage;
        platformFeePercentage = newFeePercentage;

        emit PlatformFeeUpdated(oldFee, newFeePercentage, block.timestamp);
    }

    /**
     * @dev Get payment record details
     * @param paymentId The ID of the payment record
     */
    function getPaymentRecord(uint256 paymentId) external view returns (
        uint256 eventId,
        address payer,
        address organizer,
        uint256 amount,
        uint256 platformFee,
        uint256 organizerShare,
        uint256 timestamp,
        bool processed
    ) {
        require(paymentId > 0 && paymentId <= paymentCount, "Invalid payment ID");

        PaymentRecord memory record = paymentRecords[paymentId];
        return (
            record.eventId,
            record.payer,
            record.organizer,
            record.amount,
            record.platformFee,
            record.organizerShare,
            record.timestamp,
            record.processed
        );
    }

    /**
     * @dev Get organizer balance information
     * @param organizer The organizer's address
     */
    function getOrganizerBalance(address organizer) external view returns (
        uint256 totalEarned,
        uint256 availableBalance,
        uint256 withdrawnAmount,
        uint256 lastWithdrawal
    ) {
        OrganizerBalance memory balance = organizerBalances[organizer];
        return (
            balance.totalEarned,
            balance.availableBalance,
            balance.withdrawnAmount,
            balance.lastWithdrawal
        );
    }

    /**
     * @dev Get all payments for an event
     * @param eventId The ID of the event
     */
    function getEventPayments(uint256 eventId) external view returns (uint256[] memory) {
        return eventPayments[eventId];
    }

    /**
     * @dev Get payments by organizer
     * @param organizer The organizer's address
     * @param limit Maximum number of payments to return
     */
    function getPaymentsByOrganizer(address organizer, uint256 limit) external view returns (uint256[] memory) {
        uint256[] memory organizerPayments = new uint256[](paymentCount);
        uint256 count = 0;

        for (uint256 i = 1; i <= paymentCount && count < limit; i++) {
            if (paymentRecords[i].organizer == organizer) {
                organizerPayments[count] = i;
                count++;
            }
        }

        // Resize array to actual count
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = organizerPayments[i];
        }

        return result;
    }

    /**
     * @dev Get payments by payer
     * @param payer The payer's address
     * @param limit Maximum number of payments to return
     */
    function getPaymentsByPayer(address payer, uint256 limit) external view returns (uint256[] memory) {
        uint256[] memory payerPayments = new uint256[](paymentCount);
        uint256 count = 0;

        for (uint256 i = 1; i <= paymentCount && count < limit; i++) {
            if (paymentRecords[i].payer == payer) {
                payerPayments[count] = i;
                count++;
            }
        }

        // Resize array to actual count
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = payerPayments[i];
        }

        return result;
    }

    /**
     * @dev Get contract statistics
     */
    function getContractStats() external view returns (
        uint256 totalPayments,
        uint256 totalVolume,
        uint256 totalPlatformFees,
        uint256 contractBalance
    ) {
        uint256 totalVol = 0;
        uint256 totalFees = 0;

        for (uint256 i = 1; i <= paymentCount; i++) {
            totalVol += paymentRecords[i].amount;
            totalFees += paymentRecords[i].platformFee;
        }

        return (
            paymentCount,
            totalVol,
            totalFees,
            address(this).balance
        );
    }

    /**
     * @dev Emergency pause (only owner)
     */
    function emergencyPause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Emergency unpause (only owner)
     */
    function emergencyUnpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Update contract addresses (only owner)
     * @param _eventContract New event contract address
     * @param _ticketContract New ticket contract address
     */
    function updateContractAddresses(address _eventContract, address _ticketContract) external onlyOwner {
        require(_eventContract != address(0), "Invalid event contract address");
        require(_ticketContract != address(0), "Invalid ticket contract address");

        eventContract = _eventContract;
        ticketContract = _ticketContract;
    }

    /**
     * @dev Fallback function to receive Ether
     */
    receive() external payable {}

    /**
     * @dev Fallback function for calls with data
     */
    fallback() external payable {}
}