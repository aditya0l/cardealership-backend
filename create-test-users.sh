# Firebase Test Users Setup Commands
# Run these curl commands to create test users via your API

echo "🔧 Creating test users for all roles..."

# Create Admin User
curl -X POST http://localhost:4000/api/auth/users/create-with-credentials \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Admin",
    "email": "admin@dealership.com", 
    "password": "Admin123!",
    "roleName": "ADMIN"
  }'

# Create General Manager
curl -X POST http://localhost:4000/api/auth/users/create-with-credentials \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test General Manager",
    "email": "generalmanager@dealership.com",
    "password": "Manager123!", 
    "roleName": "GENERAL_MANAGER"
  }'

# Create Sales Manager
curl -X POST http://localhost:4000/api/auth/users/create-with-credentials \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Sales Manager", 
    "email": "salesmanager@dealership.com",
    "password": "Sales123!",
    "roleName": "SALES_MANAGER"
  }'

# Create Team Lead  
curl -X POST http://localhost:4000/api/auth/users/create-with-credentials \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Team Lead",
    "email": "teamlead@dealership.com", 
    "password": "Lead123!",
    "roleName": "TEAM_LEAD"
  }'

# Create Customer Advisor
curl -X POST http://localhost:4000/api/auth/users/create-with-credentials \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Customer Advisor",
    "email": "advisor@dealership.com",
    "password": "Advisor123!",
    "roleName": "CUSTOMER_ADVISOR" 
  }'

echo "✅ Test users created successfully!"
