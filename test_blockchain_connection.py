#!/usr/bin/env python3
"""
Test script to verify blockchain connection with Infura
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add backend directory to path
backend_dir = Path(__file__).parent / 'backend'
sys.path.insert(0, str(backend_dir))

try:
    from blockchain import BlockchainService
    print("✅ Successfully imported BlockchainService")
except ImportError as e:
    print(f"❌ Failed to import BlockchainService: {e}")
    sys.exit(1)

def test_blockchain_connection():
    """Test blockchain connection"""
    try:
        # Initialize blockchain manager
        blockchain = BlockchainService()
        print("✅ BlockchainService initialized successfully")

        # Test connection
        is_connected = blockchain.is_connected()
        print(f"🔗 Connection status: {'Connected' if is_connected else 'Disconnected'}")

        if is_connected:
            # Get network info
            network = blockchain.current_network
            print(f"🌐 Current network: {network}")

            # Get latest block number
            try:
                block_number = blockchain.w3.eth.block_number
                print(f"📦 Latest block number: {block_number}")
            except Exception as e:
                print(f"⚠️  Could not get block number: {e}")

            print("✅ Blockchain connection test PASSED")
            return True
        else:
            print("❌ Blockchain connection test FAILED - Not connected")
            return False

    except Exception as e:
        print(f"❌ Blockchain connection test FAILED with error: {e}")
        return False

if __name__ == "__main__":
    print("Testing blockchain connection...")
    success = test_blockchain_connection()
    sys.exit(0 if success else 1)