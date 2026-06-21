const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const routes = require('./src/routes');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件（上传的图片）
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 所有 API 路由
app.use('/api', routes);

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ code: -1, message: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`点餐小程序后端已启动: http://localhost:${PORT}`);
});
