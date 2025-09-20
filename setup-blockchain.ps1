# Blockchain Setup Script for Windows
# This script sets up the complete blockchain environment

Write-Host "🚀 Setting up Blockchain Event Management System..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if npm is available
try {
    $npmVersion = npm --version
    Write-Host "✓ npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ npm not found. Please install npm first." -ForegroundColor Red
    exit 1
}

# Install dependencies if node_modules doesn't exist
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing Node.js dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "✓ Dependencies already installed" -ForegroundColor Green
}

# Compile contracts
Write-Host "🔨 Compiling smart contracts..." -ForegroundColor Yellow
npm run compile
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to compile contracts" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Contracts compiled successfully" -ForegroundColor Green

# Check if Hardhat node is running
Write-Host "🔍 Checking if Hardhat node is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:8545" -Method POST -Body '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' -ContentType "application/json" -TimeoutSec 5
    Write-Host "✓ Hardhat node is running" -ForegroundColor Green
    $nodeRunning = $true
} catch {
    Write-Host "⚠ Hardhat node not running. Please start it with 'npm run node' in another terminal." -ForegroundColor Yellow
    $nodeRunning = $false
}

if ($nodeRunning) {
    # Deploy contracts
    Write-Host "🚀 Deploying contracts to local network..." -ForegroundColor Yellow
    npm run deploy:local
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Failed to deploy contracts" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Contracts deployed successfully" -ForegroundColor Green

    # Test contracts
    Write-Host "🧪 Testing contract functionality..." -ForegroundColor Yellow
    npm run test:contracts
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠ Contract tests had issues, but continuing..." -ForegroundColor Yellow
    } else {
        Write-Host "✓ Contract tests passed" -ForegroundColor Green
    }
}

# Setup Python backend
Write-Host "🐍 Setting up Python backend..." -ForegroundColor Yellow

# Check if Python is installed
try {
    $pythonVersion = python --version
    Write-Host "✓ Python version: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Python not found. Please install Python first." -ForegroundColor Red
    exit 1
}

# Create virtual environment if it doesn't exist
if (-not (Test-Path "backend/venv")) {
    Write-Host "📦 Creating Python virtual environment..." -ForegroundColor Yellow
    Set-Location backend
    python -m venv venv
    Set-Location ..
    Write-Host "✓ Virtual environment created" -ForegroundColor Green
} else {
    Write-Host "✓ Virtual environment already exists" -ForegroundColor Green
}

# Activate virtual environment and install dependencies
Write-Host "📦 Installing Python dependencies..." -ForegroundColor Yellow
Set-Location backend
& "venv\Scripts\Activate.ps1"
pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to install Python dependencies" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Set-Location ..
Write-Host "✓ Python dependencies installed" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 Blockchain setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Start Hardhat node (if not running): npm run node" -ForegroundColor White
Write-Host "2. Deploy contracts (if not done): npm run deploy:local" -ForegroundColor White
Write-Host "3. Start backend server: cd backend && venv\Scripts\Activate.ps1 && python app.py" -ForegroundColor White
Write-Host "4. Start frontend server: Open frontend/index.html in browser" -ForegroundColor White
Write-Host ""
Write-Host "🔗 URLs:" -ForegroundColor Cyan
Write-Host "- Frontend: http://127.0.0.1:3000 (or file:// path)" -ForegroundColor White
Write-Host "- Backend API: http://127.0.0.1:5000" -ForegroundColor White
Write-Host "- Hardhat Node: http://127.0.0.1:8545" -ForegroundColor White
Write-Host ""
Write-Host "📚 Contract addresses are saved in backend/.env" -ForegroundColor Cyan