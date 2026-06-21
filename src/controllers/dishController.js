const pool = require('../config/database');
const { success, fail } = require('../utils');

// 获取店铺信息
async function getStoreInfo(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM stores WHERE id = ?', [req.params.storeId || 1]);
    if (rows.length === 0) return res.json(fail('店铺不存在'));
    res.json(success(rows[0]));
  } catch (err) {
    res.json(fail('获取失败'));
  }
}

// 获取菜品分类
async function getCategories(req, res) {
  try {
    const storeId = req.params.storeId || 1;
    const [rows] = await pool.query('SELECT * FROM categories WHERE store_id = ? ORDER BY sort ASC', [storeId]);
    res.json(success(rows));
  } catch (err) {
    res.json(fail('获取分类失败'));
  }
}

// 获取菜品列表（支持按分类筛选）
async function getDishes(req, res) {
  try {
    const storeId = req.params.storeId || 1;
    const categoryId = req.query.category_id;
    let query = 'SELECT * FROM dishes WHERE store_id = ? AND status = 1';
    const params = [storeId];

    if (categoryId) {
      query += ' AND category_id = ?';
      params.push(categoryId);
    }
    query += ' ORDER BY sort ASC, id ASC';

    const [rows] = await pool.query(query, params);
    res.json(success(rows));
  } catch (err) {
    res.json(fail('获取菜品失败'));
  }
}

// 获取推荐菜品
async function getRecommendedDishes(req, res) {
  try {
    const storeId = req.params.storeId || 1;
    const [rows] = await pool.query(
      'SELECT * FROM dishes WHERE store_id = ? AND status = 1 AND is_recommend = 1 ORDER BY sales DESC LIMIT 6',
      [storeId]
    );
    res.json(success(rows));
  } catch (err) {
    res.json(fail('获取推荐菜品失败'));
  }
}

// 搜索菜品
async function searchDishes(req, res) {
  try {
    const storeId = req.params.storeId || 1;
    const keyword = req.query.keyword || '';
    const [rows] = await pool.query(
      'SELECT * FROM dishes WHERE store_id = ? AND status = 1 AND name LIKE ? ORDER BY sales DESC',
      [storeId, `%${keyword}%`]
    );
    res.json(success(rows));
  } catch (err) {
    res.json(fail('搜索失败'));
  }
}

// 获取单个菜品详情
async function getDishDetail(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM dishes WHERE id = ? AND status = 1', [id]);
    if (rows.length === 0) return res.json(fail('菜品不存在'));
    res.json(success(rows[0]));
  } catch (err) {
    res.json(fail('获取失败'));
  }
}

// ====== 商家端 ======

// 商家获取所有菜品（含下架）
async function merchantGetDishes(req, res) {
  try {
    const storeId = req.params.storeId || 1;
    const [rows] = await pool.query(
      'SELECT d.*, c.name as category_name FROM dishes d LEFT JOIN categories c ON d.category_id = c.id WHERE d.store_id = ? ORDER BY d.sort ASC, d.id ASC',
      [storeId]
    );
    res.json(success(rows));
  } catch (err) {
    res.json(fail('获取菜品失败'));
  }
}

// 添加菜品
async function addDish(req, res) {
  try {
    const storeId = req.params.storeId || 1;
    const { category_id, name, price, original_price, description, recipe, unit, stock, sort, is_recommend } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : '';

    const [result] = await pool.query(
      'INSERT INTO dishes (store_id, category_id, name, image, price, original_price, description, recipe, unit, stock, sort, is_recommend) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [storeId, category_id, name, image, price, original_price || 0, description || '', recipe || null, unit || '份', stock || 999, sort || 0, is_recommend || 0]
    );
    res.json(success({ id: result.insertId }, '添加成功'));
  } catch (err) {
    res.json(fail('添加失败'));
  }
}

// 更新菜品
async function updateDish(req, res) {
  try {
    const { id } = req.params;
    const { category_id, name, price, original_price, description, recipe, unit, stock, status, sort, is_recommend } = req.body;

    let imageSql = '';
    const params = [];
    if (req.file) {
      imageSql = ', image = ?';
      params.push(`/uploads/${req.file.filename}`);
    }

    params.push(category_id, name, price, original_price || 0, description || '', recipe || null, unit || '份', stock || 0, status ?? 1, sort || 0, is_recommend || 0, id);

    await pool.query(
      `UPDATE dishes SET category_id = ?, name = ?, price = ?, original_price = ?, description = ?, recipe = ?, unit = ?, stock = ?, status = ?, sort = ?, is_recommend = ?${imageSql} WHERE id = ?`,
      params
    );
    res.json(success(null, '更新成功'));
  } catch (err) {
    res.json(fail('更新失败'));
  }
}

// 删除菜品
async function deleteDish(req, res) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM dishes WHERE id = ?', [id]);
    res.json(success(null, '删除成功'));
  } catch (err) {
    res.json(fail('删除失败'));
  }
}

// 商家管理分类
async function merchantGetCategories(req, res) {
  try {
    const storeId = req.params.storeId || 1;
    const [rows] = await pool.query('SELECT * FROM categories WHERE store_id = ? ORDER BY sort ASC', [storeId]);
    res.json(success(rows));
  } catch (err) {
    res.json(fail('获取分类失败'));
  }
}

async function addCategory(req, res) {
  try {
    const storeId = req.params.storeId || 1;
    const { name, sort } = req.body;
    const [result] = await pool.query('INSERT INTO categories (store_id, name, sort) VALUES (?, ?, ?)', [storeId, name, sort || 0]);
    res.json(success({ id: result.insertId }, '添加成功'));
  } catch (err) {
    res.json(fail('添加失败'));
  }
}

async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const { name, sort } = req.body;
    await pool.query('UPDATE categories SET name = ?, sort = ? WHERE id = ?', [name, sort, id]);
    res.json(success(null, '更新成功'));
  } catch (err) {
    res.json(fail('更新失败'));
  }
}

async function deleteCategory(req, res) {
  try {
    const { id } = req.params;
    // 检查该分类下是否有菜品
    const [dishes] = await pool.query('SELECT COUNT(*) as count FROM dishes WHERE category_id = ?', [id]);
    if (dishes[0].count > 0) {
      return res.json(fail('该分类下有菜品，无法删除'));
    }
    await pool.query('DELETE FROM categories WHERE id = ?', [id]);
    res.json(success(null, '删除成功'));
  } catch (err) {
    res.json(fail('删除失败'));
  }
}

module.exports = {
  getStoreInfo, getCategories, getDishes, getRecommendedDishes, searchDishes, getDishDetail,
  merchantGetDishes, addDish, updateDish, deleteDish,
  merchantGetCategories, addCategory, updateCategory, deleteCategory
};
