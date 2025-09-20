# BlockEvent Deployment Guide

This guide will help you deploy BlockEvent using Vercel (frontend), Supabase (database), and Render (backend).

## Prerequisites

- GitHub account
- Vercel account
- Supabase account  
- Render account
- Infura account (for blockchain connectivity)
- OpenAI account (for AI features)

## Step 1: Database Setup (Supabase)

1. **Create a new Supabase project**
   - Go to [supabase.com](https://supabase.com)
   - Click "New Project"
   - Choose your organization and set project details

2. **Set up the database**
   - Go to SQL Editor in your Supabase dashboard
   - Copy and paste the contents of `supabase_setup.sql`
   - Run the SQL to create all tables and indexes

3. **Get your credentials**
   - Go to Settings > API
   - Copy your `Project URL` and `anon public` key
   - Go to Settings > Database
   - Copy your `Connection string`

## Step 2: Backend Deployment (Render)

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Create a new Web Service on Render**
   - Go to [render.com](https://render.com)
   - Click "New" > "Web Service"
   - Connect your GitHub repository
   - Use these settings:
     - **Name**: `blockevent-backend`
     - **Environment**: `Python 3`
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `gunicorn --bind 0.0.0.0:$PORT backend.app:app`

3. **Set Environment Variables**
   Add these environment variables in Render:
   ```
   DATABASE_URL=your-supabase-connection-string
   SUPABASE_URL=your-supabase-project-url
   SUPABASE_KEY=your-supabase-anon-key
   JWT_SECRET_KEY=your-random-secret-key
   FLASK_ENV=production
   BLOCKCHAIN_NETWORK=sepolia
   INFURA_PROJECT_ID=your-infura-project-id
   PRIVATE_KEY=your-wallet-private-key
   OPENAI_API_KEY=your-openai-api-key
   FRONTEND_URL=https://your-vercel-app.vercel.app
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Wait for the build to complete
   - Note your backend URL (e.g., `https://blockevent-backend.onrender.com`)

## Step 3: Frontend Deployment (Vercel)

1. **Update frontend configuration**
   - Update `frontend/js/config.js` with your backend URL:
   ```javascript
   API_BASE_URL: 'https://your-backend-app.onrender.com'
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will automatically detect the configuration from `vercel.json`
   - Click "Deploy"

3. **Configure Custom Domain (Optional)**
   - Go to your project settings in Vercel
   - Add your custom domain
   - Update DNS records as instructed

## Step 4: Blockchain Setup

1. **Get Infura Project ID**
   - Go to [infura.io](https://infura.io)
   - Create a new project
   - Copy your Project ID

2. **Set up Wallet**
   - Create a new wallet for deployment (don't use your main wallet)
   - Get some Sepolia testnet ETH from a faucet
   - Add the private key to your Render environment variables

3. **Deploy Smart Contracts**
   - Update `scripts/deploy-all.js` with your network settings
   - Run deployment from your local machine:
   ```bash
   npm install
   npx hardhat run scripts/deploy-all.js --network sepolia
   ```

## Step 5: Final Configuration

1. **Update CORS settings**
   - Make sure your backend allows requests from your Vercel domain
   - Update the `FRONTEND_URL` environment variable in Render

2. **Test the deployment**
   - Visit your Vercel URL
   - Test user registration and login
   - Test wallet connection
   - Test event creation and ticket purchasing

## Environment Variables Summary

### Render (Backend)
```
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_KEY=eyJ...
JWT_SECRET_KEY=your-secret
FLASK_ENV=production
BLOCKCHAIN_NETWORK=sepolia
INFURA_PROJECT_ID=your-id
PRIVATE_KEY=0x...
OPENAI_API_KEY=sk-...
FRONTEND_URL=https://your-app.vercel.app
```

### Vercel (Frontend)
No environment variables needed - configuration is in the code.

## Monitoring and Maintenance

1. **Monitor logs**
   - Check Render logs for backend issues
   - Check Vercel function logs for frontend issues
   - Monitor Supabase for database performance

2. **Set up alerts**
   - Configure Render to notify you of deployment failures
   - Set up Supabase alerts for database issues

3. **Regular updates**
   - Keep dependencies updated
   - Monitor for security vulnerabilities
   - Update smart contracts as needed

## Troubleshooting

### Common Issues

1. **CORS errors**
   - Check that FRONTEND_URL is set correctly in Render
   - Verify CORS configuration in Flask app

2. **Database connection issues**
   - Verify DATABASE_URL is correct
   - Check Supabase connection limits

3. **Blockchain connection issues**
   - Verify Infura project ID
   - Check network configuration
   - Ensure wallet has sufficient funds

4. **Build failures**
   - Check requirements.txt for correct versions
   - Verify Python version compatibility
   - Check for missing environment variables

### Getting Help

- Check the logs in Render dashboard
- Use Vercel's preview deployments for testing
- Monitor Supabase dashboard for database issues
- Check browser console for frontend errors

## Security Considerations

1. **Never commit sensitive data**
   - Use environment variables for all secrets
   - Add `.env` to `.gitignore`

2. **Use strong secrets**
   - Generate random JWT secrets
   - Use separate wallets for different environments

3. **Monitor access**
   - Set up logging for sensitive operations
   - Monitor for unusual activity
   - Regularly rotate secrets

4. **Database security**
   - Use Supabase Row Level Security (RLS)
   - Limit database access
   - Regular backups