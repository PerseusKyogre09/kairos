const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TicketNFT", function () {
  let ticketNFT;
  let eventContract;
  let paymentProcessor;
  let owner;
  let organizer;
  let participant1;
  let participant2;
  let eventId;

  const eventData = {
    title: "Test Event for Tickets",
    description: "A test event for ticket minting",
    startDate: Math.floor(Date.now() / 1000) + 86400,
    endDate: Math.floor(Date.now() / 1000) + 86400 * 2,
    ticketPrice: ethers.utils.parseEther("0.01"),
    capacity: 10,
    location: "Test Venue",
    categories: ["Test"],
    seatInfo: "A1",
    ticketType: "VIP",
    metadataURI: "https://example.com/metadata/1"
  };

  beforeEach(async function () {
    // Get signers
    [owner, organizer, participant1, participant2] = await ethers.getSigners();

    // Deploy EventContract
    const EventContract = await ethers.getContractFactory("EventContract");
    eventContract = await EventContract.deploy();
    await eventContract.deployed();

    // Deploy TicketNFT
    const TicketNFT = await ethers.getContractFactory("TicketNFT");
    ticketNFT = await TicketNFT.deploy();
    await ticketNFT.deployed();

    // Deploy PaymentProcessor
    const PaymentProcessor = await ethers.getContractFactory("PaymentProcessor");
    paymentProcessor = await PaymentProcessor.deploy(eventContract.address, ticketNFT.address);
    await paymentProcessor.deployed();

    // Set up cross-contract relationships
    await eventContract.setPaymentProcessor(paymentProcessor.address);
    await ticketNFT.setEventContract(eventContract.address);
    await ticketNFT.setPaymentProcessor(paymentProcessor.address);

    // Create a test event
    const createEventTx = await eventContract.connect(organizer).createEvent(
      eventData.title,
      eventData.description,
      eventData.startDate,
      eventData.endDate,
      eventData.ticketPrice,
      eventData.capacity,
      eventData.location,
      eventData.categories
    );
    const createEventReceipt = await createEventTx.wait();
    eventId = createEventReceipt.events[0].args.eventId;
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(ticketNFT.address).to.be.properAddress;
    });

    it("Should initialize with correct name and symbol", async function () {
      expect(await ticketNFT.name()).to.equal("EventTicket");
      expect(await ticketNFT.symbol()).to.equal("ETKT");
    });

    it("Should set the right owner", async function () {
      expect(await ticketNFT.owner()).to.equal(owner.address);
    });
  });

  describe("Ticket Minting", function () {
    it("Should mint a ticket successfully", async function () {
      const tx = await ticketNFT.connect(owner).mintTicket(
        participant1.address,
        eventId,
        eventContract.address,
        eventData.seatInfo,
        eventData.ticketType,
        eventData.metadataURI
      );

      await expect(tx).to.emit(ticketNFT, "TicketMinted");

      expect(await ticketNFT.ownerOf(1)).to.equal(participant1.address);
      expect(await ticketNFT.tokenURI(1)).to.equal(eventData.metadataURI);
    });

    it("Should store ticket metadata correctly", async function () {
      await ticketNFT.connect(owner).mintTicket(
        participant1.address,
        eventId,
        eventContract.address,
        eventData.seatInfo,
        eventData.ticketType,
        eventData.metadataURI
      );

      const metadata = await ticketNFT.getTicketMetadata(1);

      expect(metadata.eventId).to.equal(eventId);
      expect(metadata.eventContractAddr).to.equal(eventContract.address);
      expect(metadata.purchaser).to.equal(participant1.address);
      expect(metadata.isUsed).to.equal(false);
      expect(metadata.isActive).to.equal(true);
      expect(metadata.seatInfo).to.equal(eventData.seatInfo);
      expect(metadata.ticketType).to.equal(eventData.ticketType);
    });

    it("Should reject minting from non-owner", async function () {
      await expect(
        ticketNFT.connect(participant1).mintTicket(
          participant2.address,
          eventId,
          eventContract.address,
          eventData.seatInfo,
          eventData.ticketType,
          eventData.metadataURI
        )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should increment token IDs correctly", async function () {
      await ticketNFT.connect(owner).mintTicket(
        participant1.address,
        eventId,
        eventContract.address,
        eventData.seatInfo,
        eventData.ticketType,
        eventData.metadataURI
      );

      await ticketNFT.connect(owner).mintTicket(
        participant2.address,
        eventId,
        eventContract.address,
        "B1",
        "General",
        "https://example.com/metadata/2"
      );

      expect(await ticketNFT.ownerOf(1)).to.equal(participant1.address);
      expect(await ticketNFT.ownerOf(2)).to.equal(participant2.address);
    });
  });

  describe("Batch Minting", function () {
    it("Should mint multiple tickets successfully", async function () {
      const recipients = [participant1.address, participant2.address];
      const seatInfos = ["A1", "A2"];

      const tx = await ticketNFT.connect(owner).mintBatchTickets(
        recipients,
        eventId,
        eventContract.address,
        seatInfos,
        eventData.ticketType,
        "https://example.com/metadata"
      );

      const tokenIds = await tx.wait().then(receipt => {
        // Extract token IDs from events
        const events = receipt.events.filter(e => e.event === "TicketMinted");
        return events.map(e => e.args.tokenId.toNumber());
      });

      expect(tokenIds).to.have.lengthOf(2);
      expect(await ticketNFT.ownerOf(tokenIds[0])).to.equal(participant1.address);
      expect(await ticketNFT.ownerOf(tokenIds[1])).to.equal(participant2.address);
    });

    it("Should reject batch minting with mismatched arrays", async function () {
      const recipients = [participant1.address, participant2.address];
      const seatInfos = ["A1"]; // Different length

      await expect(
        ticketNFT.connect(owner).mintBatchTickets(
          recipients,
          eventId,
          eventContract.address,
          seatInfos,
          eventData.ticketType,
          "https://example.com/metadata"
        )
      ).to.be.revertedWith("Recipients and seat infos length mismatch");
    });
  });

  describe("Ticket Usage", function () {
    beforeEach(async function () {
      await ticketNFT.connect(owner).mintTicket(
        participant1.address,
        eventId,
        eventContract.address,
        eventData.seatInfo,
        eventData.ticketType,
        eventData.metadataURI
      );
    });

    it("Should allow ticket owner to use ticket", async function () {
      const tx = await ticketNFT.connect(participant1).useTicket(1);
      await expect(tx).to.emit(ticketNFT, "TicketUsed");

      const metadata = await ticketNFT.getTicketMetadata(1);
      expect(metadata.isUsed).to.equal(true);
    });

    it("Should reject usage from non-owner", async function () {
      await expect(
        ticketNFT.connect(participant2).useTicket(1)
      ).to.be.revertedWith("Not ticket owner");
    });

    it("Should reject usage of already used ticket", async function () {
      await ticketNFT.connect(participant1).useTicket(1);

      await expect(
        ticketNFT.connect(participant1).useTicket(1)
      ).to.be.revertedWith("Ticket already used");
    });

    it("Should reject usage of cancelled ticket", async function () {
      await ticketNFT.connect(owner).cancelTicket(1);

      await expect(
        ticketNFT.connect(participant1).useTicket(1)
      ).to.be.revertedWith("Ticket is not active");
    });
  });

  describe("Ticket Verification", function () {
    beforeEach(async function () {
      await ticketNFT.connect(owner).mintTicket(
        participant1.address,
        eventId,
        eventContract.address,
        eventData.seatInfo,
        eventData.ticketType,
        eventData.metadataURI
      );
    });

    it("Should verify valid ticket correctly", async function () {
      const isValid = await ticketNFT.verifyTicket(1, eventId);
      expect(isValid).to.equal(true);
    });

    it("Should reject verification for wrong event", async function () {
      const isValid = await ticketNFT.verifyTicket(1, 999);
      expect(isValid).to.equal(false);
    });

    it("Should reject verification for used ticket", async function () {
      await ticketNFT.connect(participant1).useTicket(1);

      const isValid = await ticketNFT.verifyTicket(1, eventId);
      expect(isValid).to.equal(false);
    });

    it("Should reject verification for cancelled ticket", async function () {
      await ticketNFT.connect(owner).cancelTicket(1);

      const isValid = await ticketNFT.verifyTicket(1, eventId);
      expect(isValid).to.equal(false);
    });

    it("Should reject verification for non-existent ticket", async function () {
      const isValid = await ticketNFT.verifyTicket(999, eventId);
      expect(isValid).to.equal(false);
    });
  });

  describe("Ticket Transfers", function () {
    beforeEach(async function () {
      await ticketNFT.connect(owner).mintTicket(
        participant1.address,
        eventId,
        eventContract.address,
        eventData.seatInfo,
        eventData.ticketType,
        eventData.metadataURI
      );
    });

    it("Should allow transfer of unused active ticket", async function () {
      const tx = await ticketNFT.connect(participant1).transferFrom(
        participant1.address,
        participant2.address,
        1
      );

      await expect(tx).to.emit(ticketNFT, "TicketTransferred");

      expect(await ticketNFT.ownerOf(1)).to.equal(participant2.address);
    });

    it("Should reject transfer of used ticket", async function () {
      await ticketNFT.connect(participant1).useTicket(1);

      await expect(
        ticketNFT.connect(participant1).transferFrom(
          participant1.address,
          participant2.address,
          1
        )
      ).to.be.revertedWith("Ticket already used");
    });

    it("Should reject transfer of cancelled ticket", async function () {
      await ticketNFT.connect(owner).cancelTicket(1);

      await expect(
        ticketNFT.connect(participant1).transferFrom(
          participant1.address,
          participant2.address,
          1
        )
      ).to.be.revertedWith("Ticket is not active");
    });

    it("Should reject transfer to zero address", async function () {
      await expect(
        ticketNFT.connect(participant1).transferFrom(
          participant1.address,
          ethers.constants.AddressZero,
          1
        )
      ).to.be.revertedWith("Cannot transfer to zero address");
    });
  });

  describe("Ticket Cancellation", function () {
    beforeEach(async function () {
      await ticketNFT.connect(owner).mintTicket(
        participant1.address,
        eventId,
        eventContract.address,
        eventData.seatInfo,
        eventData.ticketType,
        eventData.metadataURI
      );
    });

    it("Should allow owner to cancel ticket", async function () {
      const tx = await ticketNFT.connect(owner).cancelTicket(1);
      await expect(tx).to.emit(ticketNFT, "TicketCancelled");

      const metadata = await ticketNFT.getTicketMetadata(1);
      expect(metadata.isActive).to.equal(false);
    });

    it("Should reject cancellation from non-owner", async function () {
      await expect(
        ticketNFT.connect(participant1).cancelTicket(1)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should reject cancellation of used ticket", async function () {
      await ticketNFT.connect(participant1).useTicket(1);

      await expect(
        ticketNFT.connect(owner).cancelTicket(1)
      ).to.be.revertedWith("Cannot cancel used ticket");
    });
  });

  describe("Event Ticket Queries", function () {
    beforeEach(async function () {
      // Mint tickets for the test event
      await ticketNFT.connect(owner).mintTicket(
        participant1.address,
        eventId,
        eventContract.address,
        "A1",
        "VIP",
        "https://example.com/metadata/1"
      );

      await ticketNFT.connect(owner).mintTicket(
        participant2.address,
        eventId,
        eventContract.address,
        "A2",
        "VIP",
        "https://example.com/metadata/2"
      );

      // Mint ticket for event 2
      await ticketNFT.connect(owner).mintTicket(
        participant1.address,
        eventId,
        eventContract.address,
        "B1",
        "General",
        "https://example.com/metadata/3"
      );
    });

    it("Should return all tickets for an event", async function () {
      const eventTickets = await ticketNFT.getEventTickets(eventId);
      expect(eventTickets.length).to.equal(3);
      expect(eventTickets.map(id => id.toNumber())).to.deep.equal([1, 2, 3]);
    });

    it("Should return tickets owned by an address", async function () {
      const ownerTickets = await ticketNFT.getTicketsByOwner(participant1.address);
      expect(ownerTickets.length).to.equal(2);
      expect(ownerTickets.map(id => id.toNumber())).to.deep.equal([1, 3]);
    });
  });

  describe("Contract Statistics", function () {
    beforeEach(async function () {
      await ticketNFT.connect(owner).mintTicket(
        participant1.address,
        eventId,
        eventContract.address,
        "A1",
        "VIP",
        "https://example.com/metadata/1"
      );

      await ticketNFT.connect(owner).mintTicket(
        participant2.address,
        eventId,
        eventContract.address,
        "A2",
        "VIP",
        "https://example.com/metadata/2"
      );
    });

    it("Should return correct contract statistics", async function () {
      const stats = await ticketNFT.getContractStats();

      expect(stats.totalTickets).to.equal(2);
      expect(stats.activeTickets).to.equal(2);
      expect(stats.totalUsedTickets).to.equal(0);
    });

    it("Should update statistics after ticket usage", async function () {
      await ticketNFT.connect(participant1).useTicket(1);

      const stats = await ticketNFT.getContractStats();

      expect(stats.totalTickets).to.equal(2);
      expect(stats.activeTickets).to.equal(1);
      expect(stats.totalUsedTickets).to.equal(1);
    });

    it("Should update statistics after ticket cancellation", async function () {
      await ticketNFT.connect(owner).cancelTicket(1);

      const stats = await ticketNFT.getContractStats();

      expect(stats.totalTickets).to.equal(2);
      expect(stats.activeTickets).to.equal(1);
      expect(stats.totalUsedTickets).to.equal(0);
    });
  });

  describe("ERC-721 Compliance", function () {
    beforeEach(async function () {
      await ticketNFT.connect(owner).mintTicket(
        participant1.address,
        eventId,
        eventContract.address,
        eventData.seatInfo,
        eventData.ticketType,
        eventData.metadataURI
      );
    });

    it("Should support ERC-721 interface", async function () {
      const erc721InterfaceId = "0x80ac58cd"; // ERC-721 interface ID
      expect(await ticketNFT.supportsInterface(erc721InterfaceId)).to.equal(true);
    });

    it("Should support ERC-721 Metadata extension", async function () {
      const metadataInterfaceId = "0x5b5e139f"; // ERC-721 Metadata interface ID
      expect(await ticketNFT.supportsInterface(metadataInterfaceId)).to.equal(true);
    });

    it("Should return correct balance", async function () {
      expect(await ticketNFT.balanceOf(participant1.address)).to.equal(1);
      expect(await ticketNFT.balanceOf(participant2.address)).to.equal(0);
    });

    it("Should return correct token URI", async function () {
      expect(await ticketNFT.tokenURI(1)).to.equal(eventData.metadataURI);
    });

    it("Should return correct total supply", async function () {
      expect(await ticketNFT.totalSupply()).to.equal(1);
    });
  });

  describe("Gas Optimization", function () {
    it("Should have reasonable gas costs for minting", async function () {
      const tx = await ticketNFT.connect(owner).mintTicket(
        participant1.address,
        eventId,
        eventContract.address,
        eventData.seatInfo,
        eventData.ticketType,
        eventData.metadataURI
      );

      const receipt = await tx.wait();
      expect(receipt.gasUsed).to.be.below(400000); // Reasonable gas limit for NFT minting with validation
    });

    it("Should have reasonable gas costs for verification", async function () {
      await ticketNFT.connect(owner).mintTicket(
        participant1.address,
        eventId,
        eventContract.address,
        eventData.seatInfo,
        eventData.ticketType,
        eventData.metadataURI
      );

      const tx = await ticketNFT.verifyTicket(1, eventId);

      // Gas estimation for view functions is not directly available
      // This test ensures the function doesn't revert
      expect(tx).to.equal(true);
    });
  });
});