const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying EventContract...");

  // Get the contract factory
  const EventContract = await ethers.getContractFactory("EventContract");

  // Deploy the contract
  const eventContract = await EventContract.deploy();

  // Wait for deployment to complete
  await eventContract.deployed();

  console.log("EventContract deployed to:", eventContract.address);

  // Verify deployment by calling a simple function
  const eventCount = await eventContract.eventCount();
  console.log("Initial event count:", eventCount.toString());

  // Create a sample event to test deployment
  console.log("Creating sample event...");

  const categories = ["Technology", "Networking"];
  const tx = await eventContract.createEvent(
    "Sample Hackathon Event",
    "A sample event for testing the EventContract deployment",
    Math.floor(Date.now() / 1000) + 86400, // Start tomorrow
    Math.floor(Date.now() / 1000) + 86400 * 2, // End day after tomorrow
    ethers.utils.parseEther("0.01"), // 0.01 ETH ticket price
    100, // Capacity
    "Virtual",
    categories
  );

  await tx.wait();
  console.log("Sample event created successfully!");

  // Get the event details
  const eventDetails = await eventContract.getEvent(1);
  console.log("Sample event details:", {
    id: eventDetails.id.toString(),
    title: eventDetails.title,
    capacity: eventDetails.capacity.toString(),
    ticketPrice: ethers.utils.formatEther(eventDetails.ticketPrice),
    isActive: eventDetails.isActive
  });

  return eventContract.address;
}

main()
  .then((address) => {
    console.log("Deployment completed successfully!");
    console.log("Contract address:", address);
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });