const User = require('../models/User');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer'); // For email sending

// Handle errors
const handleErrors = (err) => {
  let errors = { email: '', password: '' };

  if (err.message === 'Incorrect email') {
    errors.email = 'This email is not registered';
  }

  if (err.message === 'Incorrect password') {
    errors.password = 'This password is incorrect';
  }

  if (err.code === 11000) {
    errors.email = 'This email is already registered.';
    return errors;
  }

  if (err.message.includes('user validation failed')) {
    Object.values(err.errors).forEach(({ properties }) => {
      errors[properties.path] = properties.message;
    });
  }

  return errors;
};

// JWT max age (7 days)
const maxAge = 7 * 24 * 60 * 60; // equal to 7 days in seconds

// Create JWT token
const createJWT = (id) => {
  return jwt.sign({ id }, process.env.JWT_PRIVATE_KEY, {
    expiresIn: maxAge
  });
};

// --- DSA Concept: Hashing ---

// A basic Hashing example to store emails in a hash table (simulated)
let emailHashTable = {}; // Simulated hash table to store emails

const hashEmail = (email) => {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = (hash << 5) - hash + email.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
};

const storeEmailInHashTable = (email) => {
  const hashedEmail = hashEmail(email);
  emailHashTable[hashedEmail] = email;
  console.log(`Email stored with hash: ${hashedEmail}`);
};

const isEmailRegistered = (email) => {
  const hashedEmail = hashEmail(email);
  return emailHashTable[hashedEmail] !== undefined;
};

// --- DSA Concept: Searching ---

// Simulated linear search to demonstrate searching for a user in an array (this could be in an actual database)
const searchUserByEmail = (email, usersArray) => {
  for (let user of usersArray) {
    if (user.email === email) {
      return user;
    }
  }
  return null; // User not found
};

// Register GET route
exports.register_get = (req, res) => {
  res.render('auth/register');
};

// Login GET route
exports.login_get = (req, res) => {
  res.render('auth/login');
};

// Register POST route
exports.register_post = (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).json({
      errors: {
        password: `Password doesn't match!`,
        confirmPassword: `Password doesn't match!`,
      }
    });
  }

  // --- DSA Concept: Hashing (to simulate efficient email check) ---
  if (isEmailRegistered(email)) {
    return res.status(400).json({
      errors: {
        email: 'This email is already registered.'
      }
    });
  }

  // Store email in hash table for quick future lookup
  storeEmailInHashTable(email);

  User.create({ name, email, password })
    .then(user => {
      const token = createJWT(user._id);
      res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000 });
      res.status(201).json({ user: user._id });
    })
    .catch(err => {
      const errors = handleErrors(err);
      res.status(400).json({ errors });
    });
};

// Login POST route
exports.login_post = (req, res) => {
  const { email, password } = req.body;

  User.login(email, password)
    .then(user => {
      const token = createJWT(user._id);
      res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000 });
      res.status(201).json({ user: user._id, role: user.role });
    })
    .catch(err => {
      const errors = handleErrors(err);
      res.status(400).json({ errors });
    });
};

// Logout route
exports.logout = (req, res) => {
  res.cookie('jwt', '', { maxAge: 1 });
  res.redirect('/');
};

// Password reset request (send email to reset password)
const sendPasswordResetEmail = (email, userId) => {
  const resetToken = jwt.sign({ id: userId }, process.env.JWT_PRIVATE_KEY, { expiresIn: '1h' });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset Request',
    html: `
      <h1>Password Reset</h1>
      <p>Click the link below to reset your password:</p>
      <a href="http://localhost:3000/reset-password/${resetToken}">Reset Password</a>
    `,
  };

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // Your email address
      pass: process.env.EMAIL_PASS, // Your email password
    },
  });

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error('Error sending email: ', err);
    } else {
      console.log('Password reset email sent: ', info.response);
    }
  });
};

// Password reset request POST route
exports.password_reset_request = (req, res) => {
  const { email } = req.body;

  User.findOne({ email })
    .then(user => {
      if (!user) {
        return res.status(400).json({ errors: { email: 'Email not found' } });
      }

      // Send password reset email
      sendPasswordResetEmail(email, user._id);
      res.status(200).json({ message: 'Password reset email sent' });
    })
    .catch(err => {
      const errors = handleErrors(err);
      res.status(400).json({ errors });
    });
};

// Reset password via token POST route
exports.reset_password_post = (req, res) => {
  const { resetToken, newPassword } = req.body;

  jwt.verify(resetToken, process.env.JWT_PRIVATE_KEY, (err, decoded) => {
    if (err) {
      return res.status(400).json({ errors: { token: 'Invalid or expired token' } });
    }

    User.findById(decoded.id)
      .then(user => {
        user.password = newPassword;
        user.save()
          .then(() => {
            res.status(200).json({ message: 'Password successfully reset' });
          })
          .catch(err => {
            const errors = handleErrors(err);
            res.status(400).json({ errors });
          });
      })
      .catch(err => {
        const errors = handleErrors(err);
        res.status(400).json({ errors });
      });
  });
};
