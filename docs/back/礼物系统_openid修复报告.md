# 礼物系统 `_openid` 问题彻底修复方案

## 🎯 问题根源

经过仔细排查，发现 `rewards` 表没有 `_openid` 的根本原因是：

**`cloudfunctions/initDatabase/index.js` 第 66 行将 `rewards` 定义为全局共享表**，导致：
1. 初始化时直接插入数据，没有 `_openid`
2. 每次调用 `initDatabase` 云函数都会重新插入没有 `_openid` 的礼物记录

## ✅ 已完成的修复

### 1. 修复 `initDatabase` 云函数
**文件**: `cloudfunctions/initDatabase/index.js`

**修改内容**:
```javascript
// 修改前（错误）
const globalTablesToInit = [
  { name: 'habit_templates', data: habitTemplates },
  { name: 'badges', data: badges },
  { name: 'rewards', data: rewards }  // ❌ 问题根源
];

// 修改后（正确）
const globalTablesToInit = [
  { name: 'habit_templates', data: habitTemplates },
  { name: 'badges', data: badges }
  // ✅ 移除 rewards，改由 initUserRewards 云函数为每个用户单独初始化
];
```

### 2. 修复 `initUserRewards` 云函数
**文件**: `cloudfunctions/initUserRewards/index.js`

**修改内容**:
- 修正礼物分类，与前端 `reward-manage.js` 的 categories 保持一致
- 统一使用中文分类名称：`['美食', '娱乐', '活动', '学习', '玩具', '其他']`

### 3. 创建新的清理云函数
**文件**: `cloudfunctions/finalCleanAndInitRewards/index.js`

**功能**:
1. 查询并删除所有没有 `_openid` 的旧礼物记录
2. 为当前用户初始化 10 个默认礼物
3. 支持仅清理模式（`cleanOnly: true`）

### 4. 更新测试页面
**文件**: `pages/test-reward/test-reward.js`

**功能**:
- **🧪 测试初始化**：仅查看数据状态，不修改
- **🧹 清理并初始化**：删除旧数据 + 初始化默认礼物
- **🗑️ 仅清理**：只删除旧数据，不初始化

## 📋 使用步骤

### 方法 1：通过测试页面（推荐）

1. 进入小程序 → "我的" → "测试礼物系统（临时）"
2. 点击 **"🧹 清理并初始化"** 按钮
3. 确认操作后，系统会：
   - 删除所有没有 `_openid` 的旧数据
   - 为当前用户初始化 10 个默认礼物

### 方法 2：正常使用

1. 首次访问"礼物兑换"或"礼物管理"页面
2. 系统自动检测是否有礼物
3. 如果没有，自动调用 `initUserRewards` 初始化

## 🔍 验证方法

### 检查云数据库

1. 进入云开发控制台 → 数据库 → `rewards` 集合
2. 查看所有记录，确认：
   - ✅ 每条记录都有 `_openid` 字段
   - ✅ 没有孤立的旧数据

### 检查小程序

1. 进入"礼物管理"页面
2. 应该能看到 10 个默认礼物
3. 可以正常添加、编辑、删除礼物

## ⚠️ 重要提醒

1. **不要再调用 `initDatabase` 云函数**：
   - 该函数现在已经不包含礼物初始化
   - 如果需要重新初始化数据，请使用测试页面

2. **云函数已部署**：
   - `initDatabase` - 已更新（移除礼物初始化）
   - `initUserRewards` - 已部署
   - `finalCleanAndInitRewards` - 已部署

3. **测试页面可以随时使用**：
   - 如果再次出现没有 `_openid` 的记录
   - 可以通过测试页面快速清理

## 📊 数据库结构说明

### rewards 集合
```javascript
{
  _id: string,
  _openid: string,        // ✅ 必须：用户 OpenID
  name: string,           // 礼物名称
  icon: string,           // 图标 emoji
  description: string,    // 描述
  cost: number,           // 所需金币
  stock: number,          // 库存（-1 表示无限）
  enabled: boolean,       // 是否启用
  category: string,       // 分类：美食/娱乐/活动/学习/玩具/其他
  order: number,          // 排序
  createTime: Date,
  updateTime: Date
}
```

## 🎯 完整流程

```
用户首次访问礼物页面
    ↓
getRewardList 云函数检查用户是否有礼物
    ↓
如果没有 → 调用 initUserRewards 云函数
    ↓
initUserRewards 使用当前用户的 _openid 初始化 10 个默认礼物
    ↓
返回用户的礼物列表
```

## ✨ 新增功能特点

1. **用户隔离**：每个用户拥有独立的礼物列表
2. **自动初始化**：首次访问时自动添加默认礼物
3. **安全可靠**：基于 `_openid` 的权限控制
4. **易于维护**：提供测试页面方便调试和清理

---

**修复完成时间**: 2026-03-03
**修复文件数**: 4 个云函数 + 1 个页面
**部署状态**: ✅ 全部已部署
