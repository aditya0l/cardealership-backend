#!/bin/bash

# Local Development Setup Script
# This script sets up the database and runs migrations

set -e

echo "🚀 Setting up local development environment..."

# Check if PostgreSQL is running
if ! pg_isready -h localhost > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not running!"
    echo "   Start PostgreSQL with: brew services start postgresql@14"
    exit 1
fi

echo "✅ PostgreSQL is running"

# Get current user
DB_USER=$(whoami)

# Database name
DB_NAME="dealership_db"

# Check if database exists
if psql -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "✅ Database '$DB_NAME' already exists"
else
    echo "📦 Creating database '$DB_NAME'..."
    createdb -U "$DB_USER" "$DB_NAME" || psql -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;"
    echo "✅ Database created successfully"
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Server Configuration
NODE_ENV=development
PORT=4000

# Database Configuration
DATABASE_URL="postgresql://$DB_USER@localhost:5432/$DB_NAME"

# Firebase Configuration (Update these with your actual values)
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com/

# OpenAI Configuration (Optional)
OPENAI_API_KEY=sk-your_openai_api_key_here

# Redis Configuration (Optional - for background jobs)
REDIS_HOST=localhost
REDIS_PORT=6379
EOF
    echo "✅ .env file created"
    echo "⚠️  Please update .env with your Firebase credentials!"
else
    echo "✅ .env file already exists"
fi

# Generate Prisma client
echo "📦 Generating Prisma client..."
npm run generate

# Run migrations
echo "📦 Running database migrations..."
npm run migrate

# Seed roles (optional)
echo "📦 Seeding roles..."
npx tsx prisma/seed-rbac.ts || echo "⚠️  Roles may already exist, skipping..."

echo ""
echo "✅ Local development environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env file with your Firebase credentials"
echo "2. Start the server: npm run dev"
echo "3. Server will be available at: http://localhost:4000"

