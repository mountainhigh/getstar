# GetStar - 儿童行为激励管理微信小程序

## 📋 项目简介

GetStar 是一款基于微信小程序的儿童习惯养成激励工具,通过游戏化的积分和金币系统,帮助孩子养成良好的行为习惯。集成了微信账号登录功能，实现不同用户数据完全隔离。

### 核心功能

- **微信登录**: 用户使用微信账号自动登录，数据完全隔离
- **多孩管理**: 支持一个家庭管理1-5个孩子
- **习惯打卡**: 30+预设习惯模板,快速添加和记录
- **积分系统**: 打卡获得积分,支持手动修改
- **金币系统**: 1积分=1金币,独立显示
- **等级系统**: 20个等级称号,自动升级
- **打卡记录**: 日历视图查看历史记录
- **照片上传**: 支持拍照记录打卡证据(最多9张)
- **备注功能**: 可选添加打卡备注
- **数据安全**: 加密传输、严格权限控制、完整数据隔离

## 🏗️ 技术架构

### 前端技术栈
- 微信小程序原生开发
- CloudBase 云开发 SDK
- 基础库版本: 2.19.4+

### 后端技术栈
- CloudBase 云函数 (Node.js 18.15)
- CloudBase 文档数据库
- CloudBase 云存储

### 开发环境
- Node.js: v18.15+
- npm: 8.x+

---

## 📦 项目结构

```
getStar/
├── pages/                    # 页面
│   ├── index/               # 首页(打卡)
│   ├── check-in-detail/       # 打卡详情
│   ├── habit-templates/      # 习惯模板选择
│   ├── habit-manage/        # 习惯管理
│   ├── check-in-history/     # 打卡历史
│   └── children-manage/      # 孩子管理
├── cloudfunctions/           # 云函数
│   ├── login/               # 获取 OPENID
│   ├── userLogin/           # 用户登录（新增）
│   └── checkIn/            # 打卡
├── utils/                   # 工具函数
│   ├── util.js              # 通用工具
│   └── storage.js           # 本地存储
├── styles/                  # 样式
│   └── theme.wxss           # 主题配置
├── images/                  # 图片资源
│   └── tabbar/             # TabBar图标
├── docs/                    # 文档
│   ├── 微信用户登录功能实现文档.md  （新增）
│   ├── 用户登录功能技术实现总结.md  （新增）
│   ├── CloudBase连接完成报告.md
│   ├── TabBar图标下载完成报告.md
│   ├── 设计文档.md
│   ├── SRS_需求规格说明书.md
│   ├── 接口设计文档.md
│   ├── 数据库设计文档.md
│   ├── 项目总结.md
│   ├── 文档审查报告.md
│   └── 开发规划.md
├── app.js                   # 小程序入口
├── app.json                 # 小程序配置
├── app.wxss                 # 全局样式
├── project.config.json       # 项目配置
└── README.md               # 项目说明
```

---

## 🚀 快速开始

### 1. 环境准备

```bash
# 确保Node.js版本 >= 18
node --version
```

### 2. 配置小程序

1. 注册微信小程序账号: https://mp.weixin.qq.com/
2. 获取小程序 AppID
3. 修改 `project.config.json` 中的 `appid` 字段

```json
{
  "appid": "你的小程序AppID"
}
```

### 4. 配置CloudBase

1. 登录 [CloudBase控制台](https://console.cloud.tencent.com/tcb)
2. 创建新环境,获取环境ID
3. 修改 `app.js` 中的环境ID

```javascript
wx.cloud.init({
  env: '你的环境ID', // 云开发环境ID
  traceUser: true,
});
```

### 5. 初始化数据库

在CloudBase控制台创建以下集合:

- `families` - 家庭表
- `children` - 孩子表
- `habits` - 习惯表
- `check_ins` - 打卡记录表
- `habit_templates` - 习惯模板表
- `daily_records` - 每日记录表

#### 导入习惯模板数据

参考 `docs/database_init.js` 中的 `habitTemplates` 数组,手动添加或使用脚本批量导入。

### 6. 上传云函数

在微信开发者工具中:

1. 右键 `cloudfunctions/login` 文件夹
2. 选择"上传并部署:云端安装依赖"
3. 对 `checkIn` 重复相同操作

### 7. 上传TabBar图标

下载以下图标到 `images/tabbar` 目录:

- `checkin.png` - 打卡图标(未选中)
- `checkin-active.png` - 打卡图标(选中)
- `habit.png` - 习惯图标(未选中)
- `habit-active.png` - 习惯图标(选中)
- `history.png` - 记录图标(未选中)
- `history-active.png` - 记录图标(选中)
- `my.png` - 我的图标(未选中)
- `my-active.png` - 我的图标(选中)

推荐使用 Icons8: https://img.icons8.com/ios/100/

### 8. 运行项目

1. 打开微信开发者工具
2. 导入项目(选择项目根目录)
3. 点击"编译"预览

---

## 📊 数据库设计

### 核心数据表

#### families (家庭表)
```javascript
{
  _id: string,
  name: string,        // 家庭名称
  createTime: Date
}
```

#### children (孩子表)
```javascript
{
  _id: string,
  familyId: string,    // 家庭ID
  name: string,        // 孩子姓名
  avatar: string,      // 头像URL
  points: number,      // 总积分
  coins: number,       // 金币
  level: number,       // 等级
  createTime: Date,
  updateTime: Date
}
```

#### habits (习惯表)
```javascript
{
  _id: string,
  childId: string,     // 孩子ID
  familyId: string,    // 家庭ID
  name: string,        // 习惯名称
  icon: string,        // 图标
  category: string,    // 分类
  categoryColor: string, // 分类颜色
  points: number,      // 积分
  order: number,       // 排序
  isActive: boolean,   // 是否激活
  createTime: Date
}
```

#### check_ins (打卡记录表)
```javascript
{
  _id: string,
  childId: string,     // 孩子ID
  habitId: string,     // 习惯ID
  date: string,        // 日期 YYYY-MM-DD
  points: number,      // 获得积分(实际)
  habitPoints: number, // 习惯设置的积分值
  coins: number,      // 获得金币
  photos: Array,       // 照片URL数组
  remark: string,      // 备注
  createTime: Date
}
```

详细数据库设计请参考 `docs/数据库设计文档.md`

---

## 🎨 设计规范

### 主题色
- 主色调: `#FF6B6B` (温暖珊瑚橙)
- 辅助色: `#4ECDC4` (清新薄荷绿)
- 强调色: `#FFE66D` (明亮黄色)
- 背景色: `#F7F9FC` (柔和浅灰)
- 文字色: `#2D3436` (深灰)

### 字体
- 标题: 'Nunito Sans', sans-serif
- 正文: 'PingFang SC', sans-serif

### 设计风格
Playful/toy-like - 适合儿童和家长的温馨活泼风格

---

## 📝 开发规范

### 命名规范
- 页面文件: kebab-case (如 `check-in-detail`)
- 变量/函数: camelCase (如 `loadData`)
- 常量: UPPER_SNAKE_CASE (如 `MAX_COUNT`)

### 代码风格
- 使用 2 空格缩进
- 使用单引号
- 使用分号
- 组件名使用 PascalCase

### Git 提交规范
```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试
chore: 构建/工具链
```

---

## 🧪 测试

### 功能测试清单

- [ ] 家庭账户创建
- [ ] 多孩子管理(添加/编辑/删除/切换)
- [ ] 习惯模板选择和添加
- [ ] 习惯管理(编辑/删除/排序)
- [ ] 打卡功能(积分修改/照片上传/备注)
- [ ] 今日重复打卡检查
- [ ] 积分和金币自动增加
- [ ] 等级自动计算和升级
- [ ] 打卡历史查看
- [ ] 日历视图切换

### 性能测试

- [ ] 首屏加载时间 < 2s
- [ ] 打卡响应时间 < 500ms
- [ ] 照片上传流畅
- [ ] 列表渲染流畅

---

## 📦 部署指南

### CloudBase 部署

#### 1. 部署云函数

```bash
# 在微信开发者工具中
# 右键 cloudfunctions/login -> 上传并部署:云端安装依赖
# 右键 cloudfunctions/checkIn -> 上传并部署:云端安装依赖
```

#### 2. 配置数据库权限

在CloudBase控制台设置数据库权限:
- `families`: 所有用户可读,创建者可写
- `children`: 所有用户可读,创建者可写
- `habits`: 所有用户可读,创建者可写
- `check_ins`: 所有用户可读,创建者可写
- `habit_templates`: 所有用户可读,仅管理员可写

#### 3. 配置云存储权限

- 所有用户可读
- 创建者可写

### 小程序发布

1. 在微信开发者工具点击"上传"
2. 填写版本号和备注
3. 在微信公众平台提交审核
4. 审核通过后发布

---

## 🐛 常见问题

### Q: CloudBase连接失败?
A: 检查 `app.js` 中的环境ID是否正确,确保CloudBase环境已开通。

### Q: 云函数调用失败?
A: 确保云函数已部署,且权限配置正确。

### Q: 照片上传失败?
A: 检查云存储权限配置,确保已开启云存储服务。

### Q: 数据库查询慢?
A: 建议添加索引,优化查询条件。

---

## 📄 文档

- [设计文档](./docs/设计文档.md) - UI/UX设计规范
- [需求规格说明书](./docs/SRS_需求规格说明书.md) - 功能需求
- [接口设计文档](./docs/接口设计文档.md) - API接口
- [数据库设计文档](./docs/数据库设计文档.md) - 数据库结构
- [开发规划](./docs/开发规划.md) - 开发计划
- [项目总结](./docs/项目总结.md) - 项目概览

---

## 🤝 贡献指南

欢迎贡献代码、报告bug或提出新功能建议!

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

## 👥 团队

- 产品经理: [待填写]
- 前端开发: [待填写]
- 后端开发: [待填写]
- UI设计: [待填写]

---

## 📞 联系方式

- 项目地址: [GitHub Repository]
- 问题反馈: [Issues]
- 邮箱: [待填写]

---

**版本**: v1.0.0 (MVP)
**更新日期**: 2026-03-01
**状态**: 开发中
