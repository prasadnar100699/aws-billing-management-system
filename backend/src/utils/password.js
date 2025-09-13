const bcrypt = require('bcryptjs');

// Hash password
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Compare password
const comparePassword = async (password, hash) => {
  // Handle both hashed and plain text passwords for demo
  if (hash.startsWith('$')) {
    return await bcrypt.compare(password, hash);
  } else {
    // For demo purposes, allow plain text comparison
    return hash === password;
  }
};

// Validate password strength
const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters long';
  }

  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }

  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }

  if (!/\d/.test(password)) {
    return 'Password must contain at least one digit';
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return 'Password must contain at least one special character';
  }

  return null;
};

module.exports = {
  hashPassword,
  comparePassword,
  validatePassword
};