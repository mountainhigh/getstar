const app = getApp();

Page({
  data: {
    canIUseGetUserProfile: false,
  },
  onLoad() {
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true,
      });
    }
  },
  getUserProfile(e) {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        app.globalData.userInfo = res.userInfo;
        app.checkLoginAndInit().then(() => {
          wx.navigateBack();
        });
      },
      fail: (err) => {
        console.error('用户拒绝授权:', err);
        wx.showToast({
          title: '您拒绝了授权，部分功能将无法使用',
          icon: 'none',
          duration: 2000
        });
        wx.navigateBack(); // 用户拒绝授权，返回上一页
      }
    });
  },

  navigateBack() {
    wx.navigateBack(); // 点击暂不授权，返回上一页
  },
});