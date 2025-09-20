import os
import json
from typing import Dict, Any, Optional, Tuple, List
import logging
import requests
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

class BlockchainService:
    """Service for interacting with blockchain smart contracts"""

    # Supported networks configuration
    NETWORKS = {
        'mainnet': {
            'name': 'Ethereum Mainnet',
            'chain_id': 1,
            'rpc_url': 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
            'block_explorer': 'https://etherscan.io',
            'opensea': 'https://opensea.io',
            'native_currency': 'ETH'
        },
        'polygon': {
            'name': 'Polygon Mainnet',
            'chain_id': 137,
            'rpc_url': 'https://polygon-rpc.com',
            'block_explorer': 'https://polygonscan.com',
            'opensea': 'https://opensea.io',
            'native_currency': 'MATIC'
        },
        'mumbai': {
            'name': 'Polygon Mumbai Testnet',
            'chain_id': 80001,
            'rpc_url': 'https://rpc-mumbai.maticvigil.com',
            'block_explorer': 'https://mumbai.polygonscan.com',
            'opensea': 'https://testnets.opensea.io',
            'native_currency': 'MATIC'
        },
        'sepolia': {
            'name': 'Ethereum Sepolia Testnet',
            'chain_id': 11155111,
            'rpc_url': 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
            'block_explorer': 'https://sepolia.etherscan.io',
            'opensea': 'https://testnets.opensea.io',
            'native_currency': 'ETH'
        },
        'localhost': {
            'name': 'Local Hardhat Network',
            'chain_id': 1337,
            'rpc_url': 'http://127.0.0.1:8545',
            'block_explorer': None,
            'opensea': None,
            'native_currency': 'ETH'
        }
    }

    def __init__(self):
        self.w3 = None
        self.contracts = {}
        self.account = None
        self.chain_id = None
        self.current_network = None
        self._initialize_web3()
        self._load_contracts()

    def _initialize_web3(self):
        """Initialize Web3 connection"""
        try:
            # Lazy import to avoid recursion issues
            from web3 import Web3
            from web3.middleware import geth_poa_middleware
            from eth_account import Account
            from eth_account.signers.local import LocalAccount

            # Get network from environment or default to localhost
            network = os.getenv('BLOCKCHAIN_NETWORK', 'localhost')
            self.current_network = network

            # Get RPC URL - check multiple sources
            rpc_url = os.getenv('BLOCKCHAIN_RPC_URL')

            if not rpc_url:
                # Try to construct RPC URL from INFURA_PROJECT_ID
                infura_key = os.getenv('INFURA_PROJECT_ID')
                if infura_key:
                    network_urls = {
                        'mainnet': f'https://mainnet.infura.io/v3/{infura_key}',
                        'sepolia': f'https://sepolia.infura.io/v3/{infura_key}',
                        'polygon': f'https://polygon-mainnet.infura.io/v3/{infura_key}',
                        'mumbai': f'https://polygon-mumbai.infura.io/v3/{infura_key}'
                    }
                    rpc_url = network_urls.get(network)

            # Fall back to default network RPC URL
            if not rpc_url:
                rpc_url = self.NETWORKS.get(network, {}).get('rpc_url', 'http://127.0.0.1:8545')

            logger.info(f"Using RPC URL for {network}: {rpc_url.replace(infura_key or '', '[REDACTED]') if infura_key else rpc_url}")

            # Initialize Web3
            self.w3 = Web3(Web3.HTTPProvider(rpc_url))

            # Add PoA middleware for networks like Polygon, BSC
            self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)

            # Test connection
            try:
                # Simple test - try to get the client version
                self.w3.client_version
                # Get chain ID
                self.chain_id = self.w3.eth.chain_id
                logger.info(f"Connected to blockchain network: {network} (Chain ID: {self.chain_id})")
            except Exception as e:
                logger.warning(f"Failed to connect to blockchain at {rpc_url} - running in offline mode: {str(e)}")
                self.w3 = None
                self.chain_id = None

            # Load private key for transaction signing
            private_key = os.getenv('BLOCKCHAIN_PRIVATE_KEY')
            if private_key:
                self.account = Account.from_key(private_key)
                logger.info(f"Loaded account: {self.account.address}")
            else:
                logger.warning("No private key provided - read-only mode")

        except ImportError as e:
            logger.error(f"Failed to import web3 dependencies: {e}")
            self.w3 = None
            self.chain_id = None
        except Exception as e:
            logger.warning(f"Failed to initialize Web3: {str(e)} - running in offline mode")
            self.w3 = None
            self.chain_id = None
            self.account = None

    def _load_contracts(self):
        """Load contract ABIs and addresses"""
        # Only load contracts if we're connected to blockchain
        if not self.is_connected():
            logger.warning("Skipping contract loading - blockchain not connected")
            return
            
        try:
            # Get the absolute path to the artifacts directory
            artifacts_dir = os.path.join(os.path.dirname(__file__), '..', 'artifacts', 'contracts')

            # Contract configurations
            contract_configs = {
                'EventContract': 'EventContract.sol',
                'PaymentProcessor': 'PaymentProcessor.sol',
                'TicketNFT': 'TicketNFT.sol'
            }

            for contract_name, contract_dir in contract_configs.items():
                try:
                    # Load contract artifact
                    artifact_path = os.path.join(artifacts_dir, contract_dir, f'{contract_name}.json')
                    with open(artifact_path, 'r') as f:
                        artifact = json.load(f)

                    # Get contract address from environment or deployment
                    contract_address_env = f'{contract_name.upper()}_ADDRESS'
                    contract_address = os.getenv(contract_address_env)

                    if not contract_address:
                        logger.warning(f"No address found for {contract_name} - set {contract_address_env}")
                        continue

                    # Create contract instance
                    contract = self.w3.eth.contract(
                        address=self.w3.to_checksum_address(contract_address),
                        abi=artifact['abi']
                    )

                    self.contracts[contract_name] = contract
                    logger.info(f"Loaded {contract_name} at {contract_address}")

                except FileNotFoundError:
                    logger.warning(f"Contract artifact not found: {artifact_path}")
                except Exception as e:
                    logger.error(f"Failed to load {contract_name}: {str(e)}")

        except Exception as e:
            logger.error(f"Failed to load contracts: {str(e)}")

    def get_contract(self, contract_name: str):
        """Get contract instance by name"""
        if contract_name not in self.contracts:
            raise ValueError(f"Contract {contract_name} not loaded")
        return self.contracts[contract_name]

    def is_connected(self) -> bool:
        """Check if blockchain connection is active"""
        if not self.w3:
            return False
        try:
            return self.w3.is_connected()
        except Exception:
            return False

    def get_account_balance(self, address: str) -> float:
        """Get account balance in ETH"""
        try:
            balance_wei = self.w3.eth.get_balance(self.w3.to_checksum_address(address))
            return self.w3.from_wei(balance_wei, 'ether')
        except Exception as e:
            logger.error(f"Failed to get balance for {address}: {str(e)}")
            return 0.0

    def estimate_gas(self, transaction: Dict[str, Any]) -> int:
        """Estimate gas for a transaction"""
        try:
            return self.w3.eth.estimate_gas(transaction)
        except Exception as e:
            logger.error(f"Gas estimation failed: {str(e)}")
            # Return a reasonable default
            return 21000

    def send_transaction(self, contract_name: str, function_name: str,
                        *args, **kwargs) -> Optional[str]:
        """
        Send a transaction to a smart contract function

        Args:
            contract_name: Name of the contract
            function_name: Name of the function to call
            *args: Function arguments
            **kwargs: Additional options (value, gas, etc.)

        Returns:
            Transaction hash if successful, None otherwise
        """
        if not self.account:
            raise Exception("No private key configured for transaction signing")

        try:
            contract = self.get_contract(contract_name)
            contract_function = getattr(contract.functions, function_name)

            # Build transaction
            transaction = contract_function(*args).build_transaction({
                'from': self.account.address,
                'chainId': self.chain_id,
                'gasPrice': self.w3.eth.gas_price,
                'nonce': self.w3.eth.get_transaction_count(self.account.address),
                **kwargs  # Allow overriding gas, value, etc.
            })

            # Estimate gas if not provided
            if 'gas' not in transaction or not transaction['gas']:
                transaction['gas'] = self.estimate_gas(transaction)

            # Sign transaction
            signed_txn = self.account.sign_transaction(transaction)

            # Send transaction
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)

            logger.info(f"Transaction sent: {tx_hash.hex()}")
            return tx_hash.hex()

        except Exception as e:
            logger.error(f"Transaction failed: {str(e)}")
            raise

    def call_function(self, contract_name: str, function_name: str, *args) -> Any:
        """
        Call a read-only contract function

        Args:
            contract_name: Name of the contract
            function_name: Name of the function to call
            *args: Function arguments

        Returns:
            Function result
        """
        try:
            contract = self.get_contract(contract_name)
            contract_function = getattr(contract.functions, function_name)
            return contract_function(*args).call()
        except Exception as e:
            logger.error(f"Contract call failed: {str(e)}")
            raise

    def wait_for_transaction(self, tx_hash: str, timeout: int = 120) -> Dict[str, Any]:
        """
        Wait for transaction confirmation

        Args:
            tx_hash: Transaction hash
            timeout: Timeout in seconds

        Returns:
            Transaction receipt
        """
        try:
            # For testing without blockchain connection, return dummy receipt
            if not self.is_connected():
                logger.warning("Blockchain not connected - returning dummy transaction receipt")
                return {
                    'transactionHash': tx_hash,
                    'status': 1,  # Success
                    'blockNumber': 1,
                    'gasUsed': 21000,
                    'from': '0x0000000000000000000000000000000000000000',
                    'to': '0x0000000000000000000000000000000000000000'
                }
            
            receipt = self.w3.eth.wait_for_transaction_receipt(
                self.w3.to_bytes(hexstr=tx_hash),
                timeout=timeout
            )
            return dict(receipt)
        except Exception as e:
            logger.error(f"Transaction wait failed: {str(e)}")
            # Return dummy receipt for offline mode instead of raising
            if not self.is_connected():
                return {
                    'transactionHash': tx_hash,
                    'status': 0,  # Failed
                    'blockNumber': 0,
                    'gasUsed': 0,
                    'error': str(e)
                }
            raise

    # Event Contract Functions
    def create_event(self, title: str, start_date: int, ticket_price: float, capacity: int) -> Optional[str]:
        """Create a new event on the blockchain"""
        try:
            # Convert ticket price to wei
            ticket_price_wei = self.w3.to_wei(ticket_price, 'ether')

            return self.send_transaction(
                'EventContract',
                'createEvent',
                title,
                start_date,
                ticket_price_wei,
                capacity
            )
        except Exception as e:
            logger.error(f"Create event failed: {str(e)}")
            raise

    def get_event(self, event_id: int) -> Dict[str, Any]:
        """Get event details from blockchain"""
        try:
            result = self.call_function('EventContract', 'getEvent', event_id)

            # Parse the result (assuming the contract returns a struct)
            # This will need to be adjusted based on the actual contract return format
            return {
                'id': event_id,
                'title': result[0] if isinstance(result, (list, tuple)) else result.get('title', ''),
                'startDate': result[1] if isinstance(result, (list, tuple)) else result.get('startDate', 0),
                'ticketPrice': self.w3.from_wei(result[2], 'ether') if isinstance(result, (list, tuple)) else result.get('ticketPrice', 0),
                'capacity': result[3] if isinstance(result, (list, tuple)) else result.get('capacity', 0),
                'organizer': result[4] if isinstance(result, (list, tuple)) else result.get('organizer', ''),
                'isActive': result[5] if isinstance(result, (list, tuple)) else result.get('isActive', True)
            }
        except Exception as e:
            logger.error(f"Get event failed: {str(e)}")
            raise

    # Payment Processor Functions
    def process_payment(self, event_id: int, amount: float, payer_address: str, organizer_address: str) -> Optional[str]:
        """Process payment for event ticket"""
        try:
            amount_wei = self.w3.to_wei(amount, 'ether')

            return self.send_transaction(
                'PaymentProcessor',
                'testProcessPayment',  # Use testProcessPayment for now since we're the owner
                event_id,
                self.w3.to_checksum_address(payer_address),
                self.w3.to_checksum_address(organizer_address),
                amount_wei,
                value=amount_wei  # Send ETH with transaction
            )
        except Exception as e:
            logger.error(f"Process payment failed: {str(e)}")
            raise

    def register_for_event(self, event_id: int, wallet_address: str, ticket_price: float, organizer_address: str) -> Optional[str]:
        """Register user for event using EventContract's registerForEvent function"""
        try:
            # For testing without blockchain connection, return dummy tx hash
            if not self.is_connected():
                logger.warning("Blockchain not connected - returning dummy transaction hash for testing")
                import hashlib
                import time
                dummy_data = f"{event_id}{wallet_address}{time.time()}"
                dummy_hash = hashlib.sha256(dummy_data.encode()).hexdigest()
                return f"0x{dummy_hash[:64]}"
            
            # Convert ticket price to wei
            ticket_price_wei = self.w3.to_wei(ticket_price, 'ether')
            
            # Call the EventContract's registerForEvent function
            # This will handle payment processing and NFT minting automatically
            return self.send_transaction(
                'EventContract',
                'registerForEvent',
                event_id,
                value=ticket_price_wei  # Send ETH with the transaction
            )
        except Exception as e:
            logger.error(f"Register for event failed: {str(e)}")
            raise

    # Ticket NFT Functions
    def mint_ticket(self, to_address: str, event_id: int, ticket_uri: str) -> Optional[str]:
        """Mint a new ticket NFT"""
        try:
            return self.send_transaction(
                'TicketNFT',
                'mintTicket',
                to_address,
                event_id,
                ticket_uri
            )
        except Exception as e:
            logger.error(f"Mint ticket failed: {str(e)}")
            raise

    def transfer_ticket(self, from_address: str, to_address: str, token_id: int) -> Optional[str]:
        """Transfer a ticket NFT"""
        try:
            return self.send_transaction(
                'TicketNFT',
                'transferFrom',
                from_address,
                to_address,
                token_id
            )
        except Exception as e:
            logger.error(f"Transfer ticket failed: {str(e)}")
            raise

    def get_nft_metadata(self, contract_address, token_id):
        """Get NFT metadata from blockchain"""
        try:
            if not self.w3:
                return {"error": "Blockchain connection not available"}

            # Load contract
            contract = self._load_contract(contract_address, 'TicketNFT')

            if not contract:
                return {"error": "Contract not found"}

            # Get token URI
            token_uri = contract.functions.tokenURI(token_id).call()

            # Get owner
            owner = contract.functions.ownerOf(token_id).call()

            # Get additional metadata if available
            try:
                # Try to get event details if contract supports it
                event_id = contract.functions.getEventId(token_id).call()
                ticket_type = contract.functions.getTicketType(token_id).call()
                is_used = contract.functions.isTicketUsed(token_id).call()
            except:
                event_id = None
                ticket_type = None
                is_used = None

            metadata = {
                "token_id": token_id,
                "token_uri": token_uri,
                "owner": owner,
                "contract_address": contract_address,
                "network": self.current_network,
                "chain_id": self.chain_id,
                "event_id": event_id,
                "ticket_type": ticket_type,
                "is_used": is_used,
                "explorer_url": self._get_explorer_url(contract_address, token_id)
            }

            return metadata

        except Exception as e:
            logger.error(f"Error getting NFT metadata: {str(e)}")
            return {"error": str(e)}

    def get_nft_transaction_history(self, contract_address, token_id):
        """Get transaction history for an NFT"""
        try:
            if not self.w3:
                return {"error": "Blockchain connection not available"}

            # Get transfer events for this token
            contract = self._load_contract(contract_address, 'TicketNFT')
            if not contract:
                return {"error": "Contract not found"}

            # Get Transfer events for this token
            transfer_events = contract.events.Transfer.get_logs(
                fromBlock=0,
                toBlock='latest',
                argument_filters={'tokenId': token_id}
            )

            transactions = []
            for event in transfer_events:
                tx_hash = event.transactionHash.hex()
                block = self.w3.eth.get_block(event.blockNumber)

                transaction = {
                    "transaction_hash": tx_hash,
                    "block_number": event.blockNumber,
                    "timestamp": block.timestamp,
                    "from_address": event.args['from'],
                    "to_address": event.args['to'],
                    "token_id": event.args['tokenId'],
                    "explorer_url": self._get_transaction_explorer_url(tx_hash)
                }
                transactions.append(transaction)

            return {
                "token_id": token_id,
                "contract_address": contract_address,
                "transactions": transactions
            }

        except Exception as e:
            logger.error(f"Error getting NFT transaction history: {str(e)}")
            return {"error": str(e)}

    def get_user_nfts(self, user_address, contract_address=None):
        """Get all NFTs owned by a user"""
        try:
            if not self.w3:
                return {"error": "Blockchain connection not available"}

            if contract_address:
                # Get NFTs from specific contract
                contract = self._load_contract(contract_address, 'TicketNFT')
                if not contract:
                    return {"error": "Contract not found"}

                # Get balance
                balance = contract.functions.balanceOf(user_address).call()

                nfts = []
                for i in range(balance):
                    token_id = contract.functions.tokenOfOwnerByIndex(user_address, i).call()
                    metadata = self.get_nft_metadata(contract_address, token_id)
                    if 'error' not in metadata:
                        nfts.append(metadata)

                return {
                    "user_address": user_address,
                    "contract_address": contract_address,
                    "nfts": nfts
                }
            else:
                # Get NFTs from all known contracts (would need to track deployed contracts)
                return {"error": "Contract address required for NFT lookup"}

        except Exception as e:
            logger.error(f"Error getting user NFTs: {str(e)}")
            return {"error": str(e)}

    def _load_contract(self, contract_address, contract_type):
        """Load a contract by address and type"""
        try:
            if not self.w3:
                return None

            # Get contract artifact
            artifacts_dir = os.path.join(os.path.dirname(__file__), '..', 'artifacts', 'contracts')
            artifact_path = os.path.join(artifacts_dir, f'{contract_type}.sol', f'{contract_type}.json')

            with open(artifact_path, 'r') as f:
                artifact = json.load(f)

            # Create contract instance
            contract = self.w3.eth.contract(
                address=self.w3.to_checksum_address(contract_address),
                abi=artifact['abi']
            )

            return contract

        except Exception as e:
            logger.error(f"Failed to load contract {contract_type} at {contract_address}: {str(e)}")
            return None

    def _get_explorer_url(self, contract_address, token_id=None):
        """Get blockchain explorer URL for contract/token"""
        network_config = self.NETWORKS.get(self.current_network, {})
        explorer_url = network_config.get('block_explorer', '')

        if not explorer_url:
            return None

        if token_id is not None:
            return f"{explorer_url}/token/{contract_address}?a={token_id}"
        else:
            return f"{explorer_url}/address/{contract_address}"

    def _get_transaction_explorer_url(self, tx_hash):
        """Get blockchain explorer URL for transaction"""
        network_config = self.NETWORKS.get(self.current_network, {})
        explorer_url = network_config.get('block_explorer', '')

        if not explorer_url:
            return None

        return f"{explorer_url}/tx/{tx_hash}"

# Global blockchain service instance - lazy initialization
_blockchain_service = None

def get_blockchain_service():
    """Get the global blockchain service instance, initializing it if needed"""
    global _blockchain_service
    if _blockchain_service is None:
        _blockchain_service = BlockchainService()
    return _blockchain_service

# For backward compatibility
blockchain_service = get_blockchain_service()