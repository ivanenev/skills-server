#!/bin/bash

# Installation script for Enhanced Skills MCP Server
# Makes the project platform-agnostic and sets up dependencies

set -e

echo "🚀 Enhanced Skills MCP Server Installation"
echo "=========================================="

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d 'v' -f2)
MAJOR_VERSION=$(echo $NODE_VERSION | cut -d '.' -f1)
if [ "$MAJOR_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be 18 or higher. Found version $NODE_VERSION."
    exit 1
fi
echo "✅ Node.js $NODE_VERSION detected."

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building TypeScript..."
npm run build

# Check lazy-mcp relative path
LAZY_MCP_PATH="../lazy-mcp/run-lazy-mcp.sh"
if [ -f "$LAZY_MCP_PATH" ]; then
    echo "✅ Lazy-MCP found at relative path: $LAZY_MCP_PATH"
else
    echo "⚠️  Lazy-MCP not found at $LAZY_MCP_PATH"
    echo "   You may need to clone lazy-mcp repository alongside skills-server."
    echo "   Or set LAZY_MCP_COMMAND environment variable to the correct path."
fi

# Create .env.example if not exists
if [ ! -f .env.example ]; then
    cat > .env.example << EOF
# Environment variables for Enhanced Skills MCP Server
SKILLS_DIR=\$HOME/.skills
LAZY_MCP_COMMAND=../lazy-mcp/run-lazy-mcp.sh
LAZY_MCP_ENABLED=true
EOF
    echo "📄 Created .env.example file with configuration."
fi

# Run tests
echo "🧪 Running basic tests..."
if npm test; then
    echo "✅ All tests passed!"
else
    echo "⚠️  Some tests failed. Please check the output."
fi

echo ""
echo "🎉 Installation completed successfully!"
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env and adjust any settings if needed."
echo "2. Start the server with: npm start"
echo "3. For development, use: npm run watch"
echo "4. To run all tests: npm run test:all"
echo ""
echo "For more information, see README.md"