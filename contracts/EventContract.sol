// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title ITicketNFT
 * @dev Interface for TicketNFT contract
 */
interface ITicketNFT {
    function mintTicketForEvent(
        address to,
        uint256 eventId,
        address purchaser
    ) external returns (uint256);
}

/**
 * @title EventContract
 * @dev Core smart contract for event creation and management with PaymentProcessor integration
 */
contract EventContract is Ownable, ReentrancyGuard {
    struct Event {
        uint256 id;
        string title;
        string description;
        uint256 startDate;
        uint256 endDate;
        uint256 ticketPrice;
        uint256 capacity;
        uint256 registeredCount;
        address organizer;
        bool isActive;
        string location;
        string[] categories;
    }

    // State variables
    mapping(uint256 => Event) public events;
    mapping(uint256 => mapping(address => bool)) public eventRegistrations;
    uint256 public eventCount;
    uint256 public platformFee = 5; // 5% platform fee

    // PaymentProcessor integration
    address public paymentProcessor;
    address public ticketNFT;

    // Events
    event EventCreated(uint256 indexed eventId, address indexed organizer, string title);
    event EventUpdated(uint256 indexed eventId, string title);
    event EventCancelled(uint256 indexed eventId);
    event UserRegistered(uint256 indexed eventId, address indexed user);
    event UserUnregistered(uint256 indexed eventId, address indexed user);
    event PaymentProcessorUpdated(address indexed oldProcessor, address indexed newProcessor);

    // Modifiers
    modifier eventExists(uint256 _eventId) {
        require(events[_eventId].id != 0, "Event does not exist");
        _;
    }

    modifier onlyEventOrganizer(uint256 _eventId) {
        require(events[_eventId].organizer == msg.sender, "Only event organizer can perform this action");
        _;
    }

    modifier eventIsActive(uint256 _eventId) {
        require(events[_eventId].isActive, "Event is not active");
        _;
    }

    /**
     * @dev Create a new event
     */
    function createEvent(
        string memory _title,
        string memory _description,
        uint256 _startDate,
        uint256 _endDate,
        uint256 _ticketPrice,
        uint256 _capacity,
        string memory _location,
        string[] memory _categories
    ) external returns (uint256) {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(_startDate > block.timestamp, "Start date must be in the future");
        require(_endDate > _startDate, "End date must be after start date");
        require(_capacity > 0, "Capacity must be greater than 0");

        eventCount++;
        uint256 eventId = eventCount;

        events[eventId] = Event({
            id: eventId,
            title: _title,
            description: _description,
            startDate: _startDate,
            endDate: _endDate,
            ticketPrice: _ticketPrice,
            capacity: _capacity,
            registeredCount: 0,
            organizer: msg.sender,
            isActive: true,
            location: _location,
            categories: _categories
        });

        emit EventCreated(eventId, msg.sender, _title);
        return eventId;
    }

    /**
     * @dev Update an existing event
     */
    function updateEvent(
        uint256 _eventId,
        string memory _title,
        string memory _description,
        uint256 _startDate,
        uint256 _endDate,
        uint256 _ticketPrice,
        uint256 _capacity,
        string memory _location,
        string[] memory _categories
    ) external eventExists(_eventId) onlyEventOrganizer(_eventId) {
        require(events[_eventId].isActive, "Cannot update cancelled event");
        require(_startDate > block.timestamp, "Start date must be in the future");
        require(_endDate > _startDate, "End date must be after start date");
        require(_capacity >= events[_eventId].registeredCount, "New capacity cannot be less than current registrations");

        Event storage eventToUpdate = events[_eventId];
        eventToUpdate.title = _title;
        eventToUpdate.description = _description;
        eventToUpdate.startDate = _startDate;
        eventToUpdate.endDate = _endDate;
        eventToUpdate.ticketPrice = _ticketPrice;
        eventToUpdate.capacity = _capacity;
        eventToUpdate.location = _location;
        eventToUpdate.categories = _categories;

        emit EventUpdated(_eventId, _title);
    }

    /**
     * @dev Get event details
     */
    function getEvent(uint256 _eventId) external view eventExists(_eventId) returns (
        uint256 id,
        string memory title,
        string memory description,
        uint256 startDate,
        uint256 endDate,
        uint256 ticketPrice,
        uint256 capacity,
        uint256 registeredCount,
        address organizer,
        bool isActive,
        string memory location,
        string[] memory categories
    ) {
        Event memory eventData = events[_eventId];
        return (
            eventData.id,
            eventData.title,
            eventData.description,
            eventData.startDate,
            eventData.endDate,
            eventData.ticketPrice,
            eventData.capacity,
            eventData.registeredCount,
            eventData.organizer,
            eventData.isActive,
            eventData.location,
            eventData.categories
        );
    }

    /**
     * @dev Cancel an event
     */
    function cancelEvent(uint256 _eventId) external eventExists(_eventId) onlyEventOrganizer(_eventId) {
        require(events[_eventId].isActive, "Event is already cancelled");

        events[_eventId].isActive = false;
        emit EventCancelled(_eventId);
    }

    /**
     * @dev Set PaymentProcessor contract address (only owner)
     * @param _paymentProcessor Address of the PaymentProcessor contract
     */
    function setPaymentProcessor(address _paymentProcessor) external onlyOwner {
        require(_paymentProcessor != address(0), "Invalid payment processor address");
        address oldProcessor = paymentProcessor;
        paymentProcessor = _paymentProcessor;
        emit PaymentProcessorUpdated(oldProcessor, _paymentProcessor);
    }

    /**
     * @dev Set TicketNFT contract address (only owner)
     * @param _ticketNFT Address of the TicketNFT contract
     */
    function setTicketNFT(address _ticketNFT) external onlyOwner {
        require(_ticketNFT != address(0), "Invalid ticket NFT address");
        ticketNFT = _ticketNFT;
    }

    /**
     * @dev Register for an event with payment through PaymentProcessor
     */
    function registerForEvent(uint256 _eventId) external payable eventExists(_eventId) eventIsActive(_eventId) nonReentrant {
        Event storage eventData = events[_eventId];

        require(!eventRegistrations[_eventId][msg.sender], "Already registered for this event");
        require(eventData.registeredCount < eventData.capacity, "Event is at full capacity");
        require(msg.value >= eventData.ticketPrice, "Insufficient payment");
        require(paymentProcessor != address(0), "PaymentProcessor not set");

        eventRegistrations[_eventId][msg.sender] = true;
        eventData.registeredCount++;

        // Process payment through PaymentProcessor
        (bool success,) = paymentProcessor.call{value: msg.value}(
            abi.encodeWithSignature(
                "processPayment(uint256,address,address,uint256)",
                _eventId,
                msg.sender,
                eventData.organizer,
                msg.value
            )
        );
        require(success, "Payment processing failed");

        // Mint NFT ticket if TicketNFT contract is set
        if (ticketNFT != address(0)) {
            // Mint the ticket NFT
            ITicketNFT(ticketNFT).mintTicketForEvent(
                msg.sender,
                _eventId,
                msg.sender
            );
        }

        emit UserRegistered(_eventId, msg.sender);
    }

    /**
     * @dev Unregister from an event
     */
    function unregisterFromEvent(uint256 _eventId) external eventExists(_eventId) {
        require(eventRegistrations[_eventId][msg.sender], "Not registered for this event");

        Event storage eventData = events[_eventId];
        eventRegistrations[_eventId][msg.sender] = false;
        eventData.registeredCount--;

        emit UserUnregistered(_eventId, msg.sender);
    }

    /**
     * @dev Check if user is registered for event
     */
    function isUserRegistered(uint256 _eventId, address _user) external view returns (bool) {
        return eventRegistrations[_eventId][_user];
    }

    /**
     * @dev Get events by organizer
     */
    function getEventsByOrganizer(address _organizer) external view returns (uint256[] memory) {
        uint256[] memory organizerEvents = new uint256[](eventCount);
        uint256 count = 0;

        for (uint256 i = 1; i <= eventCount; i++) {
            if (events[i].organizer == _organizer) {
                organizerEvents[count] = i;
                count++;
            }
        }

        // Resize array to actual count
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = organizerEvents[i];
        }

        return result;
    }

    /**
     * @dev Get all active events
     */
    function getActiveEvents() external view returns (uint256[] memory) {
        uint256[] memory activeEvents = new uint256[](eventCount);
        uint256 count = 0;

        for (uint256 i = 1; i <= eventCount; i++) {
            if (events[i].isActive) {
                activeEvents[count] = i;
                count++;
            }
        }

        // Resize array to actual count
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = activeEvents[i];
        }

        return result;
    }

    /**
     * @dev Update platform fee (only owner)
     */
    function updatePlatformFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 20, "Platform fee cannot exceed 20%");
        platformFee = _newFee;
    }

    /**
     * @dev Withdraw accumulated platform fees
     */
    function withdrawPlatformFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        payable(owner()).transfer(balance);
    }

    /**
     * @dev Get contract balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}