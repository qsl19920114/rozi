// app.js
App({
  onLaunch: function() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'nkuwiki-0g6bkdy9e8455d93',
        traceUser: true
      })
    }

    // 检查登录状态
    this.checkLoginStatus()

    // 测试时间格式化
    this.testTimeFormat()

    // 测试时间
    this.testTime()

      const logs = wx.getStorageSync('logs') || []
      logs.unshift(Date.now())
      wx.setStorageSync('logs', logs)
  },

  checkLoginStatus: function() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
    } else {
      // 跳转登录页面
      wx.redirectTo({
        url: '/pages/login/login'
      });
    }
  },

  // 微信一键登录
  wxLogin: async function() {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'login',
        success: res => {
          if (res.result.code === 0) {
            this.globalData.userInfo = res.result.data;
            resolve(res.result);
          } else {
            reject(new Error(res.result.message || '登录失败'));
          }
        },
        fail: err => {
          console.error('登录失败：', err);
          reject(err);
        }
      });
    });
  },

  logout() {
    // 清除所有本地存储
    wx.clearStorageSync();

    // 重定向到登录页
    wx.reLaunch({
      url: '/pages/login/login'
    });
  },

  globalData: {
  }
})
