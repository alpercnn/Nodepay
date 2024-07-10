const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function login(email, password) {
  const response = await axios.post('https://api.nodepay.ai/auth/login', {
    email,
    password
  });
  return response.data.token;
}

async function createDatabaseFile(token) {
  const databaseContent = `const fs = require('fs').promises;
const path = require('path');

let database = {
  token: "${token}",
  stats: {
    creditsEarned: 0,
    status: "active",
    totalEarnings: 0,
    totalUptime: 0
  }
};

const updateDatabase = async (updatedData) => {
  const updatedDatabase = Object.assign({}, database);
  if ('token' in updatedData) {
    updatedDatabase.token = updatedData.token;
  }
  if ('stats' in updatedData) {
    updatedDatabase.stats = {
      ...database.stats,
      ...updatedData.stats,
    };
  }
  await fs.writeFile(path.join(__dirname, 'database.json'), JSON.stringify(updatedDatabase, null, 2));
  database = updatedDatabase;
};

const initDatabase = async () => {
  try {
    const data = await fs.readFile(path.join(__dirname, 'database.json'), 'utf8');
    database = JSON.parse(data);
  } catch (error) {
    await fs.writeFile(path.join(__dirname, 'database.json'), JSON.stringify(database, null, 2));
  }
};

module.exports = {
  database,
  updateDatabase,
  initDatabase,
};`;

  const dbPath = path.join(__dirname, 'database.js');
  await fs.writeFile(dbPath, databaseContent, 'utf8');
  console.log('database.js created and updated with new token');
}

async function main() {
  try {
    const email = await question('Enter your email: ');
    const password = await question('Enter your password: ');

    console.log('Logging in...');
    const token = await login(email, password);
    console.log('Auth token:', token);

    console.log('Creating database.js...');
    await createDatabaseFile(token);
    console.log('database.js created with new token');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    rl.close();
  }
}

main();
