# Check if logged into npm
echo "📋 Checking npm login status..."
if ! npm whoami > /dev/null 2>&1; then
    echo "❌ Not logged into npm."
    echo "Please run: npm login"
    echo "This will open your browser for authentication."
    echo "After authenticating in the browser, return here and continue."
    exit 1
fi
echo "✅ Logged in as: $(npm whoami)"