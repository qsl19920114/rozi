Page({
  data: {
    companyName: '', // 公司名称
    address: '',     // 公司地址
    email: '',       // 联系邮箱
    currentYear: new Date().getFullYear()
  },

  onLoad: function() {
    this.setData({
      companyName: '您的公司名称',  // 在这里填写公司名称
      address: '您的公司地址',      // 在这里填写地址
      email: 'your@email.com'      // 在这里填写邮箱
    });
  }
}); 