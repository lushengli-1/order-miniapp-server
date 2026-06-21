const express = require('express');
const multer = require('multer');
const path = require('path');
const { authRequired, authMerchant } = require('../middleware/auth');
const authController = require('../controllers/authController');
const dishController = require('../controllers/dishController');
const cartController = require('../controllers/cartController');
const orderController = require('../controllers/orderController');

const router = express.Router();

// 文件上传配置
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ===== 用户认证 =====
router.post('/auth/login', authController.login);
router.get('/auth/userinfo', authRequired, authController.getUserInfo);

// ===== 店铺 & 菜品（公开） =====
router.get('/store/:storeId?', dishController.getStoreInfo);
router.get('/categories/:storeId?', dishController.getCategories);
router.get('/dishes/:storeId?', dishController.getDishes);
router.get('/dishes/recommend/:storeId?', dishController.getRecommendedDishes);
router.get('/dishes/search/:storeId?', dishController.searchDishes);
router.get('/dish/:id', dishController.getDishDetail);

// ===== 购物车（需登录） =====
router.get('/cart', authRequired, cartController.getCart);
router.post('/cart/add', authRequired, cartController.addToCart);
router.post('/cart/update', authRequired, cartController.updateCart);
router.post('/cart/clear', authRequired, cartController.clearCart);

// ===== 订单（用户端） =====
router.post('/order/create', authRequired, orderController.createOrder);
router.post('/order/:id/pay', authRequired, orderController.payOrder);
router.get('/order/list', authRequired, orderController.getUserOrders);
router.get('/order/:id', authRequired, orderController.getOrderDetail);
router.post('/order/:id/cancel', authRequired, orderController.cancelOrder);

// ===== 商家端 =====
router.get('/merchant/statistics', authMerchant, orderController.getStatistics);

// 菜品管理
router.get('/merchant/dishes/:storeId?', authMerchant, dishController.merchantGetDishes);
router.post('/merchant/dish/add/:storeId?', authMerchant, upload.single('image'), dishController.addDish);
router.post('/merchant/dish/update/:id', authMerchant, upload.single('image'), dishController.updateDish);
router.post('/merchant/dish/delete/:id', authMerchant, dishController.deleteDish);

// 分类管理
router.get('/merchant/categories/:storeId?', authMerchant, dishController.merchantGetCategories);
router.post('/merchant/category/add/:storeId?', authMerchant, dishController.addCategory);
router.post('/merchant/category/update/:id', authMerchant, dishController.updateCategory);
router.post('/merchant/category/delete/:id', authMerchant, dishController.deleteCategory);

// 店铺管理
router.post('/merchant/store/update/:storeId?', authMerchant, dishController.updateStore);

// 订单管理
router.get('/merchant/orders', authMerchant, orderController.merchantGetOrders);
router.post('/merchant/order/:id/status', authMerchant, orderController.updateOrderStatus);

module.exports = router;
