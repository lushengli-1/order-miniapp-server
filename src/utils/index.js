const dayjs = require('dayjs');

// 生成订单号: 日期 + 6位随机数
function generateOrderNo() {
  const date = dayjs().format('YYYYMMDDHHmmss');
  const rand = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `DD${date}${rand}`;
}

// 分页参数
function getPagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize) || 10));
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

// 统一响应
function success(data = null, message = 'ok') {
  return { code: 0, message, data };
}

function fail(message = 'error', code = -1) {
  return { code, message };
}

module.exports = { generateOrderNo, getPagination, success, fail };
