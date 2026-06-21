const pool = require('../config/database');
const { success, fail } = require('../utils');

// 获取购物车列表
async function getCart(req, res) {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query(
      `SELECT c.id, c.dish_id, c.quantity, d.name, d.image, d.price, d.status, d.stock
       FROM carts c
       JOIN dishes d ON c.dish_id = d.id
       WHERE c.user_id = ?
       ORDER BY c.created_at ASC`,
      [userId]
    );
    res.json(success(rows));
  } catch (err) {
    res.json(fail('获取购物车失败'));
  }
}

// 添加/增加购物车
async function addToCart(req, res) {
  try {
    const userId = req.user.id;
    const { dish_id, quantity = 1 } = req.body;

    // 检查菜品是否存在
    const [dishes] = await pool.query('SELECT * FROM dishes WHERE id = ? AND status = 1', [dish_id]);
    if (dishes.length === 0) return res.json(fail('菜品不存在或已下架'));

    // 检查是否已在购物车
    const [existing] = await pool.query('SELECT * FROM carts WHERE user_id = ? AND dish_id = ?', [userId, dish_id]);
    if (existing.length > 0) {
      await pool.query('UPDATE carts SET quantity = quantity + ? WHERE user_id = ? AND dish_id = ?', [quantity, userId, dish_id]);
    } else {
      await pool.query('INSERT INTO carts (user_id, dish_id, quantity) VALUES (?, ?, ?)', [userId, dish_id, quantity]);
    }

    res.json(success(null, '添加成功'));
  } catch (err) {
    res.json(fail('添加失败'));
  }
}

// 更新购物车数量
async function updateCart(req, res) {
  try {
    const userId = req.user.id;
    const { dish_id, quantity } = req.body;

    if (quantity <= 0) {
      await pool.query('DELETE FROM carts WHERE user_id = ? AND dish_id = ?', [userId, dish_id]);
    } else {
      await pool.query('UPDATE carts SET quantity = ? WHERE user_id = ? AND dish_id = ?', [quantity, userId, dish_id]);
    }

    res.json(success(null, '更新成功'));
  } catch (err) {
    res.json(fail('更新失败'));
  }
}

// 清空购物车
async function clearCart(req, res) {
  try {
    const userId = req.user.id;
    await pool.query('DELETE FROM carts WHERE user_id = ?', [userId]);
    res.json(success(null, '已清空'));
  } catch (err) {
    res.json(fail('清空失败'));
  }
}

module.exports = { getCart, addToCart, updateCart, clearCart };
