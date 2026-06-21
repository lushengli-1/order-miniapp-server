-- ============================================
-- 点餐小程序 数据库建表脚本
-- ============================================

CREATE DATABASE IF NOT EXISTS order_app DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE order_app;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  openid      VARCHAR(64) NOT NULL UNIQUE COMMENT '微信openid',
  nickname    VARCHAR(64) DEFAULT '' COMMENT '昵称',
  avatar      VARCHAR(256) DEFAULT '' COMMENT '头像',
  phone       VARCHAR(20) DEFAULT '' COMMENT '手机号',
  role        TINYINT NOT NULL DEFAULT 0 COMMENT '0-普通用户 1-商家',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_openid (openid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 店铺表
CREATE TABLE IF NOT EXISTS stores (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  user_id     INT NOT NULL COMMENT '商家用户ID',
  name        VARCHAR(128) NOT NULL COMMENT '店铺名称',
  logo        VARCHAR(256) DEFAULT '' COMMENT '店铺logo',
  phone       VARCHAR(20) DEFAULT '' COMMENT '联系电话',
  address     VARCHAR(256) DEFAULT '' COMMENT '店铺地址',
  notice      VARCHAR(512) DEFAULT '' COMMENT '公告',
  status      TINYINT NOT NULL DEFAULT 1 COMMENT '0-休息中 1-营业中',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 菜品分类表
CREATE TABLE IF NOT EXISTS categories (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  store_id    INT NOT NULL,
  name        VARCHAR(64) NOT NULL COMMENT '分类名称',
  sort        INT NOT NULL DEFAULT 0 COMMENT '排序',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_store (store_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 菜品表
CREATE TABLE IF NOT EXISTS dishes (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  store_id      INT NOT NULL,
  category_id   INT NOT NULL,
  name          VARCHAR(128) NOT NULL COMMENT '菜品名称',
  image         VARCHAR(256) DEFAULT '' COMMENT '菜品图片',
  price         DECIMAL(10,2) NOT NULL COMMENT '价格',
  original_price DECIMAL(10,2) DEFAULT 0 COMMENT '原价',
  description   VARCHAR(512) DEFAULT '' COMMENT '描述',
  recipe        TEXT DEFAULT NULL COMMENT '做法说明',
  unit          VARCHAR(16) DEFAULT '份' COMMENT '单位',
  stock         INT NOT NULL DEFAULT 999 COMMENT '库存',
  sales         INT NOT NULL DEFAULT 0 COMMENT '月销量',
  status        TINYINT NOT NULL DEFAULT 1 COMMENT '0-下架 1-上架',
  sort          INT NOT NULL DEFAULT 0 COMMENT '排序',
  is_recommend  TINYINT NOT NULL DEFAULT 0 COMMENT '0-普通 1-推荐',
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_store (store_id),
  INDEX idx_category (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 购物车表
CREATE TABLE IF NOT EXISTS carts (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  user_id     INT NOT NULL,
  dish_id     INT NOT NULL,
  quantity    INT NOT NULL DEFAULT 1 COMMENT '数量',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_dish (user_id, dish_id),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  order_no      VARCHAR(32) NOT NULL UNIQUE COMMENT '订单号',
  user_id       INT NOT NULL,
  store_id      INT NOT NULL,
  total_amount  DECIMAL(10,2) NOT NULL COMMENT '总金额',
  actual_amount DECIMAL(10,2) NOT NULL COMMENT '实付金额',
  status        TINYINT NOT NULL DEFAULT 0 COMMENT '0-待支付 1-待处理 2-制作中 3-已完成 4-已取消',
  remark        VARCHAR(256) DEFAULT '' COMMENT '备注',
  table_no      VARCHAR(16) DEFAULT '' COMMENT '桌号',
  pay_time      DATETIME DEFAULT NULL COMMENT '支付时间',
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_store (store_id),
  INDEX idx_status (status),
  INDEX idx_order_no (order_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 订单明细表
CREATE TABLE IF NOT EXISTS order_items (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  order_id    INT NOT NULL,
  dish_id     INT NOT NULL,
  dish_name   VARCHAR(128) NOT NULL COMMENT '下单时的菜品名',
  dish_image  VARCHAR(256) DEFAULT '' COMMENT '下单时的菜品图片',
  price       DECIMAL(10,2) NOT NULL COMMENT '下单时单价',
  quantity    INT NOT NULL COMMENT '数量',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 初始化测试数据
INSERT INTO users (openid, nickname, role) VALUES
('merchant_001', '测试商家', 1),
('user_001', '测试用户', 0);

INSERT INTO stores (user_id, name, phone, address, notice) VALUES
(1, '美味餐厅', '13800138000', '北京市朝阳区XX路100号', '欢迎光临！本店新开业，全场8折优惠！');

INSERT INTO categories (store_id, name, sort) VALUES
(1, '热销推荐', 0),
(1, '川湘菜', 1),
(1, '粤菜', 2),
(1, '饮品', 3),
(1, '主食', 4);

INSERT INTO dishes (store_id, category_id, name, image, price, original_price, description, sales, is_recommend) VALUES
(1, 1, '招牌红烧肉', '', 48.00, 58.00, '肥而不腻，入口即化', 128, 1),
(1, 1, '糖醋里脊', '', 38.00, 45.00, '酸甜可口', 96, 1),
(1, 1, '麻婆豆腐', '', 18.00, 22.00, '麻辣鲜香', 85, 0),
(1, 2, '水煮鱼', '', 68.00, 78.00, '鲜嫩麻辣', 76, 1),
(1, 2, '宫保鸡丁', '', 32.00, 38.00, '经典川菜', 65, 0),
(1, 2, '回锅肉', '', 36.00, 42.00, '肥而不腻', 58, 0),
(1, 3, '白切鸡', '', 45.00, 52.00, '皮爽肉滑', 42, 0),
(1, 3, '清蒸鲈鱼', '', 58.00, 68.00, '鲜嫩可口', 38, 0),
(1, 4, '可乐', '', 5.00, 6.00, '冰镇可乐', 200, 0),
(1, 4, '雪碧', '', 5.00, 6.00, '冰镇雪碧', 180, 0),
(1, 4, '酸梅汤', '', 8.00, 10.00, '自制酸梅汤', 150, 0),
(1, 5, '米饭', '', 2.00, 3.00, '东北大米', 500, 0),
(1, 5, '馒头', '', 1.50, 2.00, '手工馒头', 300, 0);
