const jwt = require('jsonwebtoken');

function auth(requiredRoles = []) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : header;

    // If no token provided
    if (!token) {
      // If route requires roles, token is mandatory
      if (requiredRoles.length) return res.status(401).json({ message: 'Missing token' });
      // Public route - proceed without attaching user
      return next();
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'replace_with_a_strong_secret');
      req.user = payload;
      if (requiredRoles.length && !requiredRoles.includes(payload.role)) {
        return res.status(403).json({ message: 'Forbidden - insufficient role' });
      }
      next();
    } catch (err) {
      // If roles are required, invalid token is an error. For public routes, allow continuing anonymously.
      if (requiredRoles.length) return res.status(401).json({ message: 'Invalid token' });
      return next();
    }
  };
}

module.exports = auth;
