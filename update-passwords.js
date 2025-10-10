const fs = require('fs');

const filePath = './src/controllers/auth.controller.ts';
let content = fs.readFileSync(filePath, 'utf8');

const oldPasswords = `const validPasswords = {
        'admin@cardealership.com': 'Admin123!',
        'gm@cardealership.com': 'GeneralManager123!',
        'sm@cardealership.com': 'SalesManager123!',
        'tl@cardealership.com': 'TeamLead123!',
        'advisor@cardealership.com': 'Advisor123!'
      };`;

const newPasswords = `const validPasswords = {
        'admin@cardealership.com': 'Admin123!',
        'gm@cardealership.com': 'GeneralManager123!',
        'sm@cardealership.com': 'SalesManager123!',
        'tl@cardealership.com': 'TeamLead123!',
        'advisor@cardealership.com': 'Advisor123!',
        'admin.new@test.com': 'testpassword123',
        'advisor.new@test.com': 'testpassword123'
      };`;

content = content.replace(oldPasswords, newPasswords);
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Updated validPasswords in auth.controller.ts');
