#!/bin/bash

echo "Testing login API with admin.new@test.com..."
echo ""

curl -X POST "https://automotive-backend-frqe.onrender.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin.new@test.com","password":"testpassword123"}' \
  2>/dev/null | jq '.'

echo ""
echo "Check the role.name field above - it should be ADMIN"

