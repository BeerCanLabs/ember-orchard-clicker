#!/bin/bash

echo "Installing Ember Orchard Clicker..."

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "Node.js not found. Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "Node.js found: $(node --version)"

# Install serve if not present (for local server)
if ! command -v serve &> /dev/null; then
    echo "Installing serve globally..."
    npm install -g serve
fi

echo "Setup complete!"
echo "Run 'npx serve .' or 'serve .' to start the server."
echo "Or double-click index.html"