# 数据库设计模式与最佳实践

## 目录
1. [常见业务场景数据模型](#常见业务场景数据模型)
2. [设计反模式（避坑指南）](#设计反模式避坑指南)
3. [性能优化模式](#性能优化模式)
4. [多租户设计](#多租户设计)
5. [数据安全与合规](#数据安全与合规)
6. [迁移策略](#迁移策略)
7. [容量规划](#容量规划)

---

## 常见业务场景数据模型

### 用户系统
```sql
-- 用户主表（精简核心字段）
users: id, openid, nickname, avatar, phone, email, status, created_at

-- 用户扩展表（1:1，避免主表过宽）
user_profiles: user_id(PK/FK), real_name, id_card, bio, birthday, gender

-- 第三方登录绑定
user_oauth: id, user_id, provider, provider_uid, access_token, expires_at
```

### 电商订单系统
```sql
-- 快照模式（关键！避免商品改价影响历史订单）
orders:       id, user_id, total_amount, status, address_snapshot(JSON), created_at
order_items:  id, order_id, product_id, product_name(冗余), price(快照), quantity, subtotal
products:     id, name, price, stock, status

-- 地址管理
user_addresses: id, user_id, receiver, phone, province, city, district, detail, is_default
```

### 内容/CMS 系统
```sql
-- 文章系统
posts:         id, author_id, title, slug(唯一), content, status, view_count, created_at
post_tags:     post_id, tag_id              -- M:N 关联
tags:          id, name, slug, use_count
categories:    id, parent_id, name, path    -- 树形结构
comments:      id, post_id, user_id, parent_id(自关联), content, status
```

### 权限/RBAC 系统
```sql
users:           id, ...
roles:           id, name, code, description
permissions:     id, resource, action, description    -- 如 'post:create'
user_roles:      user_id, role_id                     -- 用户-角色 M:N
role_permissions: role_id, permission_id              -- 角色-权限 M:N
```

### 星星/钱包系统
```sql
-- 账户余额（单行记录，乐观锁控制并发）
wallets: id, user_id, balance DECIMAL(18,2), version INT, updated_at

-- 流水记录（只增不改，完整审计链）
wallet_transactions: id, user_id, type(income/expense/freeze),
                     amount, balance_before, balance_after,
                     biz_type, biz_id, remark, created_at
-- 原则：余额 = SUM(所有流水)，可对账验证
```

### 消息/通知系统
```sql
-- 系统通知
notifications: id, user_id, type, title, content, is_read, read_at, created_at

-- IM 消息（高频写，考虑分表）
messages: id, session_id, sender_id, content, msg_type, status, created_at
sessions: id, type(single/group), last_message_id, updated_at
session_members: session_id, user_id, joined_at, last_read_at
```

### 配置/字典系统
```sql
-- 系统配置（键值）
sys_configs: id, key(唯一), value, type(string/json/bool), description, updated_at

-- 数据字典（枚举管理）
dict_types:  id, code, name
dict_items:  id, type_code, item_code, item_name, sort, extra_data(JSON)
```

---

## 设计反模式（避坑指南）

### ❌ 反模式 1：EAV（实体-属性-值）滥用
```sql
-- 错误：用 EAV 存储结构化数据
entity_attributes:
  entity_id | attr_name     | attr_value
  1         | 'user_name'   | '张三'
  1         | 'age'         | '25'

-- 问题：查询复杂、无法建索引、类型不安全
-- 正确：结构化字段 + JSON 扩展列
users: id, name, age, extra_data JSON
```

### ❌ 反模式 2：用逗号分隔存储多值
```sql
-- 错误
posts: id, tag_ids='1,2,3'

-- 无法用索引、无法 JOIN、难维护
-- 正确：关联表
post_tags: post_id, tag_id
```

### ❌ 反模式 3：全局状态枚举表
```sql
-- 错误：一张表装所有状态
status_master: entity_type, status_code, status_name

-- 问题：枚举无法约束、查询需要 JOIN
-- 正确：每个业务表独立维护状态，配合 CHECK 约束或应用层枚举
```

### ❌ 反模式 4：宽表滥用
```sql
-- 错误：几十列的宽表
users: id, name, phone, email, addr1, addr2, addr3,
       pref1, pref2, pref3, extra1, extra2, ...

-- 问题：大量 NULL、难以扩展、读放大
-- 正确：主表 + 扩展表/JSON列
```

### ❌ 反模式 5：直接删除（无审计）
```sql
-- 错误：DELETE FROM orders WHERE id = 1
-- 正确：软删除 + 操作日志
UPDATE orders SET deleted_at = NOW() WHERE id = 1
INSERT INTO audit_logs (table_name, record_id, action, operator_id) VALUES (...)
```

### ❌ 反模式 6：数据库存业务逻辑
```sql
-- 避免复杂存储过程、触发器执行业务逻辑
-- 原因：难以测试、难以版本控制、难以水平扩展
-- 正确：DB 只做数据存取，业务逻辑在应用层
-- 例外：简单约束（CHECK、唯一键）可保留在 DB
```

---

## 性能优化模式

### 读写分离
```
写操作 → 主库（Master）
读操作 → 从库（Replica） × N

注意：
- 主从同步有延迟（通常 < 1s）
- 写后立即读需指定走主库
- 事务必须在同一节点
```

### 分库分表策略

**垂直分库**（按业务域拆分）：
```
用户库 db_user:    users, user_profiles, user_oauth
订单库 db_order:   orders, order_items
商品库 db_product: products, categories, inventory
```

**水平分表**（按数据量拆分）：
```
-- 按用户ID取模
orders_0, orders_1, ..., orders_N
shard_key = user_id % N

-- 按时间分表（日志、记录类）
logs_202401, logs_202402

-- 分表字段选择原则：
1. 高频查询的过滤字段
2. 数据分布均匀（避免热点）
3. 一旦确定不易更改
```

### 缓存分层策略
```
L1：应用内存缓存（本地Map）   — 最快，节点独立，容量小
L2：Redis 分布式缓存           — 共享，毫秒级，容量中
L3：数据库查询缓存             — 最慢，数据源
```

### 冷热数据分离
```sql
-- 归档方案：将历史数据移至归档表
CREATE TABLE orders_archive LIKE orders;
INSERT INTO orders_archive SELECT * FROM orders WHERE created_at < '2023-01-01';
DELETE FROM orders WHERE created_at < '2023-01-01';

-- 查询时 UNION 或通过路由层决定查哪张表
```

### 批量操作优化
```sql
-- ❌ 循环单条 INSERT（N 次网络往返）
-- ✅ 批量 INSERT（单次往返）
INSERT INTO items (name, value) VALUES
  ('a', 1), ('b', 2), ('c', 3), ...;  -- 建议每批 500-1000 条

-- 批量更新用 CASE WHEN
UPDATE products SET price = CASE id
  WHEN 1 THEN 99.0
  WHEN 2 THEN 199.0
END WHERE id IN (1, 2);
```

---

## 多租户设计

### 方案对比
| 方案 | 隔离性 | 成本 | 适用场景 |
|------|--------|------|----------|
| 独立数据库 | 最强 | 最高 | 大型企业客户、强合规要求 |
| 独立 Schema | 强 | 中 | 中型 SaaS |
| 共享表 + tenant_id | 弱 | 最低 | ✅ 小型 SaaS 首选 |

### 共享表模式实现
```sql
-- 每张业务表加 tenant_id
ALTER TABLE users ADD COLUMN tenant_id INT NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN tenant_id INT NOT NULL DEFAULT 0;

-- 必须在所有查询中加 tenant_id 过滤（应用层中间件强制注入）
SELECT * FROM users WHERE tenant_id = ? AND id = ?;

-- 联合索引必含 tenant_id
KEY idx_tenant_email (tenant_id, email)
```

---

## 数据安全与合规

### 敏感数据处理
```
手机号：存储加密，展示脱敏（138****8000）
身份证：存储加密 + 脱敏
密码：bcrypt/argon2 哈希，永远不存明文
银行卡：满足 PCI DSS，通常外包给第三方支付

加密策略：
  - 字段级加密：应用层加密再存入 DB
  - 透明数据加密（TDE）：DB 层落盘加密
```

### 数据审计
```sql
-- 操作审计日志（不可删改）
audit_logs:
  id BIGINT AUTO_INCREMENT,
  table_name VARCHAR(64),
  record_id BIGINT,
  action ENUM('INSERT','UPDATE','DELETE'),
  old_data JSON,             -- 变更前快照
  new_data JSON,             -- 变更后快照
  operator_id BIGINT,
  operator_ip VARCHAR(45),
  created_at DATETIME
```

### GDPR / 隐私合规
- 用户数据支持导出（所有关联表）
- 注销账号支持数据删除（或匿名化）
- 个人数据最小化原则：只收集必要字段
- 数据保留期限：按业务规则定期清理

---

## 迁移策略

### 零停机迁移（蓝绿迁移）
```
阶段1：新列添加（可选，允许 NULL）
阶段2：代码同时写新旧列
阶段3：数据回填（批量更新旧数据）
阶段4：代码切换读取新列
阶段5：删除旧列（可选，谨慎）
```

### 大表加列（避免锁表）
```sql
-- MySQL 5.6+ ALGORITHM=INPLACE 在线 DDL
ALTER TABLE big_table ADD COLUMN extra VARCHAR(100) NULL,
  ALGORITHM=INPLACE, LOCK=NONE;

-- 极大表用 pt-online-schema-change 或 gh-ost
```

### 版本化迁移工具
- **Flyway**：SQL 文件版本控制，V1__init.sql, V2__add_index.sql
- **Liquibase**：XML/YAML 格式，支持回滚
- **TypeORM/Prisma Migration**：ORM 集成的自动迁移

---

## 容量规划

### 行大小估算
```
典型 users 表行大小 ≈ 200-500 Bytes
1亿用户 × 300B ≈ 30GB（不含索引）
索引通常是数据量的 30-100%
总计估算：30GB × 2 = 60GB

分表阈值建议：单表 > 500万行 或 > 10GB 时考虑分表
```

### 写入 TPS 估算
```
100万 DAU × 平均每天 50次写入 / 86400秒 ≈ 578 TPS
峰值系数 × 5 = 2890 TPS
MySQL 单机极限 ≈ 1-3万 TPS（简单语句）
→ 该量级单机足够，可用主从读写分离扛读
```

### 索引空间估算
```
INT 索引：约 11 Bytes/行
BIGINT 索引：约 19 Bytes/行  
VARCHAR(64) 索引：实际长度 + 2 Bytes
1000万行 × 1个BIGINT索引 ≈ 190MB
```
