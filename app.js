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
      console.log('CloudBase 初始化完成，环境ID: cloud1-4g6msqhd5bbad708');
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
      isInitialized: false, // 是否初始化完成
    };

    // 创建初始化完成的 Promise
    this.initPromise = new Promise((resolve) => {
      this.initResolve = resolve;
    });

    // 检查登录状态并初始化用户数据
    this.checkLoginAndInit();
  },

  async checkLoginAndInit() {
    try {
      // 首先初始化数据库（只在首次启动时执行）
      await this.initDatabaseIfNeeded();

      // 调用登录云函数获取完整用户信息（静默登录，不获取用户信息）
      const loginRes = await wx.cloud.callFunction({
        name: 'userLogin'
      });

      if (loginRes.result && loginRes.result.success) {
        const { userId, openid, familyId, isNewUser, childrenCount, habitTemplates } = loginRes.result.data;

        // 先设置 openid，确保 loadFirstChild 能正常工作
        this.globalData.openid = openid;
        this.globalData.userId = userId;
        this.globalData.familyId = familyId;
        this.globalData.isLoggedIn = true;
        this.globalData.hasFamily = true;
        this.globalData.isInitialized = true; // 标记初始化完成

        // 保存习惯模板到全局数据（首次登录）
        if (isNewUser && habitTemplates) {
          this.globalData.habitTemplates = habitTemplates;
        }

        console.log('登录成功:', {
          userId,
          openid,
          familyId,
          isNewUser,
          childrenCount,
          hasTemplates: habitTemplates ? habitTemplates.length : 0
        });

        // 获取家庭中第一个孩子作为默认选中（确保 openid 已设置）
        if (familyId) {
          try {
            await this.loadFirstChild(familyId);
          } catch (err) {
            console.error('加载第一个孩子失败:', err);
          }
        }
      } else {
        console.error('登录云函数调用失败:', loginRes.result);
        this.globalData.isInitialized = true;
      }
      this.initResolve();
    } catch (err) {
      console.error('登录初始化失败:', err);
      this.globalData.isInitialized = true;
      this.initResolve();
    }
  },

  // 初始化数据库（如果需要）
  async initDatabaseIfNeeded() {
    try {
      // 检查是否已经初始化过
      const initFlag = wx.getStorageSync('dbInitialized');
      if (initFlag) {
        console.log('数据库已初始化，跳过');
        return;
      }

      console.log('首次启动，开始初始化数据库...');

      // 调用初始化云函数
      const initRes = await wx.cloud.callFunction({
        name: 'initDatabase',
        data: {
          drop: false
        }
      });

      if (initRes.result && initRes.result.success) {
        console.log('数据库初始化成功:', initRes.result.message);
        console.log('初始化结果:', initRes.result.data);

        // 标记为已初始化
        wx.setStorageSync('dbInitialized', true);
        console.log('数据库初始化完成，已标记');
      } else {
        console.error('数据库初始化失败:', initRes.result);
      }
    } catch (err) {
      console.error('数据库初始化异常:', err);
      // 初始化失败不影响小程序启动
    }
  },

  // 获取微信用户信息
  getWeChatUserInfo() {
    return new Promise((resolve) => {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (res) => {
          resolve({
            nickName: res.userInfo.nickName,
            avatarUrl: res.userInfo.avatarUrl
          });
        },
        fail: (err) => {
          console.log('获取用户信息失败，使用默认值:', err);
          // 用户拒绝授权，返回空值
          resolve({
            nickName: '',
            avatarUrl: ''
          });
        }
      });
    });
  },

  async loadFirstChild(familyId) {
    // 防止重复调用
    if (!familyId || !this.globalData.openid) {
      return;
    }

    // 如果已经设置了 currentChildId，不再重复加载
    if (this.globalData.currentChildId) {
      return;
    }

    try {
      const db = wx.cloud.database();
      const childRes = await db.collection('children').where({
        familyId: familyId,
        openid: this.globalData.openid
      }).orderBy('createTime', 'asc').limit(1).get();

      if (childRes.data.length > 0) {
        const childId = childRes.data[0]._id;
        console.log('设置默认孩子:', childId);
        this.globalData.currentChildId = childId;
      }
    } catch (err) {
      console.error('加载第一个孩子失败:', err);
    }
  },

  handleNotLoggedIn() {
    this.globalData.isLoggedIn = false;
    this.globalData.hasFamily = false;
  },

  // 获取当前用户信息
  getUserInfo() {
    return {
      isLoggedIn: this.globalData.isLoggedIn,
      userId: this.globalData.userId,
      openid: this.globalData.openid,
      familyId: this.globalData.familyId,
      hasFamily: this.globalData.hasFamily,
      currentChildId: this.globalData.currentChildId,
      isInitialized: this.globalData.isInitialized
    };
  },

  // 设置当前选中的孩子
  setCurrentChild(childId) {
    if (childId && childId !== this.globalData.currentChildId) {
      console.log('更新当前孩子:', childId);
      this.globalData.currentChildId = childId;
    }
  }
});
