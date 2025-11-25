#!/bin/bash

# Prisma Studio Safe Launcher
# This script launches Prisma Studio with a workaround for count query errors

echo "🚀 Starting Prisma Studio with workaround..."
echo ""
echo "⚠️  Note: Count queries will show errors, but you can:"
echo "   - View all data normally"
echo "   - Edit records"
echo "   - Use filters and search"
echo ""
echo "💡 For counting, use:"
echo "   - Direct SQL: SELECT COUNT(*) FROM remarks WHERE entity_type = 'enquiry'"
echo "   - API endpoints: GET /api/remarks/enquiry/:id/remarks"
echo ""

# Kill any existing Prisma Studio instance
kill -9 $(lsof -ti:5555) 2>/dev/null

# Start Prisma Studio
npx prisma studio --port 5555

