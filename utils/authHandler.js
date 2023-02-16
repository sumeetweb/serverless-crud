// Validate JWT token and return the decoded token
// If the token is invalid, return null

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;

module.exports.decode = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.log(error);
    return null;
  }
}

module.exports.encode = (payload) => {
  if (!payload) {
    throw new Error('Payload is required');
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' } );
}

module.exports.generateToken = (user) => {
  if (!user) {
    throw new Error('User is required');
  }
  const payload = {
    userId: user.userId,
    name: user.name,
    userGroup: user.userGroup,
    userType: user.userType,
  };
  return module.exports.encode(payload);
}

module.exports.validate = (req, res, next) => {
  const token = req.headers.authorization;
  if (token) {
    const decodedToken = module.exports.decode(token);
    if (decodedToken) {
      req.user = decodedToken;
      next();
    } else {
      res.status(401).json({ error: 'Invalid token' });
    }
  } else {
    res.status(401).json({ error: 'No token provided' });
  }
}

module.exports.validateAdmin = (req, res, next) => {
  const token = req.headers.authorization;
  if (token) {
    const decodedToken = module.exports.decode(token);
    if (decodedToken) {
      req.user = decodedToken;
      if (decodedToken.userGroup.includes('admin')) {
        next();
      } else {
        res.status(403).json({ error: 'Unauthorized' });
      }
    } else {
      res.status(401).json({ error: 'Invalid token' });
    }
  }
}
