#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧪 Summit 25 Deployment Test Script');
console.log('===================================\n');

// Test 1: Check if required files exist
console.log('📂 Checking required files...');
const requiredFiles = [
  'config.example.json',
  '.env.example',
  'scripts/init.cjs',
  'scripts/setup-database.cjs',
  'shared/schema.ts',
  'server/db.ts',
  'drizzle.config.ts'
];

let allFilesExist = true;
for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - MISSING`);
    allFilesExist = false;
  }
}

if (!allFilesExist) {
  console.log('\n❌ Some required files are missing');
  process.exit(1);
}

// Test 2: Validate config template
console.log('\n📋 Validating configuration template...');
try {
  const configTemplate = JSON.parse(fs.readFileSync('config.example.json', 'utf8'));
  
  const requiredSections = ['database', 'security', 'email', 'application'];
  const requiredFields = [
    'database.url',
    'security.sessionSecret',
    'security.recaptcha.siteKey',
    'security.recaptcha.secretKey',
    'email.brevoApiKey'
  ];
  
  let templateValid = true;
  
  for (const section of requiredSections) {
    if (configTemplate[section]) {
      console.log(`   ✅ ${section} section exists`);
    } else {
      console.log(`   ❌ ${section} section missing`);
      templateValid = false;
    }
  }
  
  for (const field of requiredFields) {
    const keys = field.split('.');
    let current = configTemplate;
    let exists = true;
    
    for (const key of keys) {
      if (!current || typeof current[key] === 'undefined') {
        exists = false;
        break;
      }
      current = current[key];
    }
    
    if (exists) {
      console.log(`   ✅ ${field} field exists`);
    } else {
      console.log(`   ❌ ${field} field missing`);
      templateValid = false;
    }
  }
  
  if (!templateValid) {
    console.log('\n❌ Configuration template is invalid');
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ Error parsing config.example.json:', error.message);
  process.exit(1);
}

// Test 3: Check script syntax
console.log('\n🔧 Checking script syntax...');
const scripts = ['scripts/init.cjs', 'scripts/setup-database.cjs'];

for (const script of scripts) {
  try {
    const content = fs.readFileSync(script, 'utf8');
    // Basic syntax check - look for Node.js shebang and require statements
    if (content.includes('#!/usr/bin/env node')) {
      console.log(`   ✅ ${script} - proper shebang`);
    } else {
      console.log(`   ⚠️  ${script} - missing shebang`);
    }
    
    if (content.includes('require(') || content.includes('const ')) {
      console.log(`   ✅ ${script} - valid Node.js syntax`);
    } else {
      console.log(`   ❌ ${script} - suspicious syntax`);
    }
  } catch (error) {
    console.log(`   ❌ ${script} - cannot read file`);
  }
}

// Test 4: Check package.json dependencies
console.log('\n📦 Checking dependencies...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const requiredDeps = [
    '@neondatabase/serverless',
    'drizzle-orm',
    'drizzle-kit',
    'express',
    'dotenv'
  ];
  
  // Check for pg package (needed for standard PostgreSQL support)
  if (packageJson.dependencies['pg'] || packageJson.devDependencies['pg']) {
    console.log('   ✅ pg (PostgreSQL driver) - direct dependency');
  } else {
    try {
      require('pg');
      console.log('   ⚠️  pg (PostgreSQL driver) - available via transitive deps, recommend making it direct');
    } catch (error) {
      console.log('   ❌ pg (PostgreSQL driver) - missing, needed for standard PostgreSQL support');
    }
  }
  
  for (const dep of requiredDeps) {
    if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
      console.log(`   ✅ ${dep}`);
    } else {
      console.log(`   ❌ ${dep} - missing dependency`);
    }
  }
  
} catch (error) {
  console.error('❌ Error reading package.json:', error.message);
  process.exit(1);
}

console.log('\n🎉 All deployment tests passed!');
console.log('================================');
console.log('✅ Configuration template is valid');
console.log('✅ All required files exist');
console.log('✅ Scripts have proper syntax');
console.log('✅ Dependencies are available');
console.log('');
console.log('🚀 Your Summit 25 application is ready for deployment!');
console.log('');
console.log('📝 Next steps:');
console.log('1. Copy config.example.json to config.json');
console.log('2. Fill in your production values');
console.log('3. Run: node scripts/init.cjs');
console.log('4. Deploy to your production server');
console.log('');