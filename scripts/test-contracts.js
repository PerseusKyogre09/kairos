const { ethers } = require("hardhat");

async function main() {
  console.log("Testing contract deployment and configuration...");

  // Get the deployer account
  const [deployer, user1] = await ethers.getSigners();
  console.log("Testing with account:", deployer.address);
  console.log("User account:", user1.address);

  // Get contract addresses from environment
  const eventContractAddress = process.env.EVENTCONTRACT_ADDRESS;
  const paymentProcessorAddress = process.env.PAYMENTPROCESSOR_ADDRESS;
  const ticketNFTAddress = process.env.TICKETNFT_ADDRESS;

  if (!eventContractAddress || !paymentProcessorAddress || !ticketNFTAddress) {
    console.error("Contract addresses not found in environment variables");
    console.log("Please run 'npm run deploy' first");
    return;
  }

  // Get contract instances
  const EventContract = await ethers.getContractFactory("EventContract");
  const PaymentProcessor = await ethers.getContractFactory("PaymentProcessor");
  const TicketNFT = await ethers.getContractFactory("TicketNFT");

  const eventContract = EventContract.attach(eventContractAddress);
  const paymentProcessor = PaymentProcessor.attach(paymentProcessorAddress);
  const ticketNFT = TicketNFT.attach(ticketNFTAddress);

  console.log("\n=== Testing Contract Configuration ===");

  // Test 1: Check if contracts are properly configured
  try {
    const eventContractPaymentProcessor = await eventContract.paymentProcessor();
    const eventContractTicketNFT = await eventContract.ticketNFT();
    
    console.log("EventContract PaymentProcessor:", eventContractPaymentProcessor);
    console.log("EventContract TicketNFT:", eventContractTicketNFT);
    
    if (eventContractPaymentProcessor.toLowerCase() === paymentProcessorAddress.toLowerCase()) {
      console.log("✓ EventContract properly configured with PaymentProcessor");
    } else {
      console.log("✗ EventContract not configured with PaymentProcessor");
    }
    
    if (eventContractTicketNFT.toLowerCase() === ticketNFTAddress.toLowerCase()) {
      console.log("✓ EventContract properly configured with TicketNFT");
    } else {
      console.log("✗ EventContract not configured with TicketNFT");
    }
  } catch (error) {
    console.log("✗ Error checking EventContract configuration:", error.message);
  }

  // Test 2: Create a test event
  console.log("\n=== Testing Event Creation ===");
  try {
    const tx = await eventContract.createEvent(
      "Test Event",
      "A test event for verification",
      Math.floor(Date.now() / 1000) + 86400, // Start tomorrow
      Math.floor(Date.now() / 1000) + 86400 * 2, // End day after tomorrow
      ethers.utils.parseEther("0.01"), // 0.01 ETH ticket price
      100, // Capacity
      "Virtual",
      ["Technology", "Testing"]
    );
    await tx.wait();
    
    const eventCount = await eventContract.eventCount();
    console.log("✓ Test event created successfully! Event ID:", eventCount.toString());
    
    // Get event details
    const eventDetails = await eventContract.getEvent(eventCount);
    console.log("Event details:", {
      id: eventDetails.id.toString(),
      title: eventDetails.title,
      ticketPrice: ethers.utils.formatEther(eventDetails.ticketPrice),
      capacity: eventDetails.capacity.toString(),
      organizer: eventDetails.organizer
    });
    
    return eventCount;
  } catch (error) {
    console.log("✗ Error creating test event:", error.message);
    return null;
  }
}

async function testEventRegistration(eventId) {
  if (!eventId) return;
  
  console.log("\n=== Testing Event Registration ===");
  
  const [deployer, user1] = await ethers.getSigners();
  const eventContractAddress = process.env.EVENTCONTRACT_ADDRESS;
  
  const EventContract = await ethers.getContractFactory("EventContract");
  const eventContract = EventContract.attach(eventContractAddress);
  
  try {
    // Get event details
    const eventDetails = await eventContract.getEvent(eventId);
    const ticketPrice = eventDetails.ticketPrice;
    
    console.log("Registering user for event ID:", eventId.toString());
    console.log("Ticket price:", ethers.utils.formatEther(ticketPrice), "ETH");
    
    // Register user1 for the event
    const tx = await eventContract.connect(user1).registerForEvent(eventId, {
      value: ticketPrice
    });
    const receipt = await tx.wait();
    
    console.log("✓ User registered successfully!");
    console.log("Transaction hash:", receipt.transactionHash);
    console.log("Gas used:", receipt.gasUsed.toString());
    
    // Check if user is registered
    const isRegistered = await eventContract.isUserRegistered(eventId, user1.address);
    console.log("✓ User registration confirmed:", isRegistered);
    
    // Check event registration count
    const updatedEventDetails = await eventContract.getEvent(eventId);
    console.log("✓ Event registered count:", updatedEventDetails.registeredCount.toString());
    
  } catch (error) {
    console.log("✗ Error during event registration:", error.message);
  }
}

main()
  .then(async (eventId) => {
    if (eventId) {
      await testEventRegistration(eventId);
    }
    console.log("\n🎉 Contract testing completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Contract testing failed:", error);
    process.exit(1);
  });