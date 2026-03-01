# 微信小程序原生组件参考

## 一、视图容器

### view
基础容器，等同于 HTML `<div>`。
```html
<view class="container">内容</view>
```
- 常用属性：`hover-class`（点击态样式）、`hover-stay-time`

### scroll-view
可滚动容器，支持横向/纵向滚动。
```html
<!-- 纵向滚动 -->
<scroll-view scroll-y style="height: 400rpx;">
  <view>列表项...</view>
</scroll-view>

<!-- 横向滚动 -->
<scroll-view scroll-x style="white-space: nowrap;">
  <view style="display: inline-block;">...</view>
</scroll-view>
```
- 重要：纵向滚动必须设置固定高度

### swiper
轮播图/滑块容器。
```html
<swiper indicator-dots autoplay interval="3000" circular>
  <swiper-item wx:for="{{images}}" wx:key="index">
    <image src="{{item}}" mode="aspectFill"/>
  </swiper-item>
</swiper>
```

---

## 二、基础内容

### text
文本显示，支持长按复制。
```html
<text selectable user-select>可选择文本</text>
```
- 注意：`\n` 换行，`&nbsp;` 空格

### image
图片组件，必须设置宽高。
```html
<image src="{{url}}" mode="aspectFill" lazy-load/>
```

**mode 属性常用值：**
| mode | 说明 |
|------|------|
| `scaleToFill` | 拉伸填满（默认，可能变形） |
| `aspectFit` | 保持比例，完整显示（可能留白） |
| `aspectFill` | 保持比例，填满裁剪（推荐） |
| `widthFix` | 宽度固定，高度自适应 |
| `heightFix` | 高度固定，宽度自适应 |

### rich-text
富文本渲染，支持 HTML 子集。
```html
<rich-text nodes="{{htmlContent}}"/>
```

---

## 三、表单组件

### button
```html
<!-- 主按钮 -->
<button type="primary" bindtap="handleTap">确认</button>

<!-- 微信授权按钮 -->
<button open-type="getUserInfo" bindgetuserinfo="onGetUserInfo">
  微信登录
</button>

<!-- 客服按钮 -->
<button open-type="contact">联系客服</button>

<!-- 分享按钮 -->
<button open-type="share">分享</button>
```

**type 值：**`primary`（绿色）、`default`（白色）、`warn`（红色）

**size 值：**`default`（全宽）、`mini`（小尺寸）

### input
```html
<input
  type="text"
  placeholder="请输入内容"
  placeholder-style="color: #CCCCCC"
  maxlength="50"
  bindinput="onInput"
  bindconfirm="onConfirm"
/>
```

**type 值：**`text`、`number`、`idcard`、`digit`、`safe-password`、`nickname`

### textarea
```html
<textarea
  placeholder="请输入多行文本"
  maxlength="200"
  auto-height
  bindinput="onInput"
/>
```

### switch
```html
<switch checked="{{isOn}}" color="#07C160" bindchange="onSwitch"/>
```

### slider
```html
<slider min="0" max="100" value="{{val}}"
  activeColor="#07C160" bindchange="onSlide"/>
```

### picker
```html
<!-- 普通选择器 -->
<picker mode="selector" range="{{options}}" bindchange="onPick">
  <view>{{selectedItem}}</view>
</picker>

<!-- 日期选择器 -->
<picker mode="date" value="{{date}}" bindchange="onDatePick">
  <view>{{date}}</view>
</picker>

<!-- 时间选择器 -->
<picker mode="time" value="{{time}}" bindchange="onTimePick">
  <view>{{time}}</view>
</picker>
```

### checkbox / radio
```html
<checkbox-group bindchange="onCheck">
  <label wx:for="{{items}}" wx:key="value">
    <checkbox value="{{item.value}}" color="#07C160"/>
    {{item.label}}
  </label>
</checkbox-group>

<radio-group bindchange="onRadio">
  <label wx:for="{{options}}" wx:key="value">
    <radio value="{{item.value}}" color="#07C160"/>
    {{item.label}}
  </label>
</radio-group>
```

---

## 四、导航组件

### navigator
页面跳转链接。
```html
<!-- 普通跳转（push） -->
<navigator url="/pages/detail/index?id=1">跳转</navigator>

<!-- 替换当前页（replace） -->
<navigator url="/pages/home/index" open-type="redirect">替换</navigator>

<!-- 返回上一页 -->
<navigator open-type="navigateBack">返回</navigator>

<!-- 跳转 tabBar 页 -->
<navigator url="/pages/home/index" open-type="switchTab">首页</navigator>
```

---

## 五、媒体组件

### video
```html
<video
  src="{{videoUrl}}"
  controls
  autoplay="{{false}}"
  loop="{{false}}"
  poster="{{posterUrl}}"
  style="width: 100%; height: 422rpx;"
/>
```

### camera
```html
<camera device-position="back" flash="off"
  style="width: 100%; height: 600rpx;"/>
```

---

## 六、地图

### map
```html
<map
  longitude="{{longitude}}"
  latitude="{{latitude}}"
  markers="{{markers}}"
  scale="14"
  style="width: 100%; height: 600rpx;"
/>
```

---

## 七、画布

### canvas
```html
<canvas canvas-id="myCanvas" style="width: 300rpx; height: 300rpx;"/>
```
```js
const ctx = wx.createCanvasContext('myCanvas');
ctx.fillStyle = '#07C160';
ctx.fillRect(0, 0, 150, 150);
ctx.draw();
```

---

## 八、开放能力组件

### web-view
内嵌 H5 页面（仅支持服务商绑定域名）。
```html
<web-view src="https://example.com/h5"/>
```

### open-data
展示微信开放数据（头像、昵称）。
```html
<open-data type="userAvatarUrl"/>
<open-data type="userNickName"/>
```

---

## 九、自定义组件

### 组件文件结构
```
components/
  my-card/
    index.js
    index.json
    index.wxml
    index.wxss
```

### 组件 JSON 声明
```json
{
  "component": true
}
```

### 组件 JS 定义
```js
Component({
  properties: {
    title: { type: String, value: '' },
    count: { type: Number, value: 0 }
  },
  data: {
    innerState: ''
  },
  methods: {
    handleTap() {
      this.triggerEvent('tap', { id: this.data.id });
    }
  },
  lifetimes: {
    attached() { /* 组件挂载 */ },
    detached() { /* 组件卸载 */ }
  }
})
```

### 使用组件
```json
// 页面 .json 中引入
{
  "usingComponents": {
    "my-card": "/components/my-card/index"
  }
}
```
```html
<my-card title="标题" count="{{num}}" bindtap="onCardTap"/>
```

---

## 十、常用 CSS 技巧

### Flex 布局（小程序首选）
```css
.row { display: flex; align-items: center; }
.row-between { display: flex; justify-content: space-between; align-items: center; }
.col-center { display: flex; flex-direction: column; align-items: center; }
```

### 文本截断
```css
/* 单行 */
.ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 多行（2行） */
.ellipsis-2 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
```

### 1px 边框（Retina 屏）
```css
.border-bottom {
  position: relative;
}
.border-bottom::after {
  content: '';
  position: absolute;
  left: 0; right: 0; bottom: 0;
  height: 1px;
  background: #EDEDED;
  transform: scaleY(0.5);
}
```

### 安全区底部适配
```css
.safe-bottom {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}
```
