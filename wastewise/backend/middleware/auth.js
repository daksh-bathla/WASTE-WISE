const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    
    // Allow guest tokens to bypass JWT verification
    if (token.startsWith('wastewise_guest_')) {
      req.user = { id: null, email: 'guest@wastewise.local' };
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired, please login again' });
    }
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
};

const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token.startsWith('wastewise_guest_')) {
        req.user = { id: null, email: 'guest@wastewise.local' };
      } else {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: decoded.id, email: decoded.email };
      }
    } else {
      req.user = { id: null, email: 'guest@wastewise.local' };
    }
    next();
  } catch (error) {
    req.user = { id: null, email: 'guest@wastewise.local' };
    next();
  }
};

module.exports = { authMiddleware, optionalAuth };
