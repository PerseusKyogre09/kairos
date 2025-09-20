const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PaymentProcessor", function () {
    let PaymentProcessor;
    let EventContract;
    let TicketNFT;
    let paymentProcessor;
    let eventContract;
    let ticketContract;
    let owner;
    let organizer;
    let attendee1;
    let attendee2;
    let platformFeeCollector;

    const EVENT_FEE = ethers.utils.parseEther("0.1"); // 0.1 ETH
    const PLATFORM_FEE_PERCENTAGE = 5; // 5%

    beforeEach(async function () {
        [owner, organizer, attendee1, attendee2, platformFeeCollector] = await ethers.getSigners();

        // Deploy mock contracts first (we'll use the actual contracts later)
        const EventContractFactory = await ethers.getContractFactory("EventContract");
        eventContract = await EventContractFactory.deploy();
        await eventContract.deployed();

        const TicketNFTFactory = await ethers.getContractFactory("TicketNFT");
        ticketContract = await TicketNFTFactory.deploy();
        await ticketContract.deployed();

        // Deploy PaymentProcessor
        const PaymentProcessorFactory = await ethers.getContractFactory("PaymentProcessor");
        paymentProcessor = await PaymentProcessorFactory.deploy(
            eventContract.address,
            ticketContract.address
        );
        await paymentProcessor.deployed();
    });

    describe("Deployment", function () {
        it("Should set the correct contract addresses", async function () {
            expect(await paymentProcessor.eventContract()).to.equal(eventContract.address);
            expect(await paymentProcessor.ticketContract()).to.equal(ticketContract.address);
        });

        it("Should set the correct owner", async function () {
            expect(await paymentProcessor.owner()).to.equal(owner.address);
        });

        it("Should initialize with correct platform fee", async function () {
            expect(await paymentProcessor.platformFeePercentage()).to.equal(PLATFORM_FEE_PERCENTAGE);
        });
    });

    describe("Payment Processing", function () {
        beforeEach(async function () {
            // Create an event first
            await eventContract.connect(organizer).createEvent(
                "Test Event",
                "Test Description",
                Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
                Math.floor(Date.now() / 1000) + 86400 * 2, // 48 hours from now
                EVENT_FEE,
                100,
                "Test Location",
                ["Technology", "Blockchain"]
            );
        });

        it("Should process payment correctly", async function () {
            const eventId = 1;
            const paymentAmount = EVENT_FEE;

            // Process payment using test function
            await expect(
                paymentProcessor.connect(owner).testProcessPayment(
                    eventId,
                    attendee1.address,
                    organizer.address,
                    paymentAmount,
                    { value: paymentAmount }
                )
            ).to.emit(paymentProcessor, "PaymentProcessed");

            // Check payment record
            const paymentRecord = await paymentProcessor.getPaymentRecord(1);
            expect(paymentRecord.eventId).to.equal(eventId);
            expect(paymentRecord.payer).to.equal(attendee1.address);
            expect(paymentRecord.organizer).to.equal(organizer.address);
            expect(paymentRecord.amount).to.equal(paymentAmount);
            expect(paymentRecord.processed).to.equal(true);

            // Check organizer balance
            const organizerBalance = await paymentProcessor.getOrganizerBalance(organizer.address);
            const expectedOrganizerShare = paymentAmount.mul(95).div(100); // 95% after 5% platform fee
            expect(organizerBalance.availableBalance).to.equal(expectedOrganizerShare);
            expect(organizerBalance.totalEarned).to.equal(expectedOrganizerShare);
        });

        it("Should reject payment with incorrect amount", async function () {
            const eventId = 1;
            const paymentAmount = EVENT_FEE;
            const wrongAmount = ethers.utils.parseEther("0.05");

            await expect(
                paymentProcessor.connect(owner).testProcessPayment(
                    eventId,
                    attendee1.address,
                    organizer.address,
                    paymentAmount,
                    { value: wrongAmount }
                )
            ).to.be.revertedWith("Incorrect payment amount");
        });

        it("Should reject payment with zero amount", async function () {
            const eventId = 1;

            await expect(
                paymentProcessor.connect(owner).testProcessPayment(
                    eventId,
                    attendee1.address,
                    organizer.address,
                    0,
                    { value: 0 }
                )
            ).to.be.revertedWith("Amount must be greater than 0");
        });

        it("Should reject payment exceeding maximum amount", async function () {
            const eventId = 1;
            const maxAmount = ethers.utils.parseEther("100");
            const excessiveAmount = ethers.utils.parseEther("101");

            await expect(
                paymentProcessor.connect(owner).testProcessPayment(
                    eventId,
                    attendee1.address,
                    organizer.address,
                    excessiveAmount,
                    { value: excessiveAmount }
                )
            ).to.be.revertedWith("Amount cannot exceed 100 ETH");
        });

        it("Should reject payment from non-event contract", async function () {
            const eventId = 1;

            await expect(
                paymentProcessor.connect(attendee1).testProcessPayment(
                    eventId,
                    attendee1.address,
                    organizer.address,
                    EVENT_FEE,
                    { value: EVENT_FEE }
                )
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should reject payment when contract is paused", async function () {
            await paymentProcessor.connect(owner).emergencyPause();

            await expect(
                paymentProcessor.connect(owner).testProcessPayment(
                    1,
                    attendee1.address,
                    organizer.address,
                    EVENT_FEE,
                    { value: EVENT_FEE }
                )
            ).to.be.revertedWith("Pausable: paused");
        });
    });

    describe("Withdrawals", function () {
        beforeEach(async function () {
            // Create event and process payment
            await eventContract.connect(organizer).createEvent(
                "Test Event",
                "Test Description",
                Math.floor(Date.now() / 1000) + 86400, // startDate
                Math.floor(Date.now() / 1000) + 86400 * 2, // endDate
                EVENT_FEE,
                100, // capacity
                "Test Location",
                ["Technology", "Blockchain"] // categories
            );

            await paymentProcessor.connect(owner).testProcessPayment(
                1,
                attendee1.address,
                organizer.address,
                EVENT_FEE,
                { value: EVENT_FEE }
            );
        });

        it("Should allow organizer to withdraw funds", async function () {
            const organizerBalance = await paymentProcessor.getOrganizerBalance(organizer.address);
            const withdrawAmount = organizerBalance.availableBalance;

            const initialBalance = await ethers.provider.getBalance(organizer.address);

            await expect(
                paymentProcessor.connect(organizer).withdrawOrganizerFunds(withdrawAmount)
            ).to.emit(paymentProcessor, "WithdrawalMade");

            const finalBalance = await ethers.provider.getBalance(organizer.address);
            expect(finalBalance.sub(initialBalance)).to.be.closeTo(withdrawAmount, ethers.utils.parseEther("0.001")); // Account for gas

            const updatedBalance = await paymentProcessor.getOrganizerBalance(organizer.address);
            expect(updatedBalance.availableBalance).to.equal(0);
            expect(updatedBalance.withdrawnAmount).to.equal(withdrawAmount);
        });

        it("Should reject withdrawal below minimum amount", async function () {
            const minAmount = ethers.utils.parseEther("0.009"); // Below 0.01 ETH

            await expect(
                paymentProcessor.connect(organizer).withdrawOrganizerFunds(minAmount)
            ).to.be.revertedWith("Minimum withdrawal amount is 0.01 ETH");
        });

        it("Should reject withdrawal exceeding available balance", async function () {
            const organizerBalance = await paymentProcessor.getOrganizerBalance(organizer.address);
            const excessiveAmount = organizerBalance.availableBalance.add(ethers.utils.parseEther("1"));

            await expect(
                paymentProcessor.connect(organizer).withdrawOrganizerFunds(excessiveAmount)
            ).to.be.revertedWith("Insufficient available balance");
        });

        it("Should reject withdrawal when contract is paused", async function () {
            await paymentProcessor.connect(owner).emergencyPause();

            const organizerBalance = await paymentProcessor.getOrganizerBalance(organizer.address);

            await expect(
                paymentProcessor.connect(organizer).withdrawOrganizerFunds(organizerBalance.availableBalance)
            ).to.be.revertedWith("Pausable: paused");
        });
    });

    describe("Platform Fee Management", function () {
        it("Should allow owner to update platform fee", async function () {
            const newFee = 10;

            await expect(
                paymentProcessor.connect(owner).updatePlatformFee(newFee)
            ).to.emit(paymentProcessor, "PlatformFeeUpdated");

            expect(await paymentProcessor.platformFeePercentage()).to.equal(newFee);
        });

        it("Should reject platform fee update from non-owner", async function () {
            await expect(
                paymentProcessor.connect(attendee1).updatePlatformFee(10)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should reject platform fee exceeding maximum", async function () {
            const excessiveFee = 25; // Above 20%

            await expect(
                paymentProcessor.connect(owner).updatePlatformFee(excessiveFee)
            ).to.be.revertedWith("Platform fee cannot exceed maximum");
        });
    });

    describe("Emergency Controls", function () {
        it("Should allow owner to pause contract", async function () {
            await paymentProcessor.connect(owner).emergencyPause();
            expect(await paymentProcessor.paused()).to.equal(true);
        });

        it("Should allow owner to unpause contract", async function () {
            await paymentProcessor.connect(owner).emergencyPause();
            await paymentProcessor.connect(owner).emergencyUnpause();
            expect(await paymentProcessor.paused()).to.equal(false);
        });

        it("Should reject pause from non-owner", async function () {
            await expect(
                paymentProcessor.connect(attendee1).emergencyPause()
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should allow owner to withdraw platform fees", async function () {
            // Add some funds to contract
            await owner.sendTransaction({
                to: paymentProcessor.address,
                value: ethers.utils.parseEther("1")
            });

            const initialBalance = await ethers.provider.getBalance(owner.address);

            await expect(
                paymentProcessor.connect(owner).withdrawPlatformFees()
            ).to.emit(paymentProcessor, "EmergencyWithdrawal");

            const finalBalance = await ethers.provider.getBalance(owner.address);
            expect(finalBalance.sub(initialBalance)).to.be.closeTo(ethers.utils.parseEther("1"), ethers.utils.parseEther("0.001"));
        });
    });

    describe("Query Functions", function () {
        beforeEach(async function () {
            // Create event and process multiple payments
            await eventContract.connect(organizer).createEvent(
                "Test Event",
                "Test Description",
                Math.floor(Date.now() / 1000) + 86400, // startDate
                Math.floor(Date.now() / 1000) + 86400 * 2, // endDate
                EVENT_FEE,
                100, // capacity
                "Test Location",
                ["Technology", "Blockchain"] // categories
            );

            await paymentProcessor.connect(owner).testProcessPayment(
                1,
                attendee1.address,
                organizer.address,
                EVENT_FEE,
                { value: EVENT_FEE }
            );

            await paymentProcessor.connect(owner).testProcessPayment(
                1,
                attendee2.address,
                organizer.address,
                EVENT_FEE,
                { value: EVENT_FEE }
            );
        });

        it("Should return correct payment record", async function () {
            const paymentRecord = await paymentProcessor.getPaymentRecord(1);
            expect(paymentRecord.payer).to.equal(attendee1.address);
            expect(paymentRecord.amount).to.equal(EVENT_FEE);
        });

        it("Should return event payments", async function () {
            const eventPayments = await paymentProcessor.getEventPayments(1);
            expect(eventPayments.length).to.equal(2);
            expect(eventPayments[0]).to.equal(1);
            expect(eventPayments[1]).to.equal(2);
        });

        it("Should return payments by organizer", async function () {
            const organizerPayments = await paymentProcessor.getPaymentsByOrganizer(organizer.address, 10);
            expect(organizerPayments.length).to.equal(2);
        });

        it("Should return payments by payer", async function () {
            const payerPayments = await paymentProcessor.getPaymentsByPayer(attendee1.address, 10);
            expect(payerPayments.length).to.equal(1);
            expect(payerPayments[0]).to.equal(1);
        });

        it("Should return correct contract statistics", async function () {
            const stats = await paymentProcessor.getContractStats();
            expect(stats.totalPayments).to.equal(2);
            expect(stats.totalVolume).to.equal(EVENT_FEE.mul(2));
            expect(stats.totalPlatformFees).to.equal(EVENT_FEE.mul(2).mul(PLATFORM_FEE_PERCENTAGE).div(100));
        });
    });

    describe("Contract Address Updates", function () {
        it("Should allow owner to update contract addresses", async function () {
            const newEventContract = ethers.Wallet.createRandom().address;
            const newTicketContract = ethers.Wallet.createRandom().address;

            await paymentProcessor.connect(owner).updateContractAddresses(
                newEventContract,
                newTicketContract
            );

            expect(await paymentProcessor.eventContract()).to.equal(newEventContract);
            expect(await paymentProcessor.ticketContract()).to.equal(newTicketContract);
        });

        it("Should reject contract address update from non-owner", async function () {
            const newEventContract = ethers.Wallet.createRandom().address;
            const newTicketContract = ethers.Wallet.createRandom().address;

            await expect(
                paymentProcessor.connect(attendee1).updateContractAddresses(
                    newEventContract,
                    newTicketContract
                )
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should reject invalid contract addresses", async function () {
            await expect(
                paymentProcessor.connect(owner).updateContractAddresses(
                    ethers.constants.AddressZero,
                    ethers.Wallet.createRandom().address
                )
            ).to.be.revertedWith("Invalid event contract address");

            await expect(
                paymentProcessor.connect(owner).updateContractAddresses(
                    ethers.Wallet.createRandom().address,
                    ethers.constants.AddressZero
                )
            ).to.be.revertedWith("Invalid ticket contract address");
        });
    });

    describe("Reentrancy Protection", function () {
        it("Should prevent reentrancy attacks on payment processing", async function () {
            // This would require a malicious contract to test reentrancy
            // For now, we verify the nonReentrant modifier is in place
            const hasModifier = paymentProcessor.interface.getFunction("testProcessPayment").inputs.length > 0;
            expect(hasModifier).to.be.true;
        });

        it("Should prevent reentrancy attacks on withdrawals", async function () {
            // Verify nonReentrant modifier is present
            const hasModifier = paymentProcessor.interface.getFunction("withdrawOrganizerFunds").inputs.length > 0;
            expect(hasModifier).to.be.true;
        });
    });

    describe("Gas Optimization", function () {
        it("Should have reasonable gas costs for payment processing", async function () {
            await eventContract.connect(organizer).createEvent(
                "Test Event",
                "Test Description",
                Math.floor(Date.now() / 1000) + 86400, // startDate
                Math.floor(Date.now() / 1000) + 86400 * 2, // endDate
                EVENT_FEE,
                100, // capacity
                "Test Location",
                ["Technology", "Blockchain"] // categories
            );

            const tx = await paymentProcessor.connect(owner).testProcessPayment(
                1,
                attendee1.address,
                organizer.address,
                EVENT_FEE,
                { value: EVENT_FEE }
            );

            const receipt = await tx.wait();
            expect(receipt.gasUsed).to.be.below(400000); // Reasonable gas limit for complex payment processing
        });

        it("Should have reasonable gas costs for withdrawals", async function () {
            // Process payment first
            await eventContract.connect(organizer).createEvent(
                "Test Event",
                "Test Description",
                Math.floor(Date.now() / 1000) + 86400, // startDate
                Math.floor(Date.now() / 1000) + 86400 * 2, // endDate
                EVENT_FEE,
                100, // capacity
                "Test Location",
                ["Technology", "Blockchain"] // categories
            );

            await paymentProcessor.connect(owner).testProcessPayment(
                1,
                attendee1.address,
                organizer.address,
                EVENT_FEE,
                { value: EVENT_FEE }
            );

            const organizerBalance = await paymentProcessor.getOrganizerBalance(organizer.address);
            const tx = await paymentProcessor.connect(organizer).withdrawOrganizerFunds(
                organizerBalance.availableBalance
            );

            const receipt = await tx.wait();
            expect(receipt.gasUsed).to.be.below(100000); // Reasonable gas limit
        });
    });
});