import os
import json
from web3 import Web3
from web3.middleware import geth_poa_middleware
from eth_account import Account
from eth_account.signers.local import LocalAccount
from typing import Dict, Any, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class BlockchainService:
    """Service for interacting with blockchain smart contracts"""

    def __init__(self):
        self.w3 = None
        self.contracts = {}
        self.account = None
        self.chain_id = None
        self._initialize_web3()
        self._load_contracts()

    def _initialize_web3(self):
        """Initialize Web3 connection"""
        try:
            # Get RPC URL from environment
            rpc_url = os.getenv('BLOCKCHAIN_RPC_URL', 'http://127.0.0.1:8545')

            # Initialize Web3
            self.w3 = Web3(Web3.HTTPProvider(rpc_url))

            # Add PoA middleware for networks like Polygon, BSC
            self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)

            # Test connection
            try:
                # Simple test - try to get the client version
                self.w3.clientVersion
                # Get chain ID
                self.chain_id = self.w3.eth.chain_id
                logger.info(f"Connected to blockchain network with chain ID: {self.chain_id}")
            except Exception as e:
                logger.warning(f"Failed to connect to blockchain at {rpc_url} - running in offline mode: {str(e)}")
                self.chain_id = None

            # Load private key for transaction signing
            private_key = os.getenv('BLOCKCHAIN_PRIVATE_KEY')
            if private_key:
                self.account = Account.from_key(private_key)
                logger.info(f"Loaded account: {self.account.address}")
            else:
                logger.warning("No private key provided - read-only mode")

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

    def get_tickets_by_owner(self, owner_address: str) -> list:
        """Get all tickets owned by an address"""
        try:
            # For testing without blockchain connection, return empty list
            if not self.is_connected() or 'TicketNFT' not in self.contracts:
                logger.warning("Blockchain not connected or TicketNFT contract not loaded - returning empty ticket list")
                return []
            
            # Call the getTicketsByOwner function on the TicketNFT contract
            tickets = self.contracts['TicketNFT'].functions.getTicketsByOwner(
                self.w3.to_checksum_address(owner_address)
            ).call()
            
            # Get metadata for each ticket
            ticket_details = []
            for token_id in tickets:
                try:
                    metadata = self.contracts['TicketNFT'].functions.getTicketMetadata(token_id).call()
                    ticket_details.append({
                        'token_id': token_id,
                        'event_id': metadata[0],
                        'event_contract': metadata[1],
                        'purchaser': metadata[2],
                        'purchase_date': metadata[3],
                        'is_used': metadata[4],
                        'is_active': metadata[5],
                        'seat_info': metadata[6],
                        'ticket_type': metadata[7]
                    })
                except Exception as e:
                    logger.warning(f"Failed to get metadata for token {token_id}: {str(e)}")
            
            return ticket_details
        except Exception as e:
            logger.error(f"Get tickets by owner failed: {str(e)}")
            # Return empty list instead of raising exception in offline mode
            return []

# Global blockchain service instance
blockchain_service = BlockchainService()