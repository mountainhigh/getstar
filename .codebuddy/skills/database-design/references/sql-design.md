# 关系型数据库设计规范

## 目录
1. [范式化理论](#范式化理论)
2. [命名规范](#命名规范)
3. [数据类型选择](#数据类型选择)
4. [索引策略](#索引策略)
5. [主键与外键](#主键与外键)
6. [ER 图设计](#er-图设计)
7. [约束与完整性](#约束与完整性)
8. [SQL 标准 DDL 模板](#sql-标准-ddl-模板)

---

## 范式化理论

### 第一范式（1NF）
- 每列值不可再分（原子性）
- 每行唯一标识（主键）
- **反例**：`address = "北京市海淀区中关村大街1号"` → 拆为 `province`, `city`, `district`, `street`
- **权衡**：地址若不需要精确查询，可保留为单列节省 JOIN

### 第二范式（2NF）
- 满足 1NF + 非主键列完全依赖于整个主键（消除部分依赖）
- **适用场景**：仅在联合主键时才有意义
- **反例**：`(order_id, product_id) → product_name`（product_name 只依赖 product_id）
  - 解决：将 product_name 移到 products 表

### 第三范式（3NF）
- 满足 2NF + 消除传递依赖（非主键列不依赖其他非主键列）
- **反例**：`employee(id, dept_id, dept_name)` → dept_name 传递依赖于 dept_id
  - 解决：dept_name 移入 departments 表

### BCNF（Boyce-Codd 范式）
- 每个函数依赖的决定因素都是候选键
- 实际项目中通常达到 3NF 即可，BCNF 用于高精度需求

### 反范式化（Denormalization）
适当冗余以提升读性能：
- 缓存频繁 JOIN 的聚合字段（如 `orders.total_amount`）
- 冗余维度标签（如 `orders.user_name`），避免跨表查询
- **原则**：写多读少 → 范式化；读多写少 → 适当反范式

---

## 命名规范

### 通用规则
| 对象 | 规范 | 示例 |
|------|------|------|
| 数据库 | `snake_case`，业务英文缩写 | `app_prod`, `crm_dev` |
| 表名 | `snake_case`，**复数名词** | `users`, `order_items` |
| 列名 | `snake_case`，语义清晰 | `created_at`, `user_id` |
| 主键 | `id`（单表）或 `{table_singular}_id` | `id`, `user_id` |
| 外键 | `{referenced_table_singular}_id` | `category_id`, `parent_id` |
| 索引 | `idx_{table}_{columns}` | `idx_users_email` |
| 唯一索引 | `uniq_{table}_{columns}` | `uniq_users_phone` |
| 关联表 | `{table1}_{table2}` 按字母序 | `post_tags`, `user_roles` |

### 时间字段约定
```sql
created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
deleted_at  DATETIME NULL DEFAULT NULL  -- 软删除标记
```

### 状态字段约定
- 布尔值用 `is_` 前缀：`is_active`, `is_verified`
- 枚举状态用 `status`：`status TINYINT(1) NOT NULL DEFAULT 0` + 注释说明取值含义
- 避免使用 `flag`、`type` 等含义不明的命名

---

## 数据类型选择

### 整数类型
| 类型 | 范围 | 适用场景 |
|------|------|----------|
| `TINYINT` | -128~127 / 0~255 | 状态、枚举（< 255种） |
| `SMALLINT` | 0~65535 | 年龄、评分、小范围ID |
| `INT` | 0~42亿 | 普通业务主键 |
| `BIGINT` | 0~18京 | 雪花ID、高并发主键 |

- 金额**禁止**使用 `FLOAT`/`DOUBLE`，使用 `DECIMAL(18, 2)` 或整型（分为单位）
- 状态位首选 `TINYINT(1)` 而非 `BOOLEAN`（兼容性更好）

### 字符串类型
| 类型 | 适用场景 |
|------|----------|
| `CHAR(n)` | 固定长度：MD5(32)、手机号(11)、国家码(2) |
| `VARCHAR(n)` | 可变长度：姓名、标题、URL（n ≤ 255 效率最高） |
| `TEXT` | 大文本：文章内容、描述（不可设默认值，不走索引前缀） |
| `JSON` | 半结构化数据（MySQL 5.7+，支持路径查询） |

- `VARCHAR` 长度设合理上限，避免 `VARCHAR(65535)` 滥用
- 需要排序/比较的字符串注意 `COLLATE utf8mb4_unicode_ci`

### 时间类型
| 类型 | 范围 | 时区 | 推荐 |
|------|------|------|------|
| `DATETIME` | 1000-9999 | 存储不含时区 | ✅ 通用场景 |
| `TIMESTAMP` | 1970-2038 | 自动转换时区 | ⚠️ 2038问题 |
| `DATE` | 日期只 | - | 生日、纪念日 |
| `INT UNSIGNED` | Unix 秒 | 应用层转换 | 高性能查询 |

---

## 索引策略

### 索引选择原则
1. **高选择性列**优先建索引（如 email, phone；避免 status 单列索引）
2. **WHERE、JOIN ON、ORDER BY、GROUP BY** 中的列考虑索引
3. **最左前缀原则**：联合索引 `(a, b, c)` 支持 `a`、`a,b`、`a,b,c` 查询

### 联合索引设计规则
```
字段顺序：等值查询列 → 范围查询列 → 排序列
示例：(user_id, status, created_at)
可覆盖：WHERE user_id=? AND status=? ORDER BY created_at
```

### 覆盖索引（Covering Index）
```sql
-- 查询只需要索引中的字段，无需回表
SELECT user_id, email FROM users WHERE email = 'x@x.com';
-- 索引 (email, user_id) 即可覆盖此查询
```

### 索引失效场景（重点规避）
```sql
-- ❌ 左侧通配符
WHERE name LIKE '%张%'

-- ❌ 函数运算
WHERE YEAR(created_at) = 2024   →   改为: WHERE created_at BETWEEN '2024-01-01' AND '2024-12-31'

-- ❌ 隐式类型转换
WHERE phone = 13800138000   （phone 是 VARCHAR）

-- ❌ OR 连接非同索引列
WHERE id = 1 OR name = '张三'

-- ❌ 不等号在范围前
WHERE status != 0 AND user_id = 123   →   调换顺序
```

### 索引数量控制
- 单表索引 ≤ 5 个（写操作维护开销）
- 定期用 `sys.schema_unused_indexes` 清理冗余索引

---

## 主键与外键

### 主键策略对比
| 策略 | 优点 | 缺点 | 推荐场景 |
|------|------|------|----------|
| `AUTO_INCREMENT INT` | 简单、顺序写入性能好 | 单点、易枚举猜测 | 中小型系统 |
| `AUTO_INCREMENT BIGINT` | 容量大、顺序写入 | 单点 | 大型系统 |
| `UUID (CHAR 36)` | 分布式唯一 | 字符串主键索引大、写入散列 | ❌ 不推荐直接作主键 |
| `雪花ID (BIGINT)` | 分布式唯一、趋势递增 | 依赖时钟 | ✅ 分布式首选 |
| `UUID v7 (BIGINT)` | 有序UUID | 需应用生成 | 分布式高性能 |

### 外键约束
```sql
-- 显式声明外键（适合数据一致性要求高的场景）
FOREIGN KEY (user_id) REFERENCES users(id)
  ON DELETE CASCADE    -- 父删子跟删
  ON UPDATE CASCADE    -- 父更新子跟新

-- 高并发 OLTP 系统常关闭外键约束（应用层保证一致性）
-- SET FOREIGN_KEY_CHECKS = 0;
```

**建议**：高频写入系统用应用层逻辑替代 DB 外键，避免锁竞争

---

## ER 图设计

### 关系类型
```
1:1    用户 ←→ 用户详情      (在从表加 UNIQUE 外键)
1:N    用户 ←→ 订单          (在 N 端表加外键)
M:N    用户 ←→ 角色          (增加关联表 user_roles)
```

### M:N 关联表设计
```sql
CREATE TABLE user_roles (
  user_id  BIGINT NOT NULL,
  role_id  INT    NOT NULL,
  granted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  granted_by BIGINT,
  PRIMARY KEY (user_id, role_id),         -- 联合主键
  INDEX idx_role_id (role_id)              -- 反向查询索引
);
```

### 自关联（树形结构）
```sql
-- 邻接表（简单但查询全路径需递归）
CREATE TABLE categories (
  id        INT PRIMARY KEY AUTO_INCREMENT,
  parent_id INT NULL REFERENCES categories(id),
  name      VARCHAR(100) NOT NULL,
  depth     TINYINT NOT NULL DEFAULT 0
);

-- 物化路径（便于查询祖先/后代）
ALTER TABLE categories ADD path VARCHAR(500);  -- 如 '/1/3/7/'
```

---

## 约束与完整性

### 字段约束清单
```sql
NOT NULL          -- 明确不允许 NULL 的字段务必声明
DEFAULT value     -- 提供合理默认值
CHECK (age > 0 AND age < 150)   -- MySQL 8.0+ 支持
UNIQUE            -- 业务唯一键（邮箱、手机号）
```

### 软删除模式
```sql
-- 方案A：deleted_at 时间戳
deleted_at DATETIME NULL DEFAULT NULL
-- 查询：WHERE deleted_at IS NULL

-- 方案B：is_deleted 标记
is_deleted TINYINT(1) NOT NULL DEFAULT 0
-- 查询：WHERE is_deleted = 0
```

---

## SQL 标准 DDL 模板

```sql
CREATE TABLE `users` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `openid`       VARCHAR(64)     NOT NULL DEFAULT '' COMMENT '微信/第三方openid',
  `nickname`     VARCHAR(64)     NOT NULL DEFAULT '' COMMENT '昵称',
  `avatar_url`   VARCHAR(512)    NOT NULL DEFAULT '' COMMENT '头像URL',
  `phone`        CHAR(11)        NOT NULL DEFAULT '' COMMENT '手机号',
  `email`        VARCHAR(128)    NOT NULL DEFAULT '' COMMENT '邮箱',
  `status`       TINYINT(1)      NOT NULL DEFAULT 1  COMMENT '状态: 0禁用 1正常',
  `is_verified`  TINYINT(1)      NOT NULL DEFAULT 0  COMMENT '是否实名认证',
  `created_at`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at`   DATETIME                 DEFAULT NULL COMMENT '软删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_openid` (`openid`),
  UNIQUE KEY `uniq_phone` (`phone`),
  KEY `idx_email` (`email`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';
```
