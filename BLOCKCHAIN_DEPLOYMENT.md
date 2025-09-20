# Blockchain Deployment Configuration

## Issue: Blockchain Not Connected in Render Deployment

Your application works with Hardhat locally but blockchain features don't work in Render deployment because the blockchain configuration defaults to localhost.

## Solution: Configure Blockchain for Production

### Step 1: Choose a Blockchain Network

For production deployment, you need to connect to a real blockchain network:

**Testnets (recommended for development):**
- **Sepolia** (Ethereum testnet) - Most stable
- **Mumbai** (Polygon testnet) - Faster, cheaper transactions

**Mainnets (for production):**
- **Ethereum Mainnet**
- **Polygon Mainnet**

### Step 2: Get RPC Access

You need an RPC provider to connect to the blockchain:

#### Option A: Infura (Recommended)
1. Go to [infura.io](https://infura.io) and create a free account
2. Create a new project
3. Copy your **Project ID**

#### Option B: Alchemy
1. Go to [alchemy.com](https://alchemy.com) and create a free account
2. Create a new app
3. Copy your **API Key**

#### Option C: Public RPCs (Less Reliable)
- Sepolia: `https://rpc.sepolia.org`
- Mumbai: `https://rpc-mumbai.maticvigil.com`

### Step 3: Set Environment Variables in Render

In your Render dashboard, go to your service settings and add these environment variables:

#### Required Variables:
```env
BLOCKCHAIN_NETWORK=sepolia
INFURA_PROJECT_ID=your-infura-project-id-here
BLOCKCHAIN_PRIVATE_KEY=your-private-key-for-transactions
```

#### Optional Variables:
```env
BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/your-project-id
EVENTCONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
PAYMENTPROCESSOR_ADDRESS=0x0000000000000000000000000000000000000000
TICKETNFT_ADDRESS=0x0000000000000000000000000000000000000000
```

### Step 4: Deploy Contracts (If Needed)

If you haven't deployed your smart contracts to the testnet:

1. **Switch Hardhat network** in `hardhat.config.js`:
   ```javascript
   networks: {
     sepolia: {
       url: `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
       accounts: [process.env.PRIVATE_KEY]
     }
   }
   ```

2. **Deploy contracts**:
   ```bash
   npx hardhat run scripts/deploy.js --network sepolia
   ```

3. **Update contract addresses** in Render environment variables

### Step 5: Test Blockchain Connection

After deployment, check your application logs to see:
```
INFO: Connected to blockchain network: sepolia (Chain ID: 11155111)
```

If you see "running in offline mode", the blockchain connection failed.

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `BLOCKCHAIN_NETWORK` | Network name | `sepolia`, `mumbai`, `mainnet` |
| `INFURA_PROJECT_ID` | Your Infura project ID | `abc123...` |
| `BLOCKCHAIN_RPC_URL` | Direct RPC URL | `https://sepolia.infura.io/v3/...` |
| `BLOCKCHAIN_PRIVATE_KEY` | Private key for transactions | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| `EVENTCONTRACT_ADDRESS` | Deployed EventContract address | `0x1234...` |
| `PAYMENTPROCESSOR_ADDRESS` | Deployed PaymentProcessor address | `0x5678...` |
| `TICKETNFT_ADDRESS` | Deployed TicketNFT address | `0x9abc...` |

## Troubleshooting

### "running in offline mode"
- Check your `INFURA_PROJECT_ID` is correct
- Verify the network name matches (case-sensitive)
- Make sure your IP isn't blocked by the RPC provider

### "Invalid RPC URL"
- Ensure the RPC URL is accessible
- Check if you need API keys in the URL
- Try a different RPC provider

### Contract interactions failing
- Verify contract addresses are correct for the network
- Check if contracts are actually deployed on that network
- Ensure your private key has enough testnet ETH/MATIC

### Rate limiting
- Free RPC plans have rate limits
- Consider upgrading to paid plans for production

## Security Notes

- **Never commit private keys** to version control
- Use environment variables for all sensitive data
- Consider using a dedicated wallet for deployment
- Rotate keys regularly
- Monitor gas usage and transaction costs

## Cost Considerations

**Free Tiers:**
- Infura: 100,000 requests/day
- Alchemy: 300M compute units/month
- Public RPCs: Limited reliability

**Paid Plans:** Start at $20-50/month for higher limits.

For production, consider dedicated RPC services or running your own nodes.