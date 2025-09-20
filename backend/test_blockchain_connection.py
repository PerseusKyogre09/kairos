#!/usr/bin/env python3
"""
Blockchain Connection Test Script

This script tests your blockchain connection configuration.
Run this locally and in deployment to verify blockchain connectivity.

Usage:
    python test_blockchain_connection.py
"""

import os
import sys

# Add the current directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_blockchain_config():
    """Test blockchain configuration"""
    print("Testing blockchain configuration...")
    print("=" * 50)

    # Check network
    network = os.getenv('BLOCKCHAIN_NETWORK', 'localhost')
    print(f"Network: {network}")

    # Check RPC configuration
    rpc_url = os.getenv('BLOCKCHAIN_RPC_URL')
    infura_key = os.getenv('INFURA_PROJECT_ID')

    if rpc_url:
        print(f"RPC URL: {rpc_url.replace(infura_key or '', '[REDACTED]') if infura_key else rpc_url}")
    elif infura_key:
        print(f"Infura Project ID: {infura_key[:8]}...")
        # Construct expected RPC URL
        network_urls = {
            'mainnet': f'https://mainnet.infura.io/v3/{infura_key}',
            'sepolia': f'https://sepolia.infura.io/v3/{infura_key}',
            'polygon': f'https://polygon-mainnet.infura.io/v3/{infura_key}',
            'mumbai': f'https://polygon-mumbai.infura.io/v3/{infura_key}'
        }
        expected_url = network_urls.get(network)
        if expected_url:
            print(f"Expected RPC URL: {expected_url.replace(infura_key, '[REDACTED]')}")
    else:
        print("❌ No RPC configuration found")
        print("   Set BLOCKCHAIN_RPC_URL or INFURA_PROJECT_ID")
        return False

    # Check private key
    private_key = os.getenv('BLOCKCHAIN_PRIVATE_KEY')
    if private_key:
        print(f"Private key: {'✅ Configured' if len(private_key) > 10 else '❌ Invalid'}")
    else:
        print("⚠️  No private key configured (read-only mode)")

    # Check contract addresses
    contracts = ['EVENTCONTRACT_ADDRESS', 'PAYMENTPROCESSOR_ADDRESS', 'TICKETNFT_ADDRESS']
    for contract in contracts:
        address = os.getenv(contract)
        if address and address != '0x0000000000000000000000000000000000000000':
            print(f"{contract}: ✅ {address[:10]}...")
        else:
            print(f"{contract}: ⚠️  Not configured")

    return True

def test_blockchain_connection():
    """Test actual blockchain connection"""
    print("\nTesting blockchain connection...")
    print("=" * 50)

    try:
        from blockchain import BlockchainService

        # Initialize blockchain service
        blockchain = BlockchainService()

        if blockchain.w3 and blockchain.w3.is_connected():
            print("✅ Blockchain connection successful!")
            print(f"   Network: {blockchain.current_network}")
            print(f"   Chain ID: {blockchain.chain_id}")
            print(f"   Client: {blockchain.w3.client_version}")

            # Test basic blockchain call
            try:
                block_number = blockchain.w3.eth.block_number
                print(f"   Latest block: {block_number}")
            except Exception as e:
                print(f"⚠️  Could not get block number: {e}")

            return True
        else:
            print("❌ Blockchain connection failed")
            print("   Check your RPC URL and network configuration")
            return False

    except Exception as e:
        print(f"❌ Error initializing blockchain service: {e}")
        return False

def main():
    """Main test function"""
    print("Blockchain Connection Test")
    print("=" * 50)

    config_ok = test_blockchain_config()
    connection_ok = test_blockchain_connection()

    print("\n" + "=" * 50)

    if config_ok and connection_ok:
        print("🎉 Blockchain configuration and connection successful!")
        print("   Your app should work with blockchain features.")
    elif config_ok and not connection_ok:
        print("⚠️  Configuration looks good but connection failed.")
        print("   Check your internet connection and RPC provider status.")
    else:
        print("❌ Blockchain configuration issues found.")
        print("   Fix the configuration issues above.")

    print("\n📖 For help, see BLOCKCHAIN_DEPLOYMENT.md")

    return config_ok and connection_ok

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)