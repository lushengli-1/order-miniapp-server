const pool = require('../config/database');
const { success, fail, generateOrderNo, getPagination } = require('../utils');

// 创建订单
async function createOrder(req, res) {
  const conn = await pool.getConnection();
  try {
    const userId = req.user.id;
    const { items, remark = '', table_no = '' } = req.body;

    if (!items || items.length === 0) {
      return res.json(fail('请选择菜品'));
    }

    await conn.beginTransaction();

    // 获取用户默认店铺（简化：固定store_id=1）
    const storeId = 1;

    // 计算总价并检查库存
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const [dishes] = await conn.query('SELECT * FROM dishes WHERE id = ? AND status = 1', [item.dish_id]);
      if (dishes.length === 0) {
        await conn.rollback();
        return res.json(fail(`菜品ID ${item.dish_id} 不存在或已下架`));
      }

      const dish = dishes[0];
      if (dish.stock < item.quantity) {
        await conn.rollback();
        return res.json(fail(`${dish.name} 库存不足`));
      }

      totalAmount += dish.price * item.quantity;
      orderItems.push({
        dish_id: dish.id,
        dish_name: dish.name,
        dish_image: dish.image,
        price: dish.price,
        quantity: item.quantity
      });
    }

    // 生成订单号
    const orderNo = generateOrderNo();

    // 插入订单
    const [orderResult] = await conn.query(
      'INSERT INTO orders (order_no, user_id, store_id, total_amount, actual_amount, remark, table_no, status) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
      [orderNo, userId, storeId, totalAmount, totalAmount, remark, table_no]
    );

    const orderId = orderResult.insertId;

    // 插入订单明细
    for (const item of orderItems) {
      await conn.query(
        'INSERT INTO order_items (order_id, dish_id, dish_name, dish_image, price, quantity) VALUES (?, ?, ?, ?, ?, ?)',
        [orderId, item.dish_id, item.dish_name, item.dish_image, item.price, item.quantity]
      );

      // 扣减库存、增加销量
      await conn.query('UPDATE dishes SET stock = stock - ?, sales = sales + ? WHERE id = ?', [item.quantity, item.quantity, item.dish_id]);
    }

    // 清空购物车中已下单的菜品
    const dishIds = items.map(i => i.dish_id);
    await conn.query(`DELETE FROM carts WHERE user_id = ? AND dish_id IN (${dishIds.map(() => '?').join(',')})`, [userId, ...dishIds]);

    await conn.commit();

    res.json(success({ order_id: orderId, order_no: orderNo, total_amount: totalAmount }, '下单成功'));
  } catch (err) {
    await conn.rollback();
    console.error('创建订单失败:', err);
    res.json(fail('下单失败'));
  } finally {
    conn.release();
  }
}

// 获取用户订单列表
async function getUserOrders(req, res) {
  try {
    const userId = req.user.id;
    const { status } = req.query;
    const { page, pageSize, offset } = getPagination(req.query);

    let query = 'SELECT * FROM orders WHERE user_id = ?';
    const params = [userId];

    if (status !== undefined && status !== '') {
      query += ' AND status = ?';
      params.push(parseInt(status));
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const [rows] = await pool.query(query, params);
    res.json(success({ list: rows, page, pageSize }));
  } catch (err) {
    res.json(fail('获取订单失败'));
  }
}

// 获取订单详情
async function getOrderDetail(req, res) {
  try {
    const { id } = req.params;
    const [orders] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
    if (orders.length === 0) return res.json(fail('订单不存在'));
    const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [id]);
    res.json(success({ ...orders[0], items }));
  } catch (err) {
    res.json(fail('获取失败'));
  }
}

// 取消订单
async function cancelOrder(req, res) {
  try {
    const { id } = req.params;
    const [orders] = await pool.query('SELECT * FROM orders WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (orders.length === 0) return res.json(fail('订单不存在'));
    if (orders[0].status > 1) return res.json(fail('当前状态无法取消'));

    await pool.query('UPDATE orders SET status = 4 WHERE id = ?', [id]);

    // 恢复库存
    const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [id]);
    for (const item of items) {
      await pool.query('UPDATE dishes SET stock = stock + ?, sales = sales - ? WHERE id = ?', [item.quantity, item.quantity, item.dish_id]);
    }

    res.json(success(null, '已取消'));
  } catch (err) {
    res.json(fail('取消失败'));
  }
}

// ====== 商家端 ======

// 商家获取订单列表
async function merchantGetOrders(req, res) {
  try {
    const { status, page, pageSize, offset } = getPagination(req.query);
    let query = 'SELECT o.*, u.nickname FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE 1=1';
    const params = [];

    if (status !== undefined && status !== '') {
      query += ' AND o.status = ?';
      params.push(parseInt(status));
    }

    query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const [rows] = await pool.query(query, params);
    res.json(success({ list: rows, page, pageSize }));
  } catch (err) {
    res.json(fail('获取订单失败'));
  }
}

// 商家更新订单状态
async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validTransitions = { 1: 2, 2: 3 };
    if (!validTransitions[status]) {
      return res.json(fail('无效的状态变更'));
    }

    await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    res.json(success(null, '更新成功'));
  } catch (err) {
    res.json(fail('更新失败'));
  }
}

// 商家端统计数据
async function getStatistics(req, res) {
  try {
    const storeId = 1;

    // 今日营业额
    const [todaySales] = await pool.query(
      'SELECT COALESCE(SUM(actual_amount), 0) as total FROM orders WHERE store_id = ? AND DATE(created_at) = CURDATE() AND status = 3',
      [storeId]
    );

    // 今日订单数
    const [todayOrders] = await pool.query(
      'SELECT COUNT(*) as count FROM orders WHERE store_id = ? AND DATE(created_at) = CURDATE()',
      [storeId]
    );

    // 待处理订单
    const [pendingOrders] = await pool.query(
      'SELECT COUNT(*) as count FROM orders WHERE store_id = ? AND status = 1',
      [storeId]
    );

    // 进行中
    const [processingOrders] = await pool.query(
      'SELECT COUNT(*) as count FROM orders WHERE store_id = ? AND status = 2',
      [storeId]
    );

    // 总菜品数
    const [totalDishes] = await pool.query(
      'SELECT COUNT(*) as count FROM dishes WHERE store_id = ?', [storeId]
    );

    // 最近7天订单趋势
    const [trend] = await pool.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count, COALESCE(SUM(actual_amount), 0) as amount
       FROM orders WHERE store_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY DATE(created_at) ORDER BY date ASC`,
      [storeId]
    );

    res.json(success({
      todaySales: todaySales[0].total,
      todayOrders: todayOrders[0].count,
      pendingOrders: pendingOrders[0].count,
      processingOrders: processingOrders[0].count,
      totalDishes: totalDishes[0].count,
      trend
    }));
  } catch (err) {
    res.json(fail('获取统计失败'));
  }
}

module.exports = { createOrder, getUserOrders, getOrderDetail, cancelOrder, merchantGetOrders, updateOrderStatus, getStatistics };
