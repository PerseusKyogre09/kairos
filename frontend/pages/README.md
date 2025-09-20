# Frontend Pages Structure

This directory contains separate HTML files for each page of the BlockEvent application. This structure helps declutter the main `index.html` file and makes the codebase more maintainable.

## Page Files

- `login.html` - User login page
- `register.html` - User registration page  
- `events.html` - Events listing and discovery page
- `create-event.html` - Event creation form
- `my-tickets.html` - User's NFT tickets collection
- `profile.html` - User profile management
- `my-events.html` - User's created events management

## How It Works

1. The main `index.html` contains only the navigation, footer, and empty page containers
2. The `page-loader.js` utility dynamically loads page content from these HTML files
3. Each page is cached after first load for better performance
4. The `app.js` file coordinates page loading and initialization

## Benefits

- **Cleaner Code**: Separates page content from the main application structure
- **Better Maintainability**: Each page can be edited independently
- **Improved Performance**: Pages are cached and can be preloaded
- **Easier Development**: Developers can focus on individual pages without scrolling through large files

## Usage

Pages are loaded automatically when users navigate through the application. The page loader extracts the body content from each HTML file and injects it into the appropriate container in the main application.