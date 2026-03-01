// app.js
App({
  onLaunch() {
    // 初始化CloudBase
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloud1-4g6msqhd5bbad708', // CloudBase环境ID
        traceUser: true,
      });
    }

    // 获取用户信息
    this.globalData = {
      userInfo: null,
      openid: null,
      userId: null,
      familyId: null,
      currentChildId: null, // 当前选中的孩子ID
      isLoggedIn: false, // 登录状态
      hasFamily: false, // 是否有家庭
    };

    // 检查登录状态并初始化用户数据
    this.checkLoginAndInit();
  },

  async checkLoginAndInit() {
    try {
      // 获取openid
      const openid = await this.getOpenid();
      if (!openid) {
        console.error('获取openid失败');
        this.handleNotLoggedIn();
        return;
      }

      this.globalData.openid = openid;
      this.globalData.isLoggedIn = true;

      // 调用登录云函数获取完整用户信息
      const loginRes = await wx.cloud.callFunction({
        name: 'userLogin'
      });

      if (loginRes.result.success) {
        const { userId, familyId, isNewUser, childrenCount } = loginRes.result.data;

        this.globalData.userId = userId;
        this.globalData.familyId = familyId;
        this.globalData.hasFamily = true;

        console.log('登录成功:', {
          userId,
          familyId,
          isNewUser,
          childrenCount
        });

        // 获取家庭中第一个孩子作为默认选中
        if (familyId) {
          await this.loadFirstChild(familyId);
        }
      } else {
        console.error('登录云函数调用失败:', loginRes.result);
      }
    } catch (err) {
      console.error('登录初始化失败:', err);
      this.handleNotLoggedIn();
    }
  },

  async loadFirstChild(familyId) {
    try {
      const db = wx.cloud.database();
      const childRes = await db.collection('children').where({
        familyId: familyId
      }).orderBy('createTime', 'asc').limit(1).get();

      if (childRes.data.length > 0) {
        this.globalData.currentChildId = childRes.data[0]._id;
      }
    } catch (err) {
      console.error('加载第一个孩子失败:', err);
    }
  },

  handleNotLoggedIn() {
    this.globalData.isLoggedIn = false;
    this.globalData.hasFamily = false;
  },

  async getOpenid() {
    if (this.globalData.openid) {
      return this.globalData.openid;
    }

    try {
      const res = await wx.cloud.callFunction({
        name: 'login'
      });
      this.globalData.openid = res.result.openid;
      return this.globalData.openid;
    } catch (err) {
      console.error('获取openid失败:', err);
      return null;
    }
  },

  // 获取当前用户信息
  getUserInfo() {
    return {
      isLoggedIn: this.globalData.isLoggedIn,
      userId: this.globalData.userId,
      openid: this.globalData.openid,
      familyId: this.globalData.familyId,
      hasFamily: this.globalData.hasFamily,
      currentChildId: this.globalData.currentChildId
    };
  },

  // 设置当前选中的孩子
  setCurrentChild(childId) {
    this.globalData.currentChildId = childId;
  }
});
