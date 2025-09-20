const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Smart Contract Integration Tests", function () {
    let eventContract, paymentProcessor, ticketNFT;
    let owner, organizer, attendee1, attendee2;
    let eventId;

    beforeEach(async function () {
        [owner, organizer, attendee1, attendee2] = await ethers.getSigners();

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

        // Set up cross-contract references
        await eventContract.setPaymentProcessor(paymentProcessor.address);
        await ticketNFT.setEventContract(eventContract.address);
        await ticketNFT.setPaymentProcessor(paymentProcessor.address);
    });

    describe("Complete Event Workflow", function () {
        it("Should complete full event creation, payment, and ticket minting workflow", async function () {
            // 1. Create an event
            const eventTitle = "Test Event";
            const eventDescription = "A test event for integration";
            const startDate = Math.floor(Date.now() / 1000) + 86400; // Tomorrow
            const endDate = startDate + 86400; // Day after
            const ticketPrice = ethers.utils.parseEther("0.1");
            const capacity = 100;
            const location = "Test Venue";
            const categories = ["Technology", "Blockchain"];

            const createEventTx = await eventContract.connect(organizer).createEvent(
                eventTitle,
                eventDescription,
                startDate,
                endDate,
                ticketPrice,
                capacity,
                location,
                categories
            );
            const createEventReceipt = await createEventTx.wait();
            eventId = createEventReceipt.events[0].args.eventId;

            // Verify event was created
            const eventData = await eventContract.getEvent(eventId);
            expect(eventData.title).to.equal(eventTitle);
            expect(eventData.isActive).to.be.true;

            // 2. Register for event and process payment
            const paymentAmount = ticketPrice;
            const registerTx = await eventContract.connect(attendee1).registerForEvent(eventId, {
                value: paymentAmount
            });
            await registerTx.wait();

            // Verify registration
            const isRegistered = await eventContract.eventRegistrations(eventId, attendee1.address);
            expect(isRegistered).to.be.true;

            // Verify payment was processed
            const eventPayments = await paymentProcessor.getEventPayments(eventId);
            expect(eventPayments.length).to.equal(1);

            // 3. Mint ticket NFT
            const seatInfo = "A1";
            const ticketType = "General";
            const metadataURI = "https://example.com/ticket/1";

            const mintTx = await ticketNFT.connect(owner).mintTicket(
                attendee1.address,
                eventId,
                eventContract.address,
                seatInfo,
                ticketType,
                metadataURI
            );
            await mintTx.wait();

            // Verify ticket was minted
            const tokenId = 1;
            const ticketOwner = await ticketNFT.ownerOf(tokenId);
            expect(ticketOwner).to.equal(attendee1.address);

            // Verify ticket metadata
            const metadata = await ticketNFT.getTicketMetadata(tokenId);
            expect(metadata.eventId).to.equal(eventId);
            expect(metadata.eventContractAddr).to.equal(eventContract.address);
            expect(metadata.purchaser).to.equal(attendee1.address);
            expect(metadata.seatInfo).to.equal(seatInfo);
            expect(metadata.ticketType).to.equal(ticketType);
            expect(metadata.isActive).to.be.true;
            expect(metadata.isUsed).to.be.false;

            // 4. Test ticket verification
            const isValid = await ticketNFT.verifyTicket(tokenId, eventId);
            expect(isValid).to.be.true;

            // 5. Test ticket usage
            await ticketNFT.connect(attendee1).useTicket(tokenId);
            const metadataAfterUse = await ticketNFT.getTicketMetadata(tokenId);
            expect(metadataAfterUse.isUsed).to.be.true;

            // Verify ticket is no longer valid after use
            const isValidAfterUse = await ticketNFT.verifyTicket(tokenId, eventId);
            expect(isValidAfterUse).to.be.false;
        });

        it("Should handle batch ticket minting", async function () {
            // Create event first
            const eventTitle = "Batch Test Event";
            const startDate = Math.floor(Date.now() / 1000) + 86400;
            const endDate = startDate + 86400;
            const ticketPrice = ethers.utils.parseEther("0.05");
            const capacity = 50;

            const createEventTx = await eventContract.connect(organizer).createEvent(
                eventTitle,
                "Batch test",
                startDate,
                endDate,
                ticketPrice,
                capacity,
                "Venue",
                ["Test"]
            );
            const createEventReceipt = await createEventTx.wait();
            eventId = createEventReceipt.events[0].args.eventId;

            // Register multiple attendees
            await eventContract.connect(attendee1).registerForEvent(eventId, { value: ticketPrice });
            await eventContract.connect(attendee2).registerForEvent(eventId, { value: ticketPrice });

            // Mint batch tickets
            const recipients = [attendee1.address, attendee2.address];
            const seatInfos = ["B1", "B2"];
            const ticketType = "VIP";
            const baseMetadataURI = "https://example.com/ticket/";

            const batchMintTx = await ticketNFT.connect(owner).mintBatchTickets(
                recipients,
                eventId,
                eventContract.address,
                seatInfos,
                ticketType,
                baseMetadataURI
            );
            const batchMintReceipt = await batchMintTx.wait();

            // Get tokenIds from the batch mint events
            const tokenIds = [];
            for (const event of batchMintReceipt.events) {
                if (event.event === 'TicketMinted') {
                    tokenIds.push(event.args.tokenId);
                }
            }

            // Verify batch minting
            expect(tokenIds.length).to.equal(2);

            // Verify individual tickets
            for (let i = 0; i < recipients.length; i++) {
                const tokenId = tokenIds[i];
                const ownerOfToken = await ticketNFT.ownerOf(tokenId);
                expect(ownerOfToken).to.equal(recipients[i]);

                const metadata = await ticketNFT.getTicketMetadata(tokenId);
                expect(metadata.eventId).to.equal(eventId);
                expect(metadata.seatInfo).to.equal(seatInfos[i]);
                expect(metadata.ticketType).to.equal(ticketType);
            }
        });

        it("Should reject invalid event tickets", async function () {
            // Try to mint ticket for non-existent event
            const invalidEventId = 999;
            await expect(
                ticketNFT.connect(owner).mintTicket(
                    attendee1.address,
                    invalidEventId,
                    eventContract.address,
                    "C1",
                    "General",
                    "https://example.com/ticket/invalid"
                )
            ).to.be.revertedWith("Invalid or inactive event");
        });

        it("Should handle event cancellation and ticket invalidation", async function () {
            // Create and register for event
            const createEventTx = await eventContract.connect(organizer).createEvent(
                "Cancellable Event",
                "Test cancellation",
                Math.floor(Date.now() / 1000) + 86400,
                Math.floor(Date.now() / 1000) + 172800,
                ethers.utils.parseEther("0.1"),
                10,
                "Venue",
                ["Test"]
            );
            const createEventReceipt = await createEventTx.wait();
            eventId = createEventReceipt.events[0].args.eventId;
            await eventContract.connect(attendee1).registerForEvent(eventId, { value: ethers.utils.parseEther("0.1") });

            // Mint ticket
            const mintTx = await ticketNFT.connect(owner).mintTicket(
                attendee1.address,
                eventId,
                eventContract.address,
                "D1",
                "General",
                "https://example.com/ticket/cancel"
            );
            const mintReceipt = await mintTx.wait();
            const tokenId = mintReceipt.events[0].args.tokenId;

            // Verify ticket is valid before cancellation
            let ticketExists = await ticketNFT.verifyTicket(tokenId, eventId);
            expect(ticketExists).to.be.true;

            // Cancel event
            await eventContract.connect(organizer).cancelEvent(eventId);

            // Verify event is cancelled
            const eventData = await eventContract.getEvent(eventId);
            expect(eventData.isActive).to.be.false;

            // Ticket should still exist but event validation should fail
            ticketExists = await ticketNFT.verifyTicket(tokenId, eventId);
            expect(ticketExists).to.be.false; // Should be false because event is inactive
        });
    });

    describe("Cross-Contract Security", function () {
        it("Should prevent unauthorized contract modifications", async function () {
            // Non-owner should not be able to set EventContract
            await expect(
                ticketNFT.connect(attendee1).setEventContract(attendee2.address)
            ).to.be.revertedWith("Ownable: caller is not the owner");

            // Non-owner should not be able to set PaymentProcessor
            await expect(
                ticketNFT.connect(attendee1).setPaymentProcessor(attendee2.address)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should validate contract addresses", async function () {
            // Should reject zero address for EventContract
            await expect(
                ticketNFT.connect(owner).setEventContract(ethers.constants.AddressZero)
            ).to.be.revertedWith("Invalid event contract address");

            // Should reject zero address for PaymentProcessor
            await expect(
                ticketNFT.connect(owner).setPaymentProcessor(ethers.constants.AddressZero)
            ).to.be.revertedWith("Invalid payment processor address");
        });
    });
});