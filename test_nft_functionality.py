#!/usr/bin/env python3
"""
Test script for NFT viewing functionality
This script tests the NFT metadata, transaction history, and transfer features
"""

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:5000"
TEST_CONTRACT = "0x5FbDB2315678afecb367f032d93F642f64180aa3"  # Localhost contract
TEST_TOKEN_ID = 1
TEST_USER_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"  # First Hardhat account

def test_nft_metadata():
    """Test NFT metadata retrieval"""
    print("🧪 Testing NFT Metadata Retrieval...")

    url = f"{BASE_URL}/blockchain/nft/{TEST_CONTRACT}/{TEST_TOKEN_ID}"
    print(f"📡 GET {url}")

    try:
        response = requests.get(url)
        print(f"📊 Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print("✅ NFT Metadata Retrieved:")
            print(f"   Token ID: {data.get('token_id')}")
            print(f"   Owner: {data.get('owner', 'N/A')}")
            print(f"   Network: {data.get('network', 'N/A')}")
            print(f"   Contract: {data.get('contract_address', 'N/A')}")
            return True
        else:
            print(f"❌ Failed: {response.text}")
            return False

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def test_nft_transaction_history():
    """Test NFT transaction history"""
    print("\n🧪 Testing NFT Transaction History...")

    url = f"{BASE_URL}/blockchain/nft/{TEST_CONTRACT}/{TEST_TOKEN_ID}/history"
    print(f"📡 GET {url}")

    try:
        response = requests.get(url)
        print(f"📊 Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print("✅ Transaction History Retrieved:")
            transactions = data.get('transactions', [])
            print(f"   Total Transactions: {len(transactions)}")

            for i, tx in enumerate(transactions[:3]):  # Show first 3
                print(f"   TX {i+1}: {tx.get('transaction_hash', 'N/A')[:10]}...")
                print(f"       From: {tx.get('from_address', 'N/A')[:10]}...")
                print(f"       To: {tx.get('to_address', 'N/A')[:10]}...")
                print(f"       Block: {tx.get('block_number', 'N/A')}")
            return True
        else:
            print(f"❌ Failed: {response.text}")
            return False

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def test_user_nfts():
    """Test user NFT retrieval"""
    print("\n🧪 Testing User NFTs Retrieval...")

    url = f"{BASE_URL}/blockchain/nft/user/{TEST_USER_ADDRESS}"
    print(f"📡 GET {url}")

    try:
        response = requests.get(url)
        print(f"📊 Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print("✅ User NFTs Retrieved:")
            nfts = data.get('nfts', [])
            print(f"   Total NFTs: {len(nfts)}")
            print(f"   User Address: {data.get('user_address', 'N/A')}")

            for i, nft in enumerate(nfts[:3]):  # Show first 3
                print(f"   NFT {i+1}: Token #{nft.get('token_id', 'N/A')}")
                print(f"       Contract: {nft.get('contract_address', 'N/A')[:10]}...")
                print(f"       Owner: {nft.get('owner', 'N/A')[:10]}...")
            return True
        else:
            print(f"❌ Failed: {response.text}")
            return False

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def test_blockchain_explorer_url():
    """Test blockchain explorer URL generation"""
    print("\n🧪 Testing Blockchain Explorer URL...")

    url = f"{BASE_URL}/blockchain/nft/{TEST_CONTRACT}/{TEST_TOKEN_ID}/explorer"
    print(f"📡 GET {url}")

    try:
        response = requests.get(url)
        print(f"📊 Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print("✅ Explorer URL Generated:")
            print(f"   URL: {data.get('explorer_url', 'N/A')}")
            print(f"   Token ID: {data.get('token_id', 'N/A')}")
            return True
        else:
            print(f"❌ Failed: {response.text}")
            return False

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def test_blockchain_status():
    """Test blockchain connection status"""
    print("\n🧪 Testing Blockchain Status...")

    url = f"{BASE_URL}/blockchain/status"
    print(f"📡 GET {url}")

    try:
        response = requests.get(url)
        print(f"📊 Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print("✅ Blockchain Status:")
            print(f"   Connected: {data.get('connected', False)}")
            print(f"   Chain ID: {data.get('chain_id', 'N/A')}")
            print(f"   Contracts Loaded: {len(data.get('contracts_loaded', []))}")
            return data.get('connected', False)
        else:
            print(f"❌ Failed: {response.text}")
            return False

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def main():
    """Run all NFT tests"""
    print("🚀 NFT Viewing Functionality Test Suite")
    print("=" * 50)
    print(f"🕐 Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    # Test blockchain connection first
    blockchain_connected = test_blockchain_status()

    if not blockchain_connected:
        print("\n⚠️  Blockchain not connected - some tests may fail")
        print("💡 Make sure Hardhat node is running: npx hardhat node")
        print("💡 And contracts are deployed: npm run deploy")
    else:
        print("\n✅ Blockchain connected - proceeding with tests")

    # Run NFT tests
    tests = [
        ("NFT Metadata", test_nft_metadata),
        ("Transaction History", test_nft_transaction_history),
        ("User NFTs", test_user_nfts),
        ("Explorer URL", test_blockchain_explorer_url),
    ]

    results = []
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        result = test_func()
        results.append((test_name, result))

    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)

    passed = 0
    total = len(results)

    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1

    print(f"\n🎯 Results: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All tests passed! NFT functionality is working correctly.")
    elif passed > 0:
        print("⚠️  Some tests passed. Check blockchain connection and contract deployment.")
    else:
        print("❌ All tests failed. Check backend server and blockchain connection.")

    print(f"\n🕐 Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    main()