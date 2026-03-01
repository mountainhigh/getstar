---
name: wechat-miniprogram-designer
description: 微信小程序 UI 设计与前端实现专家技能。当用户需要设计或实现微信小程序界面、页面布局、组件样式、交互效果，或询问微信小程序设计规范、组件用法、适配方案时，应使用本 skill。
---

# 微信小程序设计师 Skill

## 能力范围

本 skill 用于设计和实现高质量的微信小程序界面，涵盖：

- 依照微信官方设计规范输出符合平台调性的 UI
- 使用原生组件（WXML/WXSS）构建页面和自定义组件
- 处理多机型适配（rpx 单位、安全区、刘海屏）
- 实现动画与交互效果
- 生成设计稿标注与切图建议

---

## 核心工作流程

### 1. 需求理解
- 确认页面类型（首页 / 列表 / 详情 / 表单 / 个人中心等）
- 确认品牌色与风格偏好（清新 / 商务 / 科技感等）
- 确认是否有现有设计稿或参考图

### 2. 设计阶段
- 先加载 `references/design-guidelines.md` 确认规范参数
- 以 750px 宽为基准设计，使用 rpx 作为布局单位
- 遵循 8pt 网格间距体系
- 优先使用微信品牌绿 `#07C160` 作为主题色（如无特殊需求）

### 3. 实现阶段
- 加载 `references/components.md` 确认原生组件用法
- 文件结构：每个页面包含 `.wxml`、`.wxss`、`.js`、`.json` 四个文件
- 布局优先使用 Flexbox
- 图片统一使用 `mode="aspectFill"` 并设置 `lazy-load`

### 4. 适配与优化
- 底部安全区：使用 `env(safe-area-inset-bottom)`
- 自定义导航栏：通过 `wx.getSystemInfo` 获取状态栏高度
- 1px 分割线：使用 `::after` + `scaleY(0.5)` 方案
- 文本截断：单行用 `ellipsis`，多行用 `-webkit-line-clamp`

---

## 代码输出规范

### 文件结构模板
```
pages/
  page-name/
    index.wxml    # 模板结构
    index.wxss    # 样式
    index.js      # 逻辑
    index.json    # 页面配置
```

### WXML 规范
- 使用语义化类名（BEM 命名：`block__element--modifier`）
- 列表渲染使用 `wx:for` + `wx:key`
- 条件渲染优先用 `wx:if`；频繁切换用 `hidden`
- 避免在模板中写复杂逻辑，计算结果放 `computed` 或 `data`

### WXSS 规范
- 全局样式写在 `app.wxss`，页面样式写在对应 `.wxss`
- 单位使用 `rpx`（布局间距）和 `px`（边框/阴影细节）
- 颜色、字号等设计变量集中定义，避免魔法数字

### JS 规范
- 页面生命周期：`onLoad` > `onShow` > `onReady`
- 数据请求放在 `onLoad`，刷新逻辑放在 `onShow`
- 使用 `wx.showLoading` / `wx.hideLoading` 管理加载态
- 错误处理：`wx.showToast({ title: '加载失败', icon: 'error' })`

---

## 常用页面模式

### 列表页
```
顶部搜索/筛选栏 → scroll-view 列表 → 列表项卡片 → 加载更多/空状态
```

### 详情页
```
自定义导航栏 → 轮播图 (swiper) → 内容区 (scroll-view) → 底部操作栏 (fixed)
```

### 表单页
```
导航栏 → 表单分组 (input/picker/switch) → 提交按钮
```

### 个人中心
```
用户信息头部 → 功能列表 (navigator) → 设置项
```

---

## 参考文档

- `references/design-guidelines.md`：微信小程序设计规范（尺寸、色彩、字体、间距、圆角、安全区）
- `references/components.md`：原生组件详细用法（含代码示例）

> 在设计任何页面前，先读取相关参考文档，确保输出符合微信平台规范。
