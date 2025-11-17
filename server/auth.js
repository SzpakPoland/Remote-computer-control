const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, 'users.json');

// Funkcja hashowania SHA512 + bcrypt dla dodatkowego bezpieczeństwa
async function hashPassword(password) {
  const crypto = require('crypto');
  // SHA512
  const sha512Hash = crypto.createHash('sha512').update(password).digest('hex');
  // Następnie bcrypt z solą
  const salt = await bcrypt.genSalt(12);
  return await bcrypt.hash(sha512Hash, salt);
}

// Weryfikacja hasła
async function verifyPassword(password, hash) {
  const crypto = require('crypto');
  const sha512Hash = crypto.createHash('sha512').update(password).digest('hex');
  return await bcrypt.compare(sha512Hash, hash);
}

// Inicjalizacja bazy użytkowników z domyślnym kontem root
async function initializeUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    const rootPassword = await hashPassword('admin');
    const users = {
      'admin': {
        username: 'admin',
        password: rootPassword,
        role: 'root',
        createdAt: new Date().toISOString(),
        lastLogin: null
      }
    };
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    console.log('✓ Utworzono bazę użytkowników z kontem root');
  }
}

// Wczytaj użytkowników
function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

// Zapisz użytkowników
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Autentykacja użytkownika
async function authenticateUser(username, password) {
  const users = loadUsers();
  const user = users[username];
  
  if (!user) {
    return null;
  }
  
  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    return null;
  }
  
  // Aktualizuj ostatnie logowanie
  user.lastLogin = new Date().toISOString();
  users[username] = user;
  saveUsers(users);
  
  return {
    username: user.username,
    role: user.role,
    lastLogin: user.lastLogin
  };
}

// Dodaj nowego użytkownika (tylko root)
async function addUser(username, password, role = 'user') {
  const users = loadUsers();
  
  if (users[username]) {
    throw new Error('Użytkownik już istnieje');
  }
  
  const hashedPassword = await hashPassword(password);
  users[username] = {
    username,
    password: hashedPassword,
    role,
    createdAt: new Date().toISOString(),
    lastLogin: null
  };
  
  saveUsers(users);
  return { username, role };
}

// Usuń użytkownika (tylko root)
function deleteUser(username) {
  const users = loadUsers();
  
  if (!users[username]) {
    throw new Error('Użytkownik nie istnieje');
  }
  
  if (users[username].role === 'root') {
    throw new Error('Nie można usunąć konta root');
  }
  
  delete users[username];
  saveUsers(users);
  return true;
}

// Zmień hasło użytkownika
async function changePassword(username, newPassword) {
  const users = loadUsers();
  
  if (!users[username]) {
    throw new Error('Użytkownik nie istnieje');
  }
  
  const hashedPassword = await hashPassword(newPassword);
  users[username].password = hashedPassword;
  saveUsers(users);
  return true;
}

// Pobierz listę użytkowników (bez haseł)
function getUsersList() {
  const users = loadUsers();
  return Object.values(users).map(user => ({
    username: user.username,
    role: user.role,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin
  }));
}

// Sprawdź czy użytkownik jest rootem
function isRoot(username) {
  const users = loadUsers();
  return users[username]?.role === 'root';
}

module.exports = {
  initializeUsers,
  authenticateUser,
  addUser,
  deleteUser,
  changePassword,
  getUsersList,
  isRoot
};
