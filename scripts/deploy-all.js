const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying all contracts...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy EventContract
  console.log("\n1. Deploying EventContract...");
  const EventContract = await ethers.getContractFactory("EventContract");
  const eventContract = await EventContract.deploy();
  await eventContract.deployed();
  console.log("EventContract deployed to:", eventContract.address);

  // Deploy TicketNFT
  console.log("\n2. Deploying TicketNFT...");
  const TicketNFT = await ethers.getContractFactory("TicketNFT");
  const ticketNFT = await TicketNFT.deploy();
  await ticketNFT.deployed();
  console.log("TicketNFT deployed to:", ticketNFT.address);

  // Deploy PaymentProcessor
  console.log("\n3. Deploying PaymentProcessor...");
  const PaymentProcessor = await ethers.getContractFactory("PaymentProcessor");
  const paymentProcessor = await PaymentProcessor.deploy(
    eventContract.address,
    ticketNFT.address
  );
  await paymentProcessor.deployed();
  console.log("PaymentProcessor deployed to:", paymentProcessor.address);

  // Update .env file
  console.log("\n4. Updating .env file...");
  const envPath = path.join(__dirname, "..", "backend", ".env");
  let envContent = fs.readFileSync(envPath, "utf8");

  // Replace contract addresses
  envContent = envContent.replace(
    /EVENTCONTRACT_ADDRESS=.*/,
    `EVENTCONTRACT_ADDRESS=${eventContract.address}`
  );
  envContent = envContent.replace(
    /PAYMENTPROCESSOR_ADDRESS=.*/,
    `PAYMENTPROCESSOR_ADDRESS=${paymentProcessor.address}`
  );
  envContent = envContent.replace(
    /TICKETNFT_ADDRESS=.*/,
    `TICKETNFT_ADDRESS=${ticketNFT.address}`
  );

  fs.writeFileSync(envPath, envContent);
  console.log("Updated .env file with contract addresses");

  // Test deployment by creating a sample event
  console.log("\n5. Testing deployment...");
  const tx = await eventContract.createEvent(
    "Test Event",
    "A test event for deployment verification",
    Math.floor(Date.now() / 1000) + 86400, // Start tomorrow
    Math.floor(Date.now() / 1000) + 86400 * 2, // End day after tomorrow
    ethers.utils.parseEther("0.01"), // 0.01 ETH ticket price
    100, // Capacity
    "Virtual",
    ["Technology", "Testing"]
  );
  await tx.wait();
  console.log("Test event created successfully!");

  console.log("\n✅ All contracts deployed successfully!");
  console.log("Contract addresses:");
  console.log("- EventContract:", eventContract.address);
  console.log("- PaymentProcessor:", paymentProcessor.address);
  console.log("- TicketNFT:", ticketNFT.address);

  return {
    eventContract: eventContract.address,
    paymentProcessor: paymentProcessor.address,
    ticketNFT: ticketNFT.address
  };
}

main()
  .then((addresses) => {
    console.log("\n🎉 Deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });