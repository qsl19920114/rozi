Page({
  data: {
    // 移除邮箱相关字段
  },

  // 只保留微信登录功能
  async handleWxLogin() {
    try {
      const res = await getApp().wxLogin();
      if (res.code === 0) {
        // 保存用户信息到本地
        wx.setStorageSync('userInfo', res.data);
        wx.switchTab({ url: '/pages/index/index' });
      }
    } catch (err) {
      wx.showToast({
        title: err.message || '登录失败',
        icon: 'none'
      });
    }
  },

  onChooseAvatar(e) {
    // 保留头像选择功能
    const { avatarUrl } = e.detail;
    // 处理头像...
  }
}) 