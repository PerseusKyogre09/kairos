from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from blockchain import blockchain_service
import logging
import os

logger = logging.getLogger(__name__)

blockchain_bp = Blueprint('blockchain', __name__)

@blockchain_bp.route('/status', methods=['GET'])
def blockchain_status():
    """Get blockchain connection status"""
    try:
        is_connected = blockchain_service.is_connected()
        chain_id = blockchain_service.chain_id if is_connected else None

        return jsonify({
            'connected': is_connected,
            'chain_id': chain_id,
            'contracts_loaded': list(blockchain_service.contracts.keys()),
            'account': blockchain_service.account.address if blockchain_service.account else None
        }), 200

    except Exception as e:
        logger.error(f"Blockchain status check failed: {str(e)}")
        return jsonify({
            'connected': False,
            'error': str(e)
        }), 500

@blockchain_bp.route('/balance/<address>', methods=['GET'])
def get_balance(address):
    """Get account balance"""
    try:
        balance = blockchain_service.get_account_balance(address)
        return jsonify({
            'address': address,
            'balance_eth': balance
        }), 200

    except Exception as e:
        logger.error(f"Balance check failed: {str(e)}")
        return jsonify({'error': str(e)}), 500

@blockchain_bp.route('/events/<int:event_id>', methods=['GET'])
def get_blockchain_event(event_id):
    """Get event details from blockchain"""
    try:
        event = blockchain_service.get_event(event_id)
        return jsonify({'event': event}), 200

    except Exception as e:
        logger.error(f"Get blockchain event failed: {str(e)}")
        return jsonify({'error': str(e)}), 500

@blockchain_bp.route('/events', methods=['POST'])
@jwt_required()
def create_blockchain_event():
    """Create event on blockchain"""
    try:
        data = request.get_json()

        # Validate required fields
        required_fields = ['title', 'start_date', 'ticket_price', 'capacity']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        # Create event on blockchain
        tx_hash = blockchain_service.create_event(
            data['title'],
            data['start_date'],
            data['ticket_price'],
            data['capacity']
        )

        return jsonify({
            'message': 'Event creation transaction sent',
            'transaction_hash': tx_hash
        }), 201

    except Exception as e:
        logger.error(f"Create blockchain event failed: {str(e)}")
        return jsonify({'error': str(e)}), 500

@blockchain_bp.route('/payments', methods=['POST'])
@jwt_required()
def process_payment():
    """Process payment for event ticket"""
    try:
        data = request.get_json()
        user_id = get_jwt_identity()

        # Validate required fields
        required_fields = ['event_id', 'amount', 'payer_address', 'organizer_address']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        # Process payment
        tx_hash = blockchain_service.process_payment(
            data['event_id'],
            data['amount'],
            data['payer_address'],
            data['organizer_address']
        )

        return jsonify({
            'message': 'Payment transaction sent',
            'transaction_hash': tx_hash
        }), 201

    except Exception as e:
        logger.error(f"Process payment failed: {str(e)}")
        return jsonify({'error': str(e)}), 500

@blockchain_bp.route('/tickets', methods=['POST'])
@jwt_required()
def mint_ticket():
    """Mint a new ticket NFT"""
    try:
        data = request.get_json()

        # Validate required fields
        required_fields = ['to_address', 'event_id', 'ticket_uri']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        # Mint ticket
        tx_hash = blockchain_service.mint_ticket(
            data['to_address'],
            data['event_id'],
            data['ticket_uri']
        )

        return jsonify({
            'message': 'Ticket minting transaction sent',
            'transaction_hash': tx_hash
        }), 201

    except Exception as e:
        logger.error(f"Mint ticket failed: {str(e)}")
        return jsonify({'error': str(e)}), 500

@blockchain_bp.route('/tickets/transfer', methods=['POST'])
@jwt_required()
def transfer_ticket():
    """Transfer a ticket NFT"""
    try:
        data = request.get_json()

        # Validate required fields
        required_fields = ['from_address', 'to_address', 'token_id']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        # Transfer ticket
        tx_hash = blockchain_service.transfer_ticket(
            data['from_address'],
            data['to_address'],
            data['token_id']
        )

        return jsonify({
            'message': 'Ticket transfer transaction sent',
            'transaction_hash': tx_hash
        }), 201

    except Exception as e:
        logger.error(f"Transfer ticket failed: {str(e)}")
        return jsonify({'error': str(e)}), 500

@blockchain_bp.route('/tickets/user/<address>', methods=['GET'])
@jwt_required()
def get_user_tickets(address):
    """Get all tickets owned by a user"""
    try:
        # First try to get tickets from blockchain
        blockchain_tickets = blockchain_service.get_tickets_by_owner(address)
        
        # Also get tickets from database (for offline mode and backup)
        from models import Ticket
        user_id = get_jwt_identity()
        db_tickets = Ticket.query.filter_by(
            user_id=user_id,
            wallet_address=address
        ).all()
        
        # Convert database tickets to blockchain format
        db_tickets_formatted = [ticket.to_blockchain_format() for ticket in db_tickets]
        
        # Check if blockchain is connected
        if not blockchain_service.is_connected():
            return jsonify({
                'tickets': db_tickets_formatted,
                'message': 'Blockchain not connected - showing offline data',
                'offline_mode': True
            }), 200
        
        # In online mode, prefer blockchain data but fall back to database if needed
        tickets = blockchain_tickets if blockchain_tickets else db_tickets_formatted
        
        return jsonify({'tickets': tickets}), 200

    except Exception as e:
        logger.error(f"Get user tickets failed: {str(e)}")
        
        # Fallback to database tickets
        try:
            from models import Ticket
            user_id = get_jwt_identity()
            db_tickets = Ticket.query.filter_by(
                user_id=user_id,
                wallet_address=address
            ).all()
            
            db_tickets_formatted = [ticket.to_blockchain_format() for ticket in db_tickets]
            
            return jsonify({
                'tickets': db_tickets_formatted,
                'message': 'Using offline data due to blockchain connection issues',
                'offline_mode': True
            }), 200
        except Exception as db_error:
            logger.error(f"Database fallback failed: {str(db_error)}")
            return jsonify({
                'error': str(e),
                'tickets': [],
                'offline_mode': True
            }), 200  # Return 200 instead of 500 for better UX

@blockchain_bp.route('/nft/<contract_address>/<int:token_id>', methods=['GET'])
def get_nft_metadata(contract_address, token_id):
    """Get NFT metadata from blockchain"""
    try:
        metadata = blockchain_service.get_nft_metadata(contract_address, token_id)

        if 'error' in metadata:
            return jsonify(metadata), 404

        return jsonify(metadata), 200

    except Exception as e:
        logger.error(f"Get NFT metadata failed: {str(e)}")
        return jsonify({'error': str(e)}), 500

@blockchain_bp.route('/nft/<contract_address>/<int:token_id>/history', methods=['GET'])
def get_nft_transaction_history(contract_address, token_id):
    """Get transaction history for an NFT"""
    try:
        history = blockchain_service.get_nft_transaction_history(contract_address, token_id)

        if 'error' in history:
            return jsonify(history), 404

        return jsonify(history), 200

    except Exception as e:
        logger.error(f"Get NFT transaction history failed: {str(e)}")
        return jsonify({'error': str(e)}), 500

@blockchain_bp.route('/nft/user/<user_address>', methods=['GET'])
def get_user_nfts(user_address):
    """Get all NFTs owned by a user"""
    try:
        # Get contract address from environment or query parameter
        contract_address = request.args.get('contract_address') or os.getenv('TICKETNFT_ADDRESS')

        if not contract_address:
            return jsonify({'error': 'Contract address required'}), 400

        nfts = blockchain_service.get_user_nfts(user_address, contract_address)

        if 'error' in nfts:
            return jsonify(nfts), 404

        return jsonify(nfts), 200

    except Exception as e:
        logger.error(f"Get user NFTs failed: {str(e)}")
        return jsonify({'error': str(e)}), 500

@blockchain_bp.route('/nft/<contract_address>/<int:token_id>/explorer', methods=['GET'])
def get_nft_explorer_url(contract_address, token_id):
    """Get blockchain explorer URL for NFT"""
    try:
        explorer_url = blockchain_service._get_explorer_url(contract_address, token_id)

        if not explorer_url:
            return jsonify({'error': 'Explorer not available for current network'}), 404

        return jsonify({
            'explorer_url': explorer_url,
            'contract_address': contract_address,
            'token_id': token_id
        }), 200

    except Exception as e:
        logger.error(f"Get NFT explorer URL failed: {str(e)}")
        return jsonify({'error': str(e)}), 500