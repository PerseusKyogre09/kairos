const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying TicketNFT...");

  // Get the contract factory
  const TicketNFT = await ethers.getContractFactory("TicketNFT");

  // Deploy the contract
  const ticketNFT = await TicketNFT.deploy();

  // Wait for deployment to complete
  await ticketNFT.deployed();

  console.log("TicketNFT deployed to:", ticketNFT.address);

  // Verify deployment by calling basic functions
  const name = await ticketNFT.name();
  const symbol = await ticketNFT.symbol();
  const totalSupply = await ticketNFT.totalSupply();

  console.log("Contract Details:");
  console.log("- Name:", name);
  console.log("- Symbol:", symbol);
  console.log("- Initial Total Supply:", totalSupply.toString());

  // Create a sample ticket to test deployment
  console.log("Creating sample ticket...");

  const sampleMetadata = {
    to: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // First Hardhat account
    eventId: 1,
    eventContract: "0x1234567890123456789012345678901234567890",
    seatInfo: "VIP-A1",
    ticketType: "VIP",
    metadataURI: "https://example.com/ticket/1"
  };

  const tx = await ticketNFT.mintTicket(
    sampleMetadata.to,
    sampleMetadata.eventId,
    sampleMetadata.eventContract,
    sampleMetadata.seatInfo,
    sampleMetadata.ticketType,
    sampleMetadata.metadataURI
  );

  await tx.wait();
  console.log("Sample ticket minted successfully!");

  // Verify the ticket was created
  const ownerOf = await ticketNFT.ownerOf(1);
  const tokenURI = await ticketNFT.tokenURI(1);
  const metadata = await ticketNFT.getTicketMetadata(1);

  console.log("Sample Ticket Details:");
  console.log("- Token ID: 1");
  console.log("- Owner:", ownerOf);
  console.log("- Token URI:", tokenURI);
  console.log("- Event ID:", metadata.eventId.toString());
  console.log("- Seat Info:", metadata.seatInfo);
  console.log("- Ticket Type:", metadata.ticketType);
  console.log("- Is Active:", metadata.isActive);
  console.log("- Is Used:", metadata.isUsed);

  // Test ticket verification
  const isValid = await ticketNFT.verifyTicket(1, 1);
  console.log("- Ticket Verification (Event 1):", isValid);

  const isInvalid = await ticketNFT.verifyTicket(1, 2);
  console.log("- Ticket Verification (Event 2):", isInvalid);

  return ticketNFT.address;
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