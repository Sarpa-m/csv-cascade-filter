#!/bin/bash
set -e

echo "📦 Bundling React app to single HTML artifact..."

# Check if we're in a project directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: No package.json found. Run this script from your project root."
  exit 1
fi

# Check if index.html exists
if [ ! -f "index.html" ]; then
  echo "❌ Error: No index.html found in project root."
  exit 1
fi

# Install bundling dependencies
echo "📦 Installing bundling dependencies..."
pnpm add -D parcel @parcel/config-default parcel-resolver-tspaths html-inline

# Create Parcel config with tspaths resolver
if [ ! -f ".parcelrc" ]; then
  echo "🔧 Creating Parcel configuration with path alias support..."
  cat > .parcelrc << 'EOF'
{
  "extends": "@parcel/config-default",
  "resolvers": ["parcel-resolver-tspaths", "..."]
}
EOF
fi

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist csv-cascade-filter.html

# Inject version from env var (CI) or git tag (local) into source before build
VERSION=${APP_VERSION:-$(git describe --tags --abbrev=0 2>/dev/null | sed 's/^v//' || echo '0.0.0')}
echo "🏷️  Version: $VERSION"
sed -i "s/export const APP_VERSION.*/export const APP_VERSION = '$VERSION';/" src/lib/version.ts

# Build with Parcel
echo "🔨 Building with Parcel..."
pnpm exec parcel build index.html --dist-dir dist --no-source-maps

# Restore version.ts
git checkout src/lib/version.ts

# Inline everything into single HTML
echo "🎯 Inlining all assets into single HTML file..."
pnpm exec html-inline dist/index.html > csv-cascade-filter.html

# Get file size
FILE_SIZE=$(du -h csv-cascade-filter.html | cut -f1)

echo ""
echo "✅ Bundle complete!"
echo "📄 Output: csv-cascade-filter.html ($FILE_SIZE)"
echo ""
echo "To test locally: open csv-cascade-filter.html in your browser"
