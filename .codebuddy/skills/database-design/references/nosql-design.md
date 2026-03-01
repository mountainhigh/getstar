# NoSQL 数据库设计规范

## 目录
1. [NoSQL 类型选型](#nosql-类型选型)
2. [文档型数据库设计（MongoDB / CloudBase NoSQL）](#文档型数据库设计)
3. [键值型数据库（Redis）](#键值型数据库redis)
4. [时序数据库设计原则](#时序数据库设计原则)
5. [CloudBase NoSQL 特性与规范](#cloudbase-nosql-特性与规范)

---

## NoSQL 类型选型

| 类型 | 代表产品 | 适用场景 | 不适用场景 |
|------|----------|----------|-----------|
| 文档型 | MongoDB, Firestore, CloudBase | 灵活结构、内容管理、用户数据 | 强关联、复杂事务 |
| 键值型 | Redis, DynamoDB | 缓存、Session、计数器、排行榜 | 复杂查询 |
| 列族型 | HBase, Cassandra | 时序、日志、海量写入 | 随机读 |
| 图数据库 | Neo4j | 社交关系、推荐、路径分析 | 通用业务 |
| 全文搜索 | Elasticsearch | 日志分析、站内搜索 | 事务操作 |

---

## 文档型数据库设计

### 核心设计决策：嵌入 vs 引用

#### 嵌入（Embedding）— 推荐场景
```js
// 文章与评论 — 评论数量可控，查询总在文章上下文中
{
  "_id": "post_001",
  "title": "文章标题",
  "content": "...",
  "comments": [        // 嵌入评论（< 100条时合适）
    { "user": "张三", "text": "很棒", "at": "2024-01-01" }
  ],
  "tags": ["技术", "前端"]  // 简单数组直接嵌入
}
```

**选择嵌入的条件：**
- 子文档生命周期依附父文档
- 子文档数量有上限（< 几百个）
- 查询总是伴随父文档一起读取

#### 引用（Referencing）— 推荐场景
```js
// 用户与订单 — 订单数量无限，独立查询频繁
// users 集合
{ "_id": "user_001", "name": "张三" }

// orders 集合
{ "_id": "order_001", "user_id": "user_001", "amount": 99.0 }
```

**选择引用的条件：**
- 子文档独立存在且数量无限
- 子文档被多个父文档共享
- 子文档体积大，不需要总是一起加载

### 集合命名规范
- 使用**复数名词**：`users`，`orders`，`products`
- `snake_case` 格式
- 业务前缀隔离：`app_users`，`shop_orders`

### 字段设计规范
```js
{
  // 系统字段（CloudBase 自动生成）
  "_id": "xxx",              // 文档ID，字符串

  // 时间字段用 Date 对象或 ISO 字符串
  "created_at": new Date(),
  "updated_at": new Date(),

  // 用户身份关联
  "_openid": "user_openid",  // CloudBase 用户标识

  // 枚举状态用数字，注释说明含义
  "status": 1,               // 0:草稿 1:发布 2:下线

  // 可选字段明确区分 null vs 缺失
  "description": null        // 明确为空
  // 缺失字段 = 未填写（应用层区分）
}
```

### 查询性能优化
```js
// CloudBase/MongoDB 索引创建原则：
// 1. 高频 WHERE 条件字段
// 2. 排序字段（createTime 等）
// 3. 用户隔离字段（_openid）

// 复合索引示例：按用户查自己的帖子并按时间排序
db.collection('posts').createIndex({ _openid: 1, created_at: -1 })

// 避免全集合扫描：不要在没有索引的字段上做范围查询
```

### 文档大小控制
- 单文档 ≤ 1MB（MongoDB 硬限制 16MB，CloudBase 建议 < 1MB）
- 大文件（图片/视频）存云存储，文档只存 URL
- 数组字段预估最大元素数量，过大则拆分集合

### 数据版本与迁移
```js
// 在文档中记录 schema 版本，便于迁移
{
  "_schema_version": 2,
  // v2 新增字段
  "extra_info": {}
}
```

---

## 键值型数据库（Redis）

### Key 命名规范
```
格式：{业务}:{对象}:{标识}[:{子项}]
示例：
  user:session:uid_123
  cache:product:sku_456
  rank:score:weekly:2024w01
  lock:order:order_789
  counter:pv:page_home:20240101
```

### 数据结构选型
| 结构 | 命令 | 适用场景 |
|------|------|----------|
| String | GET/SET | 缓存对象（JSON）、计数器、分布式锁 |
| Hash | HGET/HSET | 对象字段读写（避免全量序列化） |
| List | LPUSH/RPOP | 消息队列、最新N条记录 |
| Set | SADD/SMEMBERS | 标签、去重集合、共同好友 |
| ZSet | ZADD/ZRANGE | 排行榜、带权重的优先队列 |
| Bitmap | SETBIT | 签到、在线状态（百万级用户） |
| HyperLogLog | PFADD | 大数据UV统计（有误差） |

### TTL 策略
```
Session 类：    24h - 7d（依据安全策略）
缓存类：        5min - 1h（依据数据时效性）
排行榜：        按周期滚动（每日/每周重置）
分布式锁：      业务超时时间 × 1.5 倍保险
验证码：        60s - 300s
```

### 排行榜设计（ZSet 标准模式）
```
ZADD rank:score:weekly  100 "user:123"
ZADD rank:score:weekly  200 "user:456"
ZREVRANGE rank:score:weekly 0 9 WITHSCORES   -- 取前10名
ZRANK rank:score:weekly "user:123"            -- 查排名
ZINCRBY rank:score:weekly 10 "user:123"       -- 加分
```

### 缓存一致性模式
```
Cache-Aside（旁路缓存）— 最常用：
  读：先查缓存 → 未命中 → 查DB → 写入缓存
  写：先写DB → 删除缓存（不更新，避免并发脏数据）

Write-Through（写穿透）：
  写：同时写DB和缓存
  适合：写少读多，一致性要求高

Write-Behind（异步回写）：
  写：先写缓存，异步批量刷DB
  适合：高频写、允许短暂不一致（计数器、点赞）
```

---

## 时序数据库设计原则

### 数据模型要素
- **Metric 名称**：被测量的内容（`cpu_usage`、`order_count`）
- **Timestamp**：精度到毫秒，存为 BIGINT（Unix ms）
- **Tags**：低基数维度（`host`、`region`、`env`）— 用于过滤/分组
- **Fields**：高基数数值（`value`、`p99_latency`）

### 分区策略
```
按时间分区（时序数据必备）：
  - 每天/每周/每月一个分区
  - 旧数据直接 DROP PARTITION 而非 DELETE

冷热分离：
  - 近 7 天：SSD 高性能存储
  - 7-90 天：HDD 普通存储
  - 90 天以上：对象存储归档
```

---

## CloudBase NoSQL 特性与规范

### 集合权限模式
```
所有用户可读，仅创建者可写：
  "read": true
  "write": "auth.uid == doc._openid"

仅登录用户可操作自己的数据（推荐）：
  "read":  "auth.uid == doc._openid"
  "write": "auth.uid == doc._openid"

完全公开（公告、配置类）：
  "read": true
  "write": false
```

### 实时监听设计
```js
// 监听集合变化（适合聊天、通知场景）
const watcher = db.collection('messages')
  .where({ room_id: 'room_001', _openid: _.eq(openid) })
  .watch({
    onChange(snapshot) { /* 处理变更 */ },
    onError(err) { /* 重连逻辑 */ }
  })

// 最佳实践：
// - 监听条件尽量精确，避免全集合监听
// - 离页时调用 watcher.close() 释放连接
// - 客户端维护重连机制
```

### 聚合查询规范
```js
// 统计各状态订单数量
db.collection('orders').aggregate()
  .match({ _openid: openid })
  .group({
    _id: '$status',
    count: $.sum(1),
    total: $.sum('$amount')
  })
  .sort({ count: -1 })
  .end()
```

### 事务处理（CloudBase 支持）
```js
const transaction = await db.startTransaction()
try {
  await transaction.collection('accounts').doc('a').update({ balance: _.inc(-100) })
  await transaction.collection('accounts').doc('b').update({ balance: _.inc(100) })
  await transaction.commit()
} catch (e) {
  await transaction.rollback()
}
```
