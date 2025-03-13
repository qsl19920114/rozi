# 微信小程序开发指南

## 开发环境准备

1. 下载安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 填写 AppID

## 项目结构说明

```
project
│
├── pages/ # 页面文件夹
│ ├── index/ # 首页
│ ├── search/ # 搜索页
│ ├── discover/ # 发现页
│ └── profile/ # 个人中心
│
├── assets/ # 静态资源
│ └── icons/ # 图标文件
│
├── app.js # 小程序入口文件
├── app.json # 小程序全局配置
├── app.wxss # 全局样式
└── project.config.json # 项目配置文件
```


## 重要文件说明

- `app.json`: 全局配置文件，包含页面路由、窗口样式、底部导航等配置
- `app.js`: 小程序入口文件，包含全局逻辑
- `app.wxss`: 全局样式文件
- 每个页面包含四个文件：
  - `.js`: 页面逻辑
  - `.wxml`: 页面结构（相当于 HTML）
  - `.wxss`: 页面样式（相当于 CSS）
  - `.json`: 页面配置

## 开发基础知识

### 1. 文件类型介绍

前端设计原型图：https://mastergo.com/goto/HrncAZgN?page_id=M&file=152887751273499 
- `WXML`：框架设计的一套标签语言，用于描述页面结构
- `WXSS`：样式语言，类似 CSS
- `JS`：小程序的逻辑层，处理数据和用户操作
- `JSON`：配置文件

### 2. 常用组件

- `view`: 视图容器，类似 div
- `text`: 文本组件
- `button`: 按钮组件
- `image`: 图片组件
- `scroll-view`: 可滚动视图区域

### 3. 生命周期

页面生命周期函数：
- `onLoad`: 页面加载时触发
- `onShow`: 页面显示时触发
- `onReady`: 页面初次渲染完成时触发
- `onHide`: 页面隐藏时触发
- `onUnload`: 页面卸载时触发


## 开发注意事项

1. 小程序总包大小限制为 2M，超过需要分包，注意控制代码和资源大小
2. 除了图标类的图片，其余图片一律上传图床
3. 及时清理不使用的文件和代码
4. 遵循小程序的[设计指南](https://developers.weixin.qq.com/miniprogram/design/)
5. 注意用户数据隐私保护
6. 做好错误处理和异常捕获


## 发布流程

1. 完成开发和测试
2. 在开发者工具中点击"上传"
3. 登录微信公众平台
4. 在版本管理中提交审核
5. 审核通过后发布

## 学习资源

- [微信小程序官方文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [小程序设计指南](https://developers.weixin.qq.com/miniprogram/design/)
- [小程序示例](https://developers.weixin.qq.com/miniprogram/dev/demo.html)

## 常见问题

1. 真机预览需要在公众平台配置开发者权限
2. 注意 AppID 的正确配置
3. 本地存储有大小限制
4. 部分 API 仅在真机上可用
5. 注意兼容性问题，特别是低版本

