// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title IEventContract
 * @dev Interface for EventContract to enable cross-contract calls
 */
interface IEventContract {
    function getEvent(uint256 _eventId) external view returns (
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
    );
}

/**
 * @title TicketNFT
 * @dev ERC-721 compliant NFT contract for event tickets
 */
contract TicketNFT is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    struct TicketMetadata {
        uint256 eventId;
        address eventContract;
        address purchaser;
        uint256 purchaseDate;
        bool isUsed;
        bool isActive;
        string seatInfo;
        string ticketType;
    }

    // Mapping from token ID to ticket metadata
    mapping(uint256 => TicketMetadata) public ticketMetadata;

    // Mapping from event ID to token IDs for that event
    mapping(uint256 => uint256[]) public eventTickets;

    // Mapping to track used tickets
    mapping(uint256 => bool) public usedTickets;

    // Integration contracts
    address public eventContract;
    address public paymentProcessor;

    // Events
    event TicketMinted(uint256 indexed tokenId, uint256 indexed eventId, address indexed purchaser);
    event TicketUsed(uint256 indexed tokenId, address indexed user);
    event TicketTransferred(uint256 indexed tokenId, address indexed from, address indexed to);
    event TicketCancelled(uint256 indexed tokenId);
    event EventContractUpdated(address indexed oldContract, address indexed newContract);
    event PaymentProcessorUpdated(address indexed oldProcessor, address indexed newProcessor);

    // Modifiers
    modifier onlyTicketOwner(uint256 tokenId) {
        require(ownerOf(tokenId) == msg.sender, "Not ticket owner");
        _;
    }

    modifier ticketNotUsed(uint256 tokenId) {
        require(!ticketMetadata[tokenId].isUsed, "Ticket already used");
        _;
    }

    modifier ticketActive(uint256 tokenId) {
        require(ticketMetadata[tokenId].isActive, "Ticket is not active");
        _;
    }

    modifier onlyEventContract() {
        require(msg.sender == eventContract, "Only EventContract can call this function");
        _;
    }

    constructor() ERC721("EventTicket", "ETKT") {}

    /**
     * @dev Set the EventContract address
     * @param _eventContract The address of the EventContract
     */
    function setEventContract(address _eventContract) external onlyOwner {
        require(_eventContract != address(0), "Invalid event contract address");
        address oldContract = eventContract;
        eventContract = _eventContract;
        emit EventContractUpdated(oldContract, _eventContract);
    }

    /**
     * @dev Set the PaymentProcessor address
     * @param _paymentProcessor The address of the PaymentProcessor
     */
    function setPaymentProcessor(address _paymentProcessor) external onlyOwner {
        require(_paymentProcessor != address(0), "Invalid payment processor address");
        address oldProcessor = paymentProcessor;
        paymentProcessor = _paymentProcessor;
        emit PaymentProcessorUpdated(oldProcessor, _paymentProcessor);
    }

    /**
     * @dev Validate if an event exists and is active
     * @param eventId The ID of the event to validate
     * @return True if the event is valid and active
     */
    function _validateEvent(uint256 eventId) private view returns (bool) {
        if (eventContract == address(0)) return false;
        
        try IEventContract(eventContract).getEvent(eventId) returns (
            uint256 id,
            string memory,
            string memory,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            address,
            bool isActive,
            string memory,
            string[] memory
        ) {
            return id == eventId && isActive;
        } catch {
            return false;
        }
    }

    /**
     * @dev Mint a new ticket NFT
     * @param to The address that will own the ticket
     * @param eventId The ID of the event
     * @param eventContractAddr The address of the event contract
     * @param seatInfo Seat information (optional)
     * @param ticketType Type of ticket (VIP, General, etc.)
     * @param metadataURI URI for the ticket metadata
     */
    function mintTicket(
        address to,
        uint256 eventId,
        address eventContractAddr,
        string memory seatInfo,
        string memory ticketType,
        string memory metadataURI
    ) external onlyOwner returns (uint256) {
        require(eventContract != address(0), "EventContract not set");
        require(eventContractAddr == eventContract, "Invalid event contract address");
        require(_validateEvent(eventId), "Invalid or inactive event");

        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataURI);

        ticketMetadata[tokenId] = TicketMetadata({
            eventId: eventId,
            eventContract: eventContractAddr,
            purchaser: to,
            purchaseDate: block.timestamp,
            isUsed: false,
            isActive: true,
            seatInfo: seatInfo,
            ticketType: ticketType
        });

        eventTickets[eventId].push(tokenId);

        emit TicketMinted(tokenId, eventId, to);
        return tokenId;
    }

    /**
     * @dev Mint multiple tickets at once (for bulk operations)
     */
    function mintBatchTickets(
        address[] memory recipients,
        uint256 eventId,
        address eventContractAddr,
        string[] memory seatInfos,
        string memory ticketType,
        string memory baseMetadataURI
    ) external onlyOwner returns (uint256[] memory) {
        require(recipients.length == seatInfos.length, "Recipients and seat infos length mismatch");
        require(eventContract != address(0), "EventContract not set");
        require(eventContractAddr == eventContract, "Invalid event contract address");
        require(_validateEvent(eventId), "Invalid or inactive event");

        uint256[] memory tokenIds = new uint256[](recipients.length);

        for (uint256 i = 0; i < recipients.length; i++) {
            _tokenIdCounter.increment();
            uint256 tokenId = _tokenIdCounter.current();

            string memory metadataURI = string(abi.encodePacked(baseMetadataURI, "/", Strings.toString(i + 1)));

            _safeMint(recipients[i], tokenId);
            _setTokenURI(tokenId, metadataURI);

            ticketMetadata[tokenId] = TicketMetadata({
                eventId: eventId,
                eventContract: eventContractAddr,
                purchaser: recipients[i],
                purchaseDate: block.timestamp,
                isUsed: false,
                isActive: true,
                seatInfo: seatInfos[i],
                ticketType: ticketType
            });

            eventTickets[eventId].push(tokenId);

            emit TicketMinted(tokenId, eventId, recipients[i]);
            tokenIds[i] = tokenId;
        }

        return tokenIds;
    }

    /**
     * @dev Mint a ticket NFT for event registration (called by EventContract)
     * @param to The address that will own the ticket
     * @param eventId The ID of the event
     * @param purchaser The address that purchased the ticket
     */
    function mintTicketForEvent(
        address to,
        uint256 eventId,
        address purchaser
    ) external onlyEventContract returns (uint256) {
        require(_validateEvent(eventId), "Invalid or inactive event");

        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();

        _safeMint(to, tokenId);

        // Generate metadata URI
        string memory metadataURI = string(abi.encodePacked(
            "https://api.eventtickets.com/metadata/",
            Strings.toString(eventId),
            "/",
            Strings.toString(tokenId)
        ));

        // Generate seat info based on token ID
        string memory seatInfo = string(abi.encodePacked("Seat-", Strings.toString(tokenId)));

        ticketMetadata[tokenId] = TicketMetadata({
            eventId: eventId,
            eventContract: eventContract,
            purchaser: purchaser,
            purchaseDate: block.timestamp,
            isUsed: false,
            isActive: true,
            seatInfo: seatInfo,
            ticketType: "Standard"
        });

        eventTickets[eventId].push(tokenId);

        emit TicketMinted(tokenId, eventId, to);
        return tokenId;
    }

    /**
     * @dev Mark a ticket as used (for event check-in)
     * @param tokenId The ID of the ticket to mark as used
     */
    function useTicket(uint256 tokenId)
        external
        onlyTicketOwner(tokenId)
        ticketNotUsed(tokenId)
        ticketActive(tokenId)
    {
        ticketMetadata[tokenId].isUsed = true;
        usedTickets[tokenId] = true;

        emit TicketUsed(tokenId, msg.sender);
    }

    /**
     * @dev Verify if a ticket is valid for an event
     * @param tokenId The ID of the ticket to verify
     * @param eventId The ID of the event to check against
     */
    function verifyTicket(uint256 tokenId, uint256 eventId) external view returns (bool) {
        if (!_exists(tokenId)) return false;

        TicketMetadata memory metadata = ticketMetadata[tokenId];
        return (
            metadata.eventId == eventId &&
            metadata.isActive &&
            !metadata.isUsed &&
            _validateEvent(eventId)
        );
    }

    /**
     * @dev Get ticket metadata
     * @param tokenId The ID of the ticket
     */
    function getTicketMetadata(uint256 tokenId) external view returns (
        uint256 eventId,
        address eventContractAddr,
        address purchaser,
        uint256 purchaseDate,
        bool isUsed,
        bool isActive,
        string memory seatInfo,
        string memory ticketType
    ) {
        require(_exists(tokenId), "Ticket does not exist");

        TicketMetadata memory metadata = ticketMetadata[tokenId];
        return (
            metadata.eventId,
            metadata.eventContract,
            metadata.purchaser,
            metadata.purchaseDate,
            metadata.isUsed,
            metadata.isActive,
            metadata.seatInfo,
            metadata.ticketType
        );
    }

    /**
     * @dev Get all tickets for a specific event
     * @param eventId The ID of the event
     */
    function getEventTickets(uint256 eventId) external view returns (uint256[] memory) {
        return eventTickets[eventId];
    }

    /**
     * @dev Get tickets owned by an address
     * @param owner The address to query
     */
    function getTicketsByOwner(address owner) external view returns (uint256[] memory) {
        uint256 tokenCount = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](tokenCount);

        uint256 totalTokens = _tokenIdCounter.current();
        uint256 found = 0;

        for (uint256 i = 1; i <= totalTokens && found < tokenCount; i++) {
            if (_exists(i) && ownerOf(i) == owner) {
                tokenIds[found] = i;
                found++;
            }
        }

        return tokenIds;
    }

    /**
     * @dev Cancel a ticket (refund scenario)
     * @param tokenId The ID of the ticket to cancel
     */
    function cancelTicket(uint256 tokenId) external onlyOwner {
        require(_exists(tokenId), "Ticket does not exist");
        require(!ticketMetadata[tokenId].isUsed, "Cannot cancel used ticket");

        ticketMetadata[tokenId].isActive = false;

        emit TicketCancelled(tokenId);
    }

    /**
     * @dev Transfer ticket with restrictions
     * @param from The current owner
     * @param to The new owner
     * @param tokenId The token ID to transfer
     */
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override(ERC721, IERC721) ticketNotUsed(tokenId) ticketActive(tokenId) {
        require(from == ownerOf(tokenId), "Not the owner");
        require(to != address(0), "Cannot transfer to zero address");

        super.transferFrom(from, to, tokenId);
        emit TicketTransferred(tokenId, from, to);
    }

    /**
     * @dev Safe transfer with restrictions
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override(ERC721, IERC721) ticketNotUsed(tokenId) ticketActive(tokenId) {
        require(from == ownerOf(tokenId), "Not the owner");
        require(to != address(0), "Cannot transfer to zero address");

        super.safeTransferFrom(from, to, tokenId);
        emit TicketTransferred(tokenId, from, to);
    }

    /**
     * @dev Safe transfer with data and restrictions
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public override(ERC721, IERC721) ticketNotUsed(tokenId) ticketActive(tokenId) {
        require(from == ownerOf(tokenId), "Not the owner");
        require(to != address(0), "Cannot transfer to zero address");

        super.safeTransferFrom(from, to, tokenId, data);
        emit TicketTransferred(tokenId, from, to);
    }

    /**
     * @dev Get total supply of tickets
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter.current();
    }

    /**
     * @dev Check if ticket exists
     */
    function exists(uint256 tokenId) external view returns (bool) {
        return _exists(tokenId);
    }

    /**
     * @dev Override required by ERC721URIStorage
     */
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    /**
     * @dev Override required for multiple inheritance
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev Override required by ERC721URIStorage
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    /**
     * @dev Emergency function to pause all transfers (only owner)
     */
    function emergencyPause() external onlyOwner {
        // This would require additional implementation for a full pause mechanism
        // For now, this is a placeholder for emergency controls
    }

    /**
     * @dev Get contract statistics
     */
    function getContractStats() external view returns (
        uint256 totalTickets,
        uint256 activeTickets,
        uint256 totalUsedTickets
    ) {
        uint256 total = _tokenIdCounter.current();
        uint256 active = 0;
        uint256 used = 0;

        for (uint256 i = 1; i <= total; i++) {
            if (_exists(i)) {
                if (ticketMetadata[i].isUsed) {
                    used++;
                } else if (ticketMetadata[i].isActive) {
                    active++;
                }
            }
        }

        return (total, active, used);
    }
}