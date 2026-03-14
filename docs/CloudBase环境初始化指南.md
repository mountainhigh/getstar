# CloudBase 环境初始化指南

## 📋 概述

本文档指导完成 CloudBase 环境的初始化,包括数据库集合创建和数据导入。

**新环境ID**: `cloud1-4g6msqhd5bbad708`

---

## 步骤 1: 创建数据库集合

### 方式一: 在 CloudBase 控制台手动创建 (推荐)

访问: https://tcb.cloud.tencent.com/dev?envId=cloud1-4g6msqhd5bbad708#/db/doc

依次创建以下 12 个集合:

| 序号 | 集合名称 | 说明 | 权限 |
|------|---------|------|------|
| 1 | `users` | 用户表 | 所有用户可读,仅创建者可写 |
| 2 | `family_members` | 家庭成员关系表 | 所有用户可读,仅创建者可写 |
| 3 | `families` | 家庭表 | 所有用户可读,仅创建者可写 |
| 4 | `children` | 孩子表 | 所有用户可读,仅创建者可写 |
| 5 | `habits` | 习惯表 | 所有用户可读,仅创建者可写 |
| 6 | `check_ins` | 打卡记录表 | 所有用户可读,仅创建者可写 |
| 7 | `habit_templates` | 习惯模板表 | 所有用户可读,仅创建者可写 |
| 8 | `daily_records` | 每日记录表 | 所有用户可读,仅创建者可写 |
| 9 | `badges` | 称号表 | 所有用户可读,仅创建者可写 |
| 10 | `user_badges` | 用户称号表 | 所有用户可读,仅创建者可写 |
| 11 | `rewards` | 礼物表 | 所有用户可读,仅创建者可写 |
| 12 | `reward_exchanges` | 兑换记录表 | 所有用户可读,仅创建者可写 |
| 13 | `coin_records` | 金币记录表 | 所有用户可读,仅创建者可写 |

**操作步骤**:
1. 点击"新建集合"
2. 输入集合名称(如 `families`)
3. 权限设置: 选择"所有用户可读,仅创建者可写"
4. 点击"确定"
5. 重复以上步骤,创建所有集合

---

## 步骤 2: 初始化数据

### 方式一: 通过微信小程序调用云函数 (推荐)

1. 在微信开发者工具中打开项目
2. 在任意页面的 `onLoad` 或某个按钮事件中添加以下代码:

```javascript
// 调用初始化云函数
wx.cloud.callFunction({
  name: 'initDatabase',
  data: {
    action: 'all' // 初始化所有数据
  },
  success: res => {
    console.log('初始化结果:', res.result);
    if (res.result.success) {
      wx.showToast({
        title: '初始化成功',
        icon: 'success'
      });
    }
  },
  fail: err => {
    console.error('初始化失败:', err);
    wx.showToast({
      title: '初始化失败',
      icon: 'none'
    });
  }
});
```

3. 运行程序,触发云函数调用
4. 查看控制台日志,确认初始化成功

### 方式二: 在云函数控制台测试

1. 访问: https://tcb.cloud.tencent.com/dev?envId=cloud1-4g6msqhd5bbad708#/scf
2. 找到 `initDatabase` 云函数
3. 点击"测试"按钮
4. 输入测试参数:
```json
{
  "action": "all"
}
```
5. 点击"测试",查看返回结果

---

## 步骤 3: 验证数据

访问数据库页面,确认以下数据已成功导入:

### 习惯模板 (habit_templates)
- 应有 25 条记录
- 包含 5 个分类: 学习、运动、生活、礼仪、劳动

### 称号 (badges)
- 应有 8 条记录
- 包含不同稀有度: common, rare, epic, legendary

### 礼物 (rewards)
- 应有 8 条记录
- 包含 5 个分类: food, entertainment, activity, education, toy

---

## 步骤 4: 配置安全规则 (可选)

为了数据安全,建议配置数据库安全规则。

访问: https://tcb.cloud.tencent.com/dev?envId=cloud1-4g6msqhd5bbad708#/db/doc

为每个集合配置安全规则:

### families 集合
```json
{
  "read": "auth.openid == doc.create_openid",
  "write": "auth.openid == doc.create_openid"
}
```

### children 集合
```json
{
  "read": "auth.openid in doc.family_members",
  "write": "auth.openid in doc.family_members"
}
```

### 其他集合
根据业务需求配置,可暂时使用默认权限。

---

## 步骤 5: 上传云存储图片 (可选)

如果应用需要使用云存储图片:

1. 访问: https://tcb.cloud.tencent.com/dev?envId=cloud1-4g6msqhd5bbad708#/storage
2. 点击"上传文件"
3. 上传必要的图片资源

---

## 常见问题

### Q1: 云函数调用失败
**A**: 检查以下几点:
- 云函数是否已成功部署
- 环境ID是否正确
- 数据库集合是否已创建

### Q2: 数据未初始化
**A**: 
- 检查集合是否存在
- 查看云函数日志,确认是否有错误
- 尝试重新调用云函数

### Q3: 权限错误
**A**:
- 检查数据库集合权限设置
- 确认用户已登录

---

## 完成检查清单

- [ ] 13 个数据库集合已创建
- [ ] 云函数 `initDatabase` 已部署
- [ ] 习惯模板数据已初始化 (25 条)
- [ ] 称号数据已初始化 (8 条)
- [ ] 礼物数据已初始化 (8 条)
- [ ] 小程序可以正常调用云函数
- [ ] 数据可正常查询

---

## 配置文件已更新

以下配置文件已更新为新环境ID:

- `cloudbaserc.json` - CloudBase 配置
- `project.config.json` - 微信小程序配置

新环境ID: `cloud1-4g6msqhd5bbad708`
地域: `ap-shanghai`

---

## 后续步骤

初始化完成后,可以:

1. 在微信开发者工具中重新编译项目
2. 测试基本功能(登录、创建孩子、添加习惯等)
3. 根据需要调整数据库安全规则
4. 部署其他云函数(如 `getLeaderboard`、`undoCheckIn` 等)
