const jwt = require('jsonwebtoken');
require('dotenv').config();

// 验证用户登录
function authRequired(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ code: 401, message: '未登录' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ code: 401, message: '登录已过期' });
  }
}

// 验证商家身份
function authMerchant(req, res, next) {
  authRequired(req, res, () => {
    if (req.user.role !== 1) {
      return res.status(403).json({ code: 403, message: '无权限，需要商家身份' });
    }
    next();
  });
}

module.exports = { authRequired, authMerchant };
