#!/usr/bin/env python3
"""
Test script to verify NFT functionality with real blockchain data
"""
import requests
import json
import time

BASE_URL = "http://localhost:5000"

def test_blockchain_status():
    """Test blockchain connection status"""
    print("🔗 Testing blockchain connection...")
    try:
        response = requests.get(f"{BASE_URL}/blockchain/status")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Blockchain connected: {data.get('connected', False)}")
            print(f"   Chain ID: {data.get('chain_id', 'Unknown')}")
            print(f"   Contracts loaded: {len(data.get('contracts_loaded', []))}")
            return data.get('connected', False)
        else:
            print(f"❌ Status check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return False

def test_nft_metadata():
    """Test NFT metadata retrieval"""
    print("\n🎨 Testing NFT metadata retrieval...")

    # Use the deployed contract address
    contract_address = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
    token_id = 1

    try:
        response = requests.get(f"{BASE_URL}/blockchain/nft/{contract_address}/{token_id}")
        if response.status_code == 200:
            data = response.json()
            if 'error' in data:
                print(f"⚠️  NFT metadata error: {data['error']}")
                return False
            else:
                print("✅ NFT metadata retrieved successfully!")
                print(f"   Token ID: {data.get('token_id')}")
                print(f"   Owner: {data.get('owner', 'Unknown')[:10]}...")
                print(f"   Network: {data.get('network', 'Unknown')}")
                print(f"   Contract: {data.get('contract_address', 'Unknown')[:10]}...")
                return True
        else:
            print(f"❌ NFT metadata request failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ NFT metadata error: {e}")
        return False

def test_nft_transaction_history():
    """Test NFT transaction history"""
    print("\n📊 Testing NFT transaction history...")

    contract_address = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
    token_id = 1

    try:
        response = requests.get(f"{BASE_URL}/blockchain/nft/{contract_address}/{token_id}/history")
        if response.status_code == 200:
            data = response.json()
            if 'error' in data:
                print(f"⚠️  Transaction history error: {data['error']}")
                return False
            else:
                transactions = data.get('transactions', [])
                print(f"✅ Transaction history retrieved: {len(transactions)} transactions")
                for i, tx in enumerate(transactions[:3]):  # Show first 3
                    print(f"   TX {i+1}: {tx.get('transaction_hash', 'Unknown')[:10]}...")
                    print(f"       From: {tx.get('from_address', 'Unknown')[:10]}...")
                    print(f"       To: {tx.get('to_address', 'Unknown')[:10]}...")
                return True
        else:
            print(f"❌ Transaction history request failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Transaction history error: {e}")
        return False

def test_user_nfts():
    """Test user NFT retrieval"""
    print("\n👤 Testing user NFT retrieval...")

    # Test with a sample address (this might not have NFTs yet)
    test_address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"  # Default Hardhat account
    contract_address = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"

    try:
        response = requests.get(f"{BASE_URL}/blockchain/nft/user/{test_address}?contract_address={contract_address}")
        if response.status_code == 200:
            data = response.json()
            if 'error' in data:
                print(f"⚠️  User NFT error: {data['error']}")
                return False
            else:
                nfts = data.get('nfts', [])
                print(f"✅ User NFTs retrieved: {len(nfts)} NFTs found")
                for nft in nfts[:3]:  # Show first 3
                    print(f"   NFT #{nft.get('token_id')}: {nft.get('contract_address', 'Unknown')[:10]}...")
                return True
        else:
            print(f"❌ User NFT request failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ User NFT error: {e}")
        return False

def test_blockchain_explorer_url():
    """Test blockchain explorer URL generation"""
    print("\n🌐 Testing blockchain explorer URL...")

    contract_address = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
    token_id = 1

    try:
        response = requests.get(f"{BASE_URL}/blockchain/nft/{contract_address}/{token_id}/explorer")
        if response.status_code == 200:
            data = response.json()
            explorer_url = data.get('explorer_url')
            if explorer_url:
                print("✅ Explorer URL generated successfully!")
                print(f"   URL: {explorer_url}")
                return True
            else:
                print("⚠️  No explorer URL returned (might be localhost)")
                return True
        else:
            print(f"❌ Explorer URL request failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Explorer URL error: {e}")
        return False

def main():
    """Run all NFT functionality tests"""
    print("🚀 Testing NFT Functionality with Real Blockchain Data")
    print("=" * 60)

    # Wait a moment for server to be ready
    time.sleep(2)

    results = []

    # Test blockchain connection
    results.append(("Blockchain Connection", test_blockchain_status()))

    # Test NFT functionality
    results.append(("NFT Metadata", test_nft_metadata()))
    results.append(("Transaction History", test_nft_transaction_history()))
    results.append(("User NFTs", test_user_nfts()))
    results.append(("Explorer URL", test_blockchain_explorer_url()))

    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)

    passed = 0
    total = len(results)

    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print("25")
        if success:
            passed += 1

    print(f"\n🎯 Overall: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All NFT functionality tests passed!")
        print("   Real blockchain integration is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the blockchain connection and contract deployment.")

    return passed == total

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)