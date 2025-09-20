const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EventContract", function () {
  let eventContract;
  let paymentProcessor;
  let ticketNFT;
  let owner;
  let organizer;
  let participant1;
  let participant2;

  const eventData = {
    title: "Test Hackathon Event",
    description: "A comprehensive test event for the EventContract",
    startDate: Math.floor(Date.now() / 1000) + 86400, // Tomorrow
    endDate: Math.floor(Date.now() / 1000) + 86400 * 2, // Day after tomorrow
    ticketPrice: ethers.utils.parseEther("0.01"),
    capacity: 10,
    location: "Virtual",
    categories: ["Technology", "Blockchain"]
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
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(eventContract.address).to.be.properAddress;
    });

    it("Should initialize with correct default values", async function () {
      expect(await eventContract.eventCount()).to.equal(0);
      expect(await eventContract.platformFee()).to.equal(5);
      expect(await eventContract.owner()).to.equal(owner.address);
    });
  });

  describe("Event Creation", function () {
    it("Should create an event successfully", async function () {
      const tx = await eventContract.connect(organizer).createEvent(
        eventData.title,
        eventData.description,
        eventData.startDate,
        eventData.endDate,
        eventData.ticketPrice,
        eventData.capacity,
        eventData.location,
        eventData.categories
      );

      await expect(tx).to.emit(eventContract, "EventCreated");

      const eventCount = await eventContract.eventCount();
      expect(eventCount).to.equal(1);
    });

    it("Should store event data correctly", async function () {
      await eventContract.connect(organizer).createEvent(
        eventData.title,
        eventData.description,
        eventData.startDate,
        eventData.endDate,
        eventData.ticketPrice,
        eventData.capacity,
        eventData.location,
        eventData.categories
      );

      const eventDetails = await eventContract.getEvent(1);

      expect(eventDetails.title).to.equal(eventData.title);
      expect(eventDetails.description).to.equal(eventData.description);
      expect(eventDetails.ticketPrice).to.equal(eventData.ticketPrice);
      expect(eventDetails.capacity).to.equal(eventData.capacity);
      expect(eventDetails.organizer).to.equal(organizer.address);
      expect(eventDetails.isActive).to.equal(true);
    });

    it("Should reject event creation with invalid parameters", async function () {
      // Empty title
      await expect(
        eventContract.connect(organizer).createEvent(
          "",
          eventData.description,
          eventData.startDate,
          eventData.endDate,
          eventData.ticketPrice,
          eventData.capacity,
          eventData.location,
          eventData.categories
        )
      ).to.be.revertedWith("Title cannot be empty");

      // Start date in the past
      await expect(
        eventContract.connect(organizer).createEvent(
          eventData.title,
          eventData.description,
          Math.floor(Date.now() / 1000) - 86400,
          eventData.endDate,
          eventData.ticketPrice,
          eventData.capacity,
          eventData.location,
          eventData.categories
        )
      ).to.be.revertedWith("Start date must be in the future");

      // End date before start date
      await expect(
        eventContract.connect(organizer).createEvent(
          eventData.title,
          eventData.description,
          eventData.endDate,
          eventData.startDate,
          eventData.ticketPrice,
          eventData.capacity,
          eventData.location,
          eventData.categories
        )
      ).to.be.revertedWith("End date must be after start date");
    });
  });

  describe("Event Updates", function () {
    beforeEach(async function () {
      await eventContract.connect(organizer).createEvent(
        eventData.title,
        eventData.description,
        eventData.startDate,
        eventData.endDate,
        eventData.ticketPrice,
        eventData.capacity,
        eventData.location,
        eventData.categories
      );
    });

    it("Should allow organizer to update their event", async function () {
      const newTitle = "Updated Event Title";
      const tx = await eventContract.connect(organizer).updateEvent(
        1,
        newTitle,
        eventData.description,
        eventData.startDate,
        eventData.endDate,
        eventData.ticketPrice,
        eventData.capacity,
        eventData.location,
        eventData.categories
      );

      await expect(tx).to.emit(eventContract, "EventUpdated");

      const updatedEvent = await eventContract.getEvent(1);
      expect(updatedEvent.title).to.equal(newTitle);
    });

    it("Should reject updates from non-organizers", async function () {
      await expect(
        eventContract.connect(participant1).updateEvent(
          1,
          "Hacked Title",
          eventData.description,
          eventData.startDate,
          eventData.endDate,
          eventData.ticketPrice,
          eventData.capacity,
          eventData.location,
          eventData.categories
        )
      ).to.be.revertedWith("Only event organizer can perform this action");
    });

    it("Should reject updates to cancelled events", async function () {
      await eventContract.connect(organizer).cancelEvent(1);

      await expect(
        eventContract.connect(organizer).updateEvent(
          1,
          "Updated Title",
          eventData.description,
          eventData.startDate,
          eventData.endDate,
          eventData.ticketPrice,
          eventData.capacity,
          eventData.location,
          eventData.categories
        )
      ).to.be.revertedWith("Cannot update cancelled event");
    });
  });

  describe("Event Registration", function () {
    beforeEach(async function () {
      await eventContract.connect(organizer).createEvent(
        eventData.title,
        eventData.description,
        eventData.startDate,
        eventData.endDate,
        eventData.ticketPrice,
        eventData.capacity,
        eventData.location,
        eventData.categories
      );
    });

    it("Should allow users to register with correct payment", async function () {
      const tx = await eventContract.connect(participant1).registerForEvent(1, {
        value: eventData.ticketPrice
      });

      await expect(tx).to.emit(eventContract, "UserRegistered");

      expect(await eventContract.isUserRegistered(1, participant1.address)).to.equal(true);

      const eventDetails = await eventContract.getEvent(1);
      expect(eventDetails.registeredCount).to.equal(1);
    });

    it("Should reject registration without sufficient payment", async function () {
      await expect(
        eventContract.connect(participant1).registerForEvent(1, {
          value: ethers.utils.parseEther("0.005") // Less than required
        })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("Should reject double registration", async function () {
      await eventContract.connect(participant1).registerForEvent(1, {
        value: eventData.ticketPrice
      });

      await expect(
        eventContract.connect(participant1).registerForEvent(1, {
          value: eventData.ticketPrice
        })
      ).to.be.revertedWith("Already registered for this event");
    });

    it("Should reject registration when event is at capacity", async function () {
      // Create small capacity event
      await eventContract.connect(organizer).createEvent(
        "Small Event",
        "Limited capacity event",
        eventData.startDate,
        eventData.endDate,
        eventData.ticketPrice,
        1, // Only 1 spot
        eventData.location,
        eventData.categories
      );

      // Register first participant
      await eventContract.connect(participant1).registerForEvent(2, {
        value: eventData.ticketPrice
      });

      // Try to register second participant
      await expect(
        eventContract.connect(participant2).registerForEvent(2, {
          value: eventData.ticketPrice
        })
      ).to.be.revertedWith("Event is at full capacity");
    });

    it("Should reject registration for cancelled events", async function () {
      await eventContract.connect(organizer).cancelEvent(1);

      await expect(
        eventContract.connect(participant1).registerForEvent(1, {
          value: eventData.ticketPrice
        })
      ).to.be.revertedWith("Event is not active");
    });
  });

  describe("Event Cancellation", function () {
    beforeEach(async function () {
      await eventContract.connect(organizer).createEvent(
        eventData.title,
        eventData.description,
        eventData.startDate,
        eventData.endDate,
        eventData.ticketPrice,
        eventData.capacity,
        eventData.location,
        eventData.categories
      );
    });

    it("Should allow organizer to cancel their event", async function () {
      const tx = await eventContract.connect(organizer).cancelEvent(1);
      await expect(tx).to.emit(eventContract, "EventCancelled");

      const eventDetails = await eventContract.getEvent(1);
      expect(eventDetails.isActive).to.equal(false);
    });

    it("Should reject cancellation from non-organizers", async function () {
      await expect(
        eventContract.connect(participant1).cancelEvent(1)
      ).to.be.revertedWith("Only event organizer can perform this action");
    });
  });

  describe("Event Queries", function () {
    beforeEach(async function () {
      // Create multiple events
      await eventContract.connect(organizer).createEvent(
        "Event 1",
        "First event",
        eventData.startDate,
        eventData.endDate,
        eventData.ticketPrice,
        eventData.capacity,
        eventData.location,
        eventData.categories
      );

      await eventContract.connect(organizer).createEvent(
        "Event 2",
        "Second event",
        eventData.startDate,
        eventData.endDate,
        eventData.ticketPrice,
        eventData.capacity,
        eventData.location,
        eventData.categories
      );

      await eventContract.connect(participant1).createEvent(
        "Event 3",
        "Third event",
        eventData.startDate,
        eventData.endDate,
        eventData.ticketPrice,
        eventData.capacity,
        eventData.location,
        eventData.categories
      );
    });

    it("Should return events by organizer", async function () {
      const organizerEvents = await eventContract.getEventsByOrganizer(organizer.address);
      expect(organizerEvents.length).to.equal(2);
      expect(organizerEvents.map(id => id.toNumber())).to.deep.equal([1, 2]);
    });

    it("Should return all active events", async function () {
      const activeEvents = await eventContract.getActiveEvents();
      expect(activeEvents.length).to.equal(3);
      expect(activeEvents.map(id => id.toNumber())).to.deep.equal([1, 2, 3]);
    });

    it("Should exclude cancelled events from active events list", async function () {
      await eventContract.connect(organizer).cancelEvent(1);

      const activeEvents = await eventContract.getActiveEvents();
      expect(activeEvents.length).to.equal(2);
      expect(activeEvents.map(id => id.toNumber())).to.deep.equal([2, 3]);
    });
  });

  describe("Platform Fee Management", function () {
    it("Should allow owner to update platform fee", async function () {
      await eventContract.connect(owner).updatePlatformFee(10);
      expect(await eventContract.platformFee()).to.equal(10);
    });

    it("Should reject platform fee updates from non-owners", async function () {
      await expect(
        eventContract.connect(organizer).updatePlatformFee(10)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should reject platform fee above 20%", async function () {
      await expect(
        eventContract.connect(owner).updatePlatformFee(25)
      ).to.be.revertedWith("Platform fee cannot exceed 20%");
    });
  });

  describe("Gas Optimization", function () {
    it("Should have reasonable gas costs for event creation", async function () {
      const tx = await eventContract.connect(organizer).createEvent(
        eventData.title,
        eventData.description,
        eventData.startDate,
        eventData.endDate,
        eventData.ticketPrice,
        eventData.capacity,
        eventData.location,
        eventData.categories
      );

      const receipt = await tx.wait();
      expect(receipt.gasUsed).to.be.below(400000); // Reasonable gas limit
    });

    it("Should have reasonable gas costs for event registration", async function () {
      await eventContract.connect(organizer).createEvent(
        eventData.title,
        eventData.description,
        eventData.startDate,
        eventData.endDate,
        eventData.ticketPrice,
        eventData.capacity,
        eventData.location,
        eventData.categories
      );

      const tx = await eventContract.connect(participant1).registerForEvent(1, {
        value: eventData.ticketPrice
      });

      const receipt = await tx.wait();
      expect(receipt.gasUsed).to.be.below(400000); // Reasonable gas limit for registration with validation
    });
  });
});