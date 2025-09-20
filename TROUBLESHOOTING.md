# Troubleshooting Guide - Event & NFT Ticket Creation

## Common Issues and Solutions

### 1. Contract Deployment Issues

**Problem**: Contracts fail to deploy or aren't properly configured
**Solution**:
```bash
# Clean and redeploy
npm run clean
npm run compile
npm run deploy:local
```

**Problem**: Contract addresses not found in .env
**Solution**: Check that `backend/.env` contains the contract addresses after deployment:
```
EVENTCONTRACT_ADDRESS=0x...
PAYMENTPROCESSOR_ADDRESS=0x...
TICKETNFT_ADDRESS=0x...
```

### 2. Event Creation Issues

**Problem**: Events not creating on blockchain
**Solution**:
1. Ensure Hardhat node is running: `npm run node`
2. Check contract deployment: `npm run test:contracts`
3. Verify backend blockchain connection in logs

**Problem**: "Contract not loaded" error
**Solution**:
1. Check contract addresses in `backend/.env`
2. Restart backend server
3. Verify contracts are deployed: `npm run test:contracts`

### 3. NFT Ticket Minting Issues

**Problem**: Tickets not minting during event registration
**Solution**:
1. Verify contracts are properly linked:
   - EventContract has PaymentProcessor and TicketNFT addresses
   - TicketNFT has EventContract address
2. Check transaction logs for errors
3. Ensure sufficient ETH balance for gas fees

**Problem**: "Only EventContract can call this function" error
**Solution**: Contracts need to be configured to work together. Run deployment script again.

### 4. Frontend Integration Issues

**Problem**: MetaMask not connecting
**Solution**:
1. Install MetaMask browser extension
2. Connect to localhost:8545 network
3. Import test account with private key from Hardhat

**Problem**: Transaction failures in frontend
**Solution**:
1. Check MetaMask is connected to correct network
2. Ensure sufficient ETH balance
3. Check browser console for errors

### 5. Backend API Issues

**Problem**: "Blockchain not connected" warnings
**Solution**:
1. Start Hardhat node: `npm run node`
2. Check RPC URL in `backend/.env`: `BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545`
3. Restart backend server

**Problem**: Authentication errors
**Solution**:
1. Register/login through frontend
2. Check JWT token in browser localStorage
3. Verify backend is running on port 5000

## Testing the Complete Flow

### 1. Test Contract Deployment
```bash
npm run deploy:local
npm run test:contracts
```

### 2. Test Backend API
```bash
cd backend
python test_event_api.py
```

### 3. Test Frontend Integration
```bash
python test_frontend_integration.py
```

## Manual Testing Steps

### 1. Create Event
1. Login to frontend
2. Navigate to "Create Event" page
3. Fill form and submit
4. Check event appears in events list

### 2. Purchase Ticket (Register for Event)
1. Connect MetaMask wallet
2. Navigate to events page
3. Click "Buy Ticket" on an event
4. Confirm MetaMask transaction
5. Verify NFT ticket is minted

### 3. Verify NFT Ownership
1. Check MetaMask for NFT (if supported)
2. Use blockchain explorer to verify transaction
3. Call `getTicketsByOwner` function on TicketNFT contract

## Environment Setup Checklist

- [ ] Node.js and npm installed
- [ ] Python 3.7+ installed
- [ ] Hardhat node running (`npm run node`)
- [ ] Contracts compiled (`npm run compile`)
- [ ] Contracts deployed (`npm run deploy:local`)
- [ ] Backend server running (`python backend/app.py`)
- [ ] Frontend accessible (open `frontend/index.html`)
- [ ] MetaMask installed and configured

## Contract Addresses

After successful deployment, verify these addresses exist in `backend/.env`:

```
EVENTCONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
PAYMENTPROCESSOR_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
TICKETNFT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

## Test Accounts

Default Hardhat accounts for testing:
- Account 0: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` (Deployer)
- Account 1: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` (Test User)

Private keys available in Hardhat node output.

## Getting Help

If issues persist:
1. Check Hardhat node logs for errors
2. Check backend server logs
3. Check browser console for frontend errors
4. Verify all dependencies are installed
5. Try restarting all services