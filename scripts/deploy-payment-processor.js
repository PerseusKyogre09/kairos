const { ethers } = require("hardhat");

async function main() {
    console.log("Deploying PaymentProcessor contract...");

    // Get the contract factories
    const EventContract = await ethers.getContractFactory("EventContract");
    const TicketNFT = await ethers.getContractFactory("TicketNFT");
    const PaymentProcessor = await ethers.getContractFactory("PaymentProcessor");

    // Deploy EventContract first
    console.log("Deploying EventContract...");
    const eventContract = await EventContract.deploy();
    await eventContract.deployed();
    console.log("EventContract deployed to:", eventContract.address);

    // Deploy TicketNFT with EventContract address
    console.log("Deploying TicketNFT...");
    const ticketContract = await TicketNFT.deploy();
    await ticketContract.deployed();
    console.log("TicketNFT deployed to:", ticketContract.address);

    // Deploy PaymentProcessor with both contract addresses
    console.log("Deploying PaymentProcessor...");
    const paymentProcessor = await PaymentProcessor.deploy(
        eventContract.address,
        ticketContract.address
    );
    await paymentProcessor.deployed();
    console.log("PaymentProcessor deployed to:", paymentProcessor.address);

    // Verify deployment
    console.log("\n=== Deployment Summary ===");
    console.log("EventContract:", eventContract.address);
    console.log("TicketNFT:", ticketContract.address);
    console.log("PaymentProcessor:", paymentProcessor.address);

    // Get deployment costs
    const eventContractReceipt = await eventContract.deployTransaction.wait();
    const ticketContractReceipt = await ticketContract.deployTransaction.wait();
    const paymentProcessorReceipt = await paymentProcessor.deployTransaction.wait();

    console.log("\n=== Gas Costs ===");
    console.log("EventContract deployment gas:", eventContractReceipt.gasUsed.toString());
    console.log("TicketNFT deployment gas:", ticketContractReceipt.gasUsed.toString());
    console.log("PaymentProcessor deployment gas:", paymentProcessorReceipt.gasUsed.toString());

    // Save deployment addresses for verification
    const deploymentInfo = {
        eventContract: eventContract.address,
        ticketContract: ticketContract.address,
        paymentProcessor: paymentProcessor.address,
        network: network.name,
        timestamp: new Date().toISOString()
    };

    console.log("\n=== Contract Addresses ===");
    console.log(JSON.stringify(deploymentInfo, null, 2));

    // Verify contract sizes
    const eventContractSize = await ethers.provider.getCode(eventContract.address);
    const ticketContractSize = await ethers.provider.getCode(ticketContract.address);
    const paymentProcessorSize = await ethers.provider.getCode(paymentProcessor.address);

    console.log("\n=== Contract Sizes (bytes) ===");
    console.log("EventContract:", (eventContractSize.length - 2) / 2);
    console.log("TicketNFT:", (ticketContractSize.length - 2) / 2);
    console.log("PaymentProcessor:", (paymentProcessorSize.length - 2) / 2);

    console.log("\n✅ All contracts deployed successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Deployment failed:", error);
        process.exit(1);
    });