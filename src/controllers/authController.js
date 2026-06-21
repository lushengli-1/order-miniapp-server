const pool = require('../config/database');
const jwt = require('jsonwebtoken');
const { success, fail } = require('../utils');
require('dotenv').config();

// 微信登录（简化版：直接使用openid）
async function login(req, res) {
  try {
    const { openid, nickname = '', avatar = '' } = req.body;
    if (!openid) {
      return res.json(fail('openid不能为空'));
    }

    // 查找或创建用户
    const [rows] = await pool.query('SELECT * FROM users WHERE openid = ?', [openid]);
    let user;
    if (rows.length === 0) {
      const [result] = await pool.query(
        'INSERT INTO users (openid, nickname, avatar) VALUES (?, ?, ?)',
        [openid, nickname, avatar]
      );
      user = { id: result.insertId, openid, nickname, avatar, role: 0 };
    } else {
      user = rows[0];
      if (nickname && nickname !== user.nickname) {
        await pool.query('UPDATE users SET nickname = ?, avatar = ? WHERE id = ?', [nickname, avatar, user.id]);
        user.nickname = nickname;
        user.avatar = avatar;
      }
    }

    const token = jwt.sign(
      { id: user.id, openid: user.openid, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json(success({ token, user: { id: user.id, nickname: user.nickname, avatar: user.avatar, role: user.role } }));
  } catch (err) {
    console.error('登录失败:', err);
    res.json(fail('登录失败'));
  }
}

// 获取用户信息
async function getUserInfo(req, res) {
  try {
    const [rows] = await pool.query('SELECT id, openid, nickname, avatar, phone, role FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.json(fail('用户不存在'));
    res.json(success(rows[0]));
  } catch (err) {
    res.json(fail('获取失败'));
  }
}

module.exports = { login, getUserInfo };
