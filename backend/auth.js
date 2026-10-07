import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_super_seguro_zuzu';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: "Acceso denegado" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      const isExpired = err.name === 'TokenExpiredError';
      return res.status(403).json({ 
        error: isExpired ? "Sesión expirada" : "Sesión expirada o inválida",
        expired: true 
      });
    }
    req.user = user;
    next();
  });
};

export const authorizeRole = (roles) => {
  const normalizedRoles = roles.map(r => String(r).toLowerCase());
  return (req, res, next) => {
    const userRole = String(req.user?.rol || '').toLowerCase();
    if (!normalizedRoles.includes(userRole)) {
      return res.status(403).json({ error: "No tienes permisos para esta acción" });
    }
    next();
  };
};