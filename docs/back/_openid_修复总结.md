# _openid 字段修复总结

## 问题背景
微信小程序的数据库查询会自动添加 `_openid` 过滤条件，只有设置了 `_openid` 字段的记录才能被前端查询到。

## 修复的文件列表

### 云函数修复

#### 1. `cloudfunctions/addHabitsFromTemplates/index.js`
**问题**：添加习惯记录时缺少 `_openid` 字段
**修复**：在第 54 行添加了 `_openid: OPENID`

#### 2. `cloudfunctions/exchangeReward/index.js`
**问题**：
- `reward_exchanges` 表缺少 `_openid` 字段
- `coin_records` 表缺少 `_openid` 字段

**修复**：
- 第 94 行：添加 `_openid: OPENID`
- 第 107 行：添加 `_openid: OPENID`

#### 3. `cloudfunctions/undoCheckIn/index.js`
**问题**：
- 使用了错误的表名 `check_in_records`（应为 `check_ins`）
- 查询 `users` 表时使用了 `_openid`（应使用 `openid`）
- `coin_records` 表缺少 `_openid` 字段

**修复**：
- 第 25 行：`check_in_records` → `check_ins`
- 第 38 行：`_openid: OPENID` → `openid: OPENID`
- 第 102 行：`check_in_records` → `check_ins`
- 第 107 行：添加 `_openid: OPENID`

#### 4. `cloudfunctions/checkBadgeUnlock/index.js`
**问题**：`user_badges` 表添加记录时缺少 `_openid` 字段
**修复**：在第 93 行添加了 `_openid: cloud.getWXContext().OPENID`

### 前端修复

#### 5. `pages/habit-templates/habit-templates.js`
**问题**：前端添加习惯时缺少 `_openid` 字段
**修复**：在第 161 行添加了 `_openid: app.globalData.openid`

#### 6. `pages/children-manage/children-manage.js`
**问题**：前端添加孩子时缺少 `_openid` 字段
**修复**：在第 253 行添加了 `_openid: app.globalData.openid`

#### 7. `pages/index/index.js`
**问题**：首页添加孩子时缺少 `_openid` 字段
**修复**：在第 398 行添加了 `_openid: app.globalData.openid`

## 无需修复的文件

### 云函数
- `checkIn/index.js` - ✅ 已正确设置 `_openid`
- `userLogin/index.js` - ✅ `users` 表使用 `openid` 字段（业务字段），正确

### 前端
- `pages/reward-manage/reward-manage.js` - ✅ `rewards` 表是全局表，不需要 `_openid`

## 字段使用说明

### 需要使用 `_openid` 的表（用于权限控制）
- `children` - 儿童表
- `habits` - 习惯表
- `check_ins` - 打卡记录表
- `user_badges` - 用户称号表
- `reward_exchanges` - 礼物兑换记录表
- `coin_records` - 金币变动记录表

### 使用 `openid` 的表（业务字段）
- `users` - 用户表（`openid` 是业务字段，用于身份识别）

### 全局表（不需要 _openid）
- `families` - 家庭表（通过 `ownerId` 关联）
- `habit_templates` - 习惯模板表
- `badges` - 称号表
- `rewards` - 礼物表
- `daily_records` - 每日记录表
- `leaderboard` - 排行榜表

## 测试建议

1. 初始化数据库后，添加一个孩子
2. 为孩子添加习惯
3. 打卡测试
4. 兑换礼物测试
5. 撤销打卡测试
6. 检查称号解锁功能

确保所有插入数据的功能都能正常工作，并且前端可以查询到所有数据。
