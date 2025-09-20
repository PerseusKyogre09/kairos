# NFT Tickets Feature

## Overview

The NFT Tickets feature allows users to purchase event tickets as unique NFTs (Non-Fungible Tokens) stored on the blockchain. Each ticket has a unique design based on the event and includes verifiable ownership and authenticity.

## Features

### 🎨 **Unique Ticket Designs**
- Each event generates tickets with unique color gradients
- Different visual patterns based on token ID
- VIP vs Standard ticket styling
- Status indicators (Valid, Used, Expired)
- Ticket stub perforation design

### 🎫 **Ticket Types**
- **Standard**: Regular event tickets
- **VIP**: Premium tickets (automatically assigned for tickets ≥ 0.1 ETH)

### 📱 **Ticket Management**
- View all owned tickets in "My Tickets" section
- Detailed ticket information modal
- Purchase history and seat assignments
- QR codes for verification (placeholder)

### 🔗 **Blockchain Integration**
- **Online Mode**: Real NFT minting on blockchain
- **Offline Mode**: Database storage with blockchain simulation
- Automatic fallback between modes
- Transaction hash tracking

## How It Works

### 1. **Ticket Purchase Flow**
```
User clicks "Buy Ticket" → 
MetaMask wallet connection → 
Payment processing → 
NFT ticket minting → 
Database record creation → 
Ticket appears in "My Tickets"
```

### 2. **Ticket Generation**
- **Token ID**: Unique incremental identifier
- **Seat Assignment**: Auto-generated (Seat-1, Seat-2, etc.)
- **Visual Design**: Based on event ID and token ID
- **Metadata**: Event details, purchase date, price, etc.

### 3. **Ticket Verification**
- Blockchain ownership verification
- QR code generation (placeholder)
- Transfer tracking
- Usage status monitoring

## Database Schema

### Tickets Table
```sql
CREATE TABLE tickets (
    id INTEGER PRIMARY KEY,
    token_id INTEGER UNIQUE NOT NULL,
    event_id INTEGER REFERENCES events(id),
    user_id INTEGER REFERENCES users(id),
    wallet_address VARCHAR(42) NOT NULL,
    transaction_hash VARCHAR(66),
    seat_info VARCHAR(50) DEFAULT 'General Admission',
    ticket_type VARCHAR(20) DEFAULT 'Standard',
    is_used BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Get User Tickets
```
GET /blockchain/tickets/user/{wallet_address}
Authorization: Bearer {jwt_token}

Response:
{
    "tickets": [
        {
            "token_id": 1,
            "event_id": 1,
            "event_contract": "0x...",
            "purchaser": "0x...",
            "purchase_date": 1640995200,
            "is_used": false,
            "is_active": true,
            "seat_info": "Seat-1",
            "ticket_type": "VIP"
        }
    ],
    "offline_mode": false
}
```

### Register for Event (Purchase Ticket)
```
POST /events/{event_id}/register
Authorization: Bearer {jwt_token}

Body:
{
    "wallet_address": "0x...",
    "organizer_address": "0x..." (optional)
}

Response:
{
    "message": "Registration successful! NFT ticket has been minted.",
    "transaction_hash": "0x...",
    "event_id": 1,
    "ticket": { ... }
}
```

## Frontend Components

### 1. **My Tickets Page** (`/my-tickets`)
- Grid layout of ticket cards
- Unique visual design for each ticket
- Click to view detailed information
- Refresh functionality

### 2. **Ticket Card Design**
- Gradient header based on event ID
- Status badges (VIP, Valid, Used, Expired)
- Event information display
- Seat and purchase details
- QR code placeholder

### 3. **Ticket Details Modal**
- Full ticket information
- Transfer functionality (placeholder)
- Blockchain explorer link (placeholder)
- Verification QR code

## Setup Instructions

### 1. **Initialize Tickets Table**
```bash
# Run the setup script
python setup-tickets.py

# Or manually create the table
cd backend
python create_tickets_table.py
```

### 2. **Frontend Integration**
The tickets feature is automatically integrated when you:
1. Include `tickets.js` in your HTML
2. Add the "My Tickets" navigation link
3. Include the `my-tickets-page` div

### 3. **Test the Feature**
1. Register/login to the application
2. Connect MetaMask wallet
3. Purchase tickets for events
4. View tickets in "My Tickets" section

## Offline Mode Support

When the blockchain node isn't running:
- Tickets are stored in the database
- Dummy transaction hashes are generated
- Visual feedback shows "offline mode"
- All functionality works normally
- Automatic sync when blockchain comes online

## Customization

### 1. **Ticket Visual Design**
Edit `frontend/js/tickets.js`:
- Modify `gradients` array for different colors
- Change `patterns` array for background designs
- Update CSS classes for styling

### 2. **Ticket Types**
Edit `backend/events.py`:
- Modify ticket type logic in `register_for_event`
- Add new ticket categories
- Implement pricing tiers

### 3. **Seat Assignment**
Edit seat generation logic:
- Implement venue-specific seating
- Add section/row assignments
- Create reserved seating system

## Future Enhancements

### 🔮 **Planned Features**
- [ ] Real QR code generation
- [ ] Ticket transfer marketplace
- [ ] Blockchain explorer integration
- [ ] Ticket verification system
- [ ] Batch ticket purchases
- [ ] Refund functionality
- [ ] Event check-in system
- [ ] Ticket resale platform

### 🎨 **Design Improvements**
- [ ] Custom event artwork upload
- [ ] Animated ticket designs
- [ ] 3D ticket visualization
- [ ] AR ticket viewing
- [ ] Print-friendly ticket format

### 🔧 **Technical Enhancements**
- [ ] IPFS metadata storage
- [ ] Multi-chain support
- [ ] Gas optimization
- [ ] Batch operations
- [ ] Real-time sync
- [ ] Mobile app integration

## Troubleshooting

### Common Issues

1. **Tickets not showing**
   - Check wallet connection
   - Verify user authentication
   - Check browser console for errors

2. **Purchase failures**
   - Ensure sufficient ETH balance
   - Check MetaMask connection
   - Verify event is active

3. **Offline mode issues**
   - Run `python setup-tickets.py`
   - Check database connection
   - Restart backend server

### Debug Commands

```bash
# Check tickets table
sqlite3 backend/app.db "SELECT * FROM tickets;"

# View user tickets
sqlite3 backend/app.db "SELECT u.username, t.* FROM tickets t JOIN users u ON t.user_id = u.id;"

# Check events with tickets
sqlite3 backend/app.db "SELECT e.title, COUNT(t.id) as ticket_count FROM events e LEFT JOIN tickets t ON e.id = t.event_id GROUP BY e.id;"
```

## Support

For issues or questions about the NFT Tickets feature:
1. Check the troubleshooting section above
2. Review the browser console for errors
3. Check backend logs for API issues
4. Verify blockchain connection status

The NFT Tickets feature provides a complete solution for blockchain-based event ticketing with both online and offline support, unique visual designs, and comprehensive ticket management capabilities.