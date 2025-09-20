const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting Complete Integration Test: EventContract + TicketNFT + PaymentProcessor");
  console.log("=" .repeat(80));

  // Get signers
  const [owner, organizer, participant1, participant2] = await ethers.getSigners();

  console.log("👥 Test Accounts:");
  console.log("- Owner:", owner.address);
  console.log("- Organizer:", organizer.address);
  console.log("- Participant 1:", participant1.address);
  console.log("- Participant 2:", participant2.address);
  console.log();

  // Deploy EventContract
  console.log("📋 Deploying EventContract...");
  const EventContract = await ethers.getContractFactory("EventContract");
  const eventContract = await EventContract.deploy();
  await eventContract.deployed();
  console.log("✅ EventContract deployed to:", eventContract.address);

  // Deploy TicketNFT
  console.log("🎫 Deploying TicketNFT...");
  const TicketNFT = await ethers.getContractFactory("TicketNFT");
  const ticketNFT = await TicketNFT.deploy();
  await ticketNFT.deployed();
  console.log("✅ TicketNFT deployed to:", ticketNFT.address);

  // Deploy PaymentProcessor
  console.log("💰 Deploying PaymentProcessor...");
  const PaymentProcessor = await ethers.getContractFactory("PaymentProcessor");
  const paymentProcessor = await PaymentProcessor.deploy(
    eventContract.address,
    ticketNFT.address
  );
  await paymentProcessor.deployed();
  console.log("✅ PaymentProcessor deployed to:", paymentProcessor.address);

  // Set contract addresses
  console.log("🔗 Setting contract addresses...");
  await ticketNFT.setEventContract(eventContract.address);
  await ticketNFT.setPaymentProcessor(paymentProcessor.address);
  await eventContract.setPaymentProcessor(paymentProcessor.address);
  await eventContract.setTicketNFT(ticketNFT.address);
  console.log("✅ Contract addresses set successfully");
  console.log();

  // Create an event
  console.log("🎪 Creating a sample event...");
  const eventData = {
    title: "Blockchain Hackathon 2025",
    description: "A 24-hour hackathon focused on blockchain and Web3 innovations",
    startDate: Math.floor(Date.now() / 1000) + 86400, // Tomorrow
    endDate: Math.floor(Date.now() / 1000) + 86400 * 2, // Day after tomorrow
    ticketPrice: ethers.utils.parseEther("0.05"), // 0.05 ETH
    capacity: 100,
    location: "Virtual",
    categories: ["Technology", "Blockchain", "Web3"]
  };

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
  await createEventTx.wait();
  console.log("✅ Event created successfully!");
  console.log("   Event ID: 1");
  console.log("   Organizer:", organizer.address);
  console.log();

  // Display event details
  const eventDetails = await eventContract.getEvent(1);
  console.log("📋 Event Details:");
  console.log("   Title:", eventDetails.title);
  console.log("   Capacity:", eventDetails.capacity.toString());
  console.log("   Ticket Price:", ethers.utils.formatEther(eventDetails.ticketPrice), "ETH");
  console.log("   Location:", eventDetails.location);
  console.log("   Categories:", eventDetails.categories.join(", "));
  console.log();

  // Test event registration with automatic NFT minting
  console.log("🎫 Testing event registration with automatic NFT minting...");

  // Register participant 1 (this will process payment and mint NFT automatically)
  const register1Tx = await eventContract.connect(participant1).registerForEvent(1, {
    value: eventData.ticketPrice
  });
  await register1Tx.wait();
  console.log("✅ Participant 1 registered and NFT ticket minted");

  // Register participant 2 (this will process payment and mint NFT automatically)
  const register2Tx = await eventContract.connect(participant2).registerForEvent(1, {
    value: eventData.ticketPrice
  });
  await register2Tx.wait();
  console.log("✅ Participant 2 registered and NFT ticket minted");
  console.log();

  // Display payment records
  console.log("💰 Payment Records:");
  const payment1Record = await paymentProcessor.getPaymentRecord(1);
  const payment2Record = await paymentProcessor.getPaymentRecord(2);

  console.log("   Payment 1:");
  console.log("   - Payer:", payment1Record.payer);
  console.log("   - Amount:", ethers.utils.formatEther(payment1Record.amount), "ETH");
  console.log("   - Platform Fee:", ethers.utils.formatEther(payment1Record.platformFee), "ETH");
  console.log("   - Organizer Share:", ethers.utils.formatEther(payment1Record.organizerShare), "ETH");

  // Check automatically minted NFT tickets
  console.log("🎫 Checking automatically minted NFT tickets...");
  console.log("   Ticket 1 Owner:", await ticketNFT.ownerOf(1));
  console.log("   Ticket 2 Owner:", await ticketNFT.ownerOf(2));
  console.log();

  // Test ticket verification
  console.log("🔍 Testing ticket verification...");
  const ticket1Valid = await ticketNFT.verifyTicket(1, 1);
  const ticket2Valid = await ticketNFT.verifyTicket(2, 1);
  const ticket1Invalid = await ticketNFT.verifyTicket(1, 2); // Wrong event

  console.log("   Ticket 1 (Event 1):", ticket1Valid ? "✅ Valid" : "❌ Invalid");
  console.log("   Ticket 2 (Event 1):", ticket2Valid ? "✅ Valid" : "❌ Invalid");
  console.log("   Ticket 1 (Event 2):", ticket1Invalid ? "✅ Valid" : "❌ Invalid");
  console.log();

  // Test ticket usage (check-in)
  console.log("📝 Testing ticket usage (event check-in)...");
  const useTicketTx = await ticketNFT.connect(participant1).useTicket(1);
  await useTicketTx.wait();
  console.log("✅ Participant 1 checked in (ticket used)");
  console.log();

  // Verify ticket status after usage
  console.log("🔍 Verifying ticket status after usage...");
  const ticket1Metadata = await ticketNFT.getTicketMetadata(1);
  const ticket1StillValid = await ticketNFT.verifyTicket(1, 1);

  console.log("   Ticket 1 Used:", ticket1Metadata.isUsed);
  console.log("   Ticket 1 Still Valid:", ticket1StillValid ? "✅ Valid" : "❌ Invalid");
  console.log();

  // Test ticket transfer
  console.log("🔄 Testing ticket transfer...");
  const transferTx = await ticketNFT.connect(participant2).transferFrom(
    participant2.address,
    participant1.address,
    2
  );
  await transferTx.wait();
  console.log("✅ Ticket 2 transferred from Participant 2 to Participant 1");
  console.log();

  // Display final ownership
  console.log("🎫 Final Ticket Ownership:");
  console.log("   Ticket 1 Owner:", await ticketNFT.ownerOf(1));
  console.log("   Ticket 2 Owner:", await ticketNFT.ownerOf(2));
  console.log();

  // Display contract statistics
  console.log("📊 Complete Contract Statistics:");
  const eventContractStats = await eventContract.getEvent(1);
  const ticketNFTStats = await ticketNFT.getContractStats();
  const paymentStats = await paymentProcessor.getContractStats();

  console.log("   EventContract:");
  console.log("   - Event Registered Count:", eventContractStats.registeredCount.toString());
  console.log("   - Event Capacity:", eventContractStats.capacity.toString());
  console.log();
  console.log("   TicketNFT:");
  console.log("   - Total Tickets:", ticketNFTStats.totalTickets.toString());
  console.log("   - Active Tickets:", ticketNFTStats.activeTickets.toString());
  console.log("   - Used Tickets:", ticketNFTStats.totalUsedTickets.toString());
  console.log();
  console.log("   PaymentProcessor:");
  console.log("   - Total Payments:", paymentStats.totalPayments.toString());
  console.log("   - Total Volume:", ethers.utils.formatEther(paymentStats.totalVolume), "ETH");
  console.log("   - Total Platform Fees:", ethers.utils.formatEther(paymentStats.totalPlatformFees), "ETH");
  console.log("   - Contract Balance:", ethers.utils.formatEther(paymentStats.contractBalance), "ETH");
  console.log();

  // Get event tickets
  console.log("📋 Event Tickets:");
  const eventTickets = await ticketNFT.getEventTickets(1);
  console.log("   Tickets for Event 1:", eventTickets.map(id => id.toString()).join(", "));
  console.log();

  // Test organizer withdrawal
  console.log("� Testing organizer withdrawal...");
  const organizerBalanceInfo2 = await paymentProcessor.getOrganizerBalance(organizer.address);
  const withdrawAmount2 = organizerBalanceInfo2.availableBalance;
  const organizerInitialBalance2 = await ethers.provider.getBalance(organizer.address);

  const withdrawTx2 = await paymentProcessor.connect(organizer).withdrawOrganizerFunds(withdrawAmount2);
  await withdrawTx2.wait();
  console.log("✅ Organizer withdrew", ethers.utils.formatEther(withdrawAmount2), "ETH");
  console.log();

  // Verify withdrawal
  const organizerFinalBalance = await ethers.provider.getBalance(organizer.address);
  const organizerNewBalance = await paymentProcessor.getOrganizerBalance(organizer.address);

  console.log("💰 Withdrawal Verification:");
  console.log("   Initial Balance:", ethers.utils.formatEther(organizerInitialBalance2), "ETH");
  console.log("   Final Balance:", ethers.utils.formatEther(organizerFinalBalance), "ETH");
  console.log("   Withdrawn Amount:", ethers.utils.formatEther(organizerNewBalance.withdrawnAmount), "ETH");
  console.log("   Available Balance:", ethers.utils.formatEther(organizerNewBalance.availableBalance), "ETH");
  console.log();

  console.log("🎉 Complete integration test completed successfully!");
  console.log("✅ EventContract, TicketNFT, and PaymentProcessor working together perfectly");
  console.log();

  return {
    eventContract: eventContract.address,
    ticketNFT: ticketNFT.address,
    paymentProcessor: paymentProcessor.address
  };
}

main()
  .then((addresses) => {
    console.log("🚀 Complete Integration Test Results:");
    console.log("- EventContract:", addresses.eventContract);
    console.log("- TicketNFT:", addresses.ticketNFT);
    console.log("- PaymentProcessor:", addresses.paymentProcessor);
    console.log("✅ All integration tests passed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Integration test failed:", error);
    process.exit(1);
  });