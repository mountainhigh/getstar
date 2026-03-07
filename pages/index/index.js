const { formatNumber, formatDate, showToast, showLoading, hideLoading } = require('../../utils/util');
const { getStorage, setStorage } = require('../../utils/storage');

Page({
  data: {
    childrenList: [],
    currentChildId: null,
    currentChild: null,
    habits: [],
    completedCount: 0,
    levelProgress: 0,
    levelName: '',
    currentBadge: null,
    tips: '连续打卡可以获得更多星星哦~',
    showSuccessModal: false,
    showLevelUpModal: false,
    lastPoints: 0,
    lastCoins: 0,
    oldLevel: 1,
    newLevel: 1,
    newLevelName: '',
    isNewUser: false,
    habitTemplates: [],
    showChildModal: false,
    childForm: {
      name: '',
      avatar: '👶'
    },
    avatarList: [
      '👶',
      '👦',
      '🧒',
      '👧',
      '🧑'
    ]
  },

  onLoad() {
    this.initPage();
  },

  onShow() {
    // 每次显示时刷新数据
    const app = getApp();
    
    // 检查是否需要刷新（从其他页面返回时）
    if (app.globalData.needRefreshIndex) {
      app.globalData.needRefreshIndex = false;
      this.initPage();
    } else {
      this.refreshData();
    }
  },

  /**
   * 初始化页面
   */
  async initPage() {
    try {
      showLoading('加载中...');

      // 等待 app 初始化完成
      const app = getApp();

      // 如果初始化还未完成，等待一段时间
      if (!app.globalData.isInitialized) {
        let waitCount = 0;
        while (!app.globalData.isInitialized && waitCount < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          waitCount++;
        }
      }

      const userInfo = app.getUserInfo();

      if (!userInfo.isLoggedIn) {
        hideLoading();
        showToast('登录失败，请重试');
        return;
      }

      // 加载孩子列表和习惯列表
      await this.loadChildrenList();

      // 如果是新用户且有习惯模板,设置标志
      if (app.globalData.habitTemplates && app.globalData.habitTemplates.length > 0) {
        this.setData({
          isNewUser: true,
          habitTemplates: app.globalData.habitTemplates
        });
      }

      hideLoading();
    } catch (err) {
      hideLoading();
      console.error('初始化页面失败:', err);
      showToast('加载失败,请重试');
    }
  },

  /**
   * 刷新数据
   */
  async refreshData() {
    try {
      // 从 storage 中读取最新的 currentChildId
      const currentChildId = getStorage('currentChildId');
      if (currentChildId && currentChildId !== this.data.currentChildId) {
        console.log('检测到孩子切换，更新 currentChildId:', currentChildId);
        this.setData({ currentChildId });
        // 同步更新 app.globalData
        getApp().globalData.currentChildId = currentChildId;
      }

      await this.loadCurrentChild();
      await this.loadHabits();
      await this.checkTodayStatus();
    } catch (err) {
      console.error('刷新数据失败:', err);
    }
  },

  /**
   * 加载孩子列表
   */
  async loadChildrenList() {
    try {
      const db = wx.cloud.database();
      const app = getApp();
      
      const res = await db.collection('children').where({
        familyId: app.globalData.familyId,
        isDeleted: false
      }).orderBy('createTime', 'asc').get();

      this.setData({ childrenList: res.data });

      // 如果没有选中的孩子,默认选中第一个
      if (!this.data.currentChildId && res.data.length > 0) {
        const firstChild = res.data[0];
        this.setData({ currentChildId: firstChild._id });
        setStorage('currentChildId', firstChild._id);
        app.globalData.currentChildId = firstChild._id;
      }

      // 加载当前孩子信息
      await this.loadCurrentChild();
    } catch (err) {
      console.error('加载孩子列表失败:', err);
    }
  },

  /**
   * 加载当前孩子信息
   */
  async loadCurrentChild() {
    try {
      if (!this.data.currentChildId) return;

      const db = wx.cloud.database();
      const res = await db.collection('children').doc(this.data.currentChildId).get();
      
      const child = res.data;
      const levelInfo = this.calculateLevel(child.points);
      
      // 加载当前称号
      let currentBadge = null;
      if (child.currentBadgeId) {
        const badgeRes = await db.collection('badges').doc(child.currentBadgeId).get();
        if (badgeRes.data) {
          currentBadge = badgeRes.data;
        }
      }
      
      this.setData({
        currentChild: child,
        levelProgress: levelInfo.progress,
        levelName: levelInfo.name,
        currentBadge
      });
    } catch (err) {
      console.error('加载孩子信息失败:', err);
    }
  },

  /**
   * 加载习惯列表
   */
  async loadHabits() {
    try {
      if (!this.data.currentChildId) return;

      const db = wx.cloud.database();
      const res = await db.collection('habits').where({
        childId: this.data.currentChildId,
        isActive: true
      }).orderBy('order', 'asc').get();

      this.setData({ habits: res.data });
      
      // 检查今日打卡状态
      await this.checkTodayStatus();
    } catch (err) {
      console.error('加载习惯列表失败:', err);
    }
  },

  /**
   * 检查今日打卡状态
   */
  async checkTodayStatus() {
    try {
      if (!this.data.currentChildId) return;

      // 使用东八区时间计算今天的日期
      const now = new Date();
      const beijingTimestamp = now.getTime() + (8 * 60 * 60 * 1000);
      const beijingTime = new Date(beijingTimestamp);

      const year = beijingTime.getUTCFullYear();
      const month = String(beijingTime.getUTCMonth() + 1).padStart(2, '0');
      const day = String(beijingTime.getUTCDate()).padStart(2, '0');
      const today = `${year}-${month}-${day}`;

      const db = wx.cloud.database();

      console.log('=== 检查今日打卡状态 ===');
      console.log('当前 UTC 时间戳:', now.getTime());
      console.log('UTC 时间:', now.toISOString());
      console.log('东八区时间戳:', beijingTimestamp);
      console.log('东八区时间:', beijingTime.toISOString());
      console.log('currentChildId:', this.data.currentChildId);
      console.log('today:', today);
      console.log('东八区年月日:', year, month, day);

      const res = await db.collection('check_ins').where({
        childId: this.data.currentChildId,
        date: today
      }).get();

      console.log('check_ins 查询结果:', res.data);
      console.log('check_ins 数量:', res.data.length);

      const checkedHabitIds = res.data.map(item => item.habitId);
      console.log('已打卡的 habitIds:', checkedHabitIds);

      console.log('原始 habits:', this.data.habits);

      const habits = this.data.habits.map(habit => ({
        ...habit,
        todayChecked: checkedHabitIds.includes(habit._id)
      }));

      console.log('处理后的 habits:', habits);

      const completedCount = habits.filter(h => h.todayChecked).length;
      console.log('已完成数量:', completedCount);

      this.setData({
        habits,
        completedCount
      });

      console.log('=== 检查今日打卡状态结束 ===');
    } catch (err) {
      console.error('检查打卡状态失败:', err);
      // 如果集合不存在,静默处理
      if (err.errCode && err.errCode === -502005) {
        console.log('check_ins 集合不存在,将自动创建');
      }
    }
  },

  /**
   * 切换孩子
   */
  switchChild(e) {
    const childId = e.currentTarget.dataset.id;
    if (childId === this.data.currentChildId) return;

    setStorage('currentChildId', childId);
    getApp().globalData.currentChildId = childId;
    
    this.setData({ currentChildId: childId });
    this.refreshData();
  },

  /**
   * 前往打卡页面
   */
  goToCheckIn(e) {
    const habit = e.currentTarget.dataset.habit;
    
    if (habit.todayChecked) {
      showToast('今日已打卡');
      return;
    }

    wx.navigateTo({
      url: `/pages/check-in-detail/check-in-detail?habitId=${habit._id}`
    });
  },

  /**
   * 前往习惯管理
   */
  goToHabitManage() {
    wx.switchTab({
      url: '/pages/habit-manage/habit-manage'
    });
  },

  /**
   * 计算等级信息
   */
  calculateLevel(points) {
    const levels = [
      { level: 1, name: '新手宝宝', points: 0 },
      { level: 2, name: '初学者', points: 10 },
      { level: 3, name: '进步之星', points: 30 },
      { level: 4, name: '小能手', points: 50 },
      { level: 5, name: '努力达人', points: 80 },
      { level: 6, name: '进步达人', points: 120 },
      { level: 7, name: '优秀宝宝', points: 180 },
      { level: 8, name: '小小标兵', points: 250 },
      { level: 9, name: '模范宝宝', points: 350 },
      { level: 10, name: '超级明星', points: 500 },
      { level: 11, name: '优秀标兵', points: 700 },
      { level: 12, name: '进步先锋', points: 900 },
      { level: 13, name: '习惯达人', points: 1200 },
      { level: 14, name: '自律之星', points: 1500 },
      { level: 15, name: '优秀榜样', points: 1900 },
      { level: 16, name: '超级榜样', points: 2400 },
      { level: 17, name: '习惯之王', points: 3000 },
      { level: 18, name: '自律之王', points: 3800 },
      { level: 19, name: '全能之星', points: 4800 },
      { level: 20, name: '习惯大师', points: 6000 }
    ];

    let currentLevel = levels[0];
    let nextLevel = levels[1];
    let progress = 100;

    for (let i = 0; i < levels.length; i++) {
      if (points >= levels[i].points) {
        currentLevel = levels[i];
        nextLevel = levels[i + 1] || levels[i];
        
        if (nextLevel) {
          const currentPoints = levels[i].points;
          const nextPoints = nextLevel.points;
          progress = ((points - currentPoints) / (nextPoints - currentPoints)) * 100;
          progress = Math.min(100, Math.max(0, Math.round(progress)));
        }
      }
    }

    return {
      level: currentLevel.level,
      name: currentLevel.name,
      progress: progress
    };
  },

  /**
   * 显示打卡成功弹窗
   */
  showSuccess(points, coins) {
    this.setData({
      showSuccessModal: true,
      lastPoints: points,
      lastCoins: coins
    });
  },

  /**
   * 显示升级弹窗
   */
  showLevelUp(oldLevel, newLevel, newLevelName) {
    this.setData({
      showLevelUpModal: true,
      oldLevel,
      newLevel,
      newLevelName
    });
  },

  /**
   * 关闭打卡成功弹窗
   */
  closeSuccessModal() {
    this.setData({ showSuccessModal: false });
    this.refreshData();
  },

  /**
   * 关闭升级弹窗
   */
  closeLevelUpModal() {
    this.setData({ showLevelUpModal: false });
    this.refreshData();
  },

  /**
   * 跳转到称号页面
   */
  goToBadges() {
    wx.navigateTo({
      url: '/pages/badge-collection/badge-collection'
    });
  },

  /**
   * 跳转到礼品兑换页面
   */
  goToExchange() {
    wx.navigateTo({
      url: '/pages/reward-exchange/reward-exchange'
    });
  },

  /**
   * 首次登录添加孩子
   */
  addFirstChild() {
    this.setData({
      showChildModal: true,
      childForm: {
        name: '',
        avatar: this.data.avatarList[0]
      }
    });
  },

  /**
   * 保存孩子（首次登录）
   */
  async saveChild() {
    const { name, avatar } = this.data.childForm;

    if (!name.trim()) {
      showToast('请输入孩子姓名');
      return;
    }

    try {
      showLoading('添加中...');

      const app = getApp();
      const db = wx.cloud.database();

      // 添加孩子（_openid 由系统自动注入）
      const childResult = await db.collection('children').add({
        data: {
          familyId: app.globalData.familyId,
          openid: app.globalData.openid,
          name: name.trim(),
          avatar: avatar,
          points: 0,
          coins: 0,
          level: 1,
          isDeleted: false,
          createTime: db.serverDate()
        }
      });

      const childId = childResult._id || childResult.id || childResult.data?._id;
      console.log('孩子添加成功,childId:', childId);

      // 从模板批量添加习惯(按order排序,前10个)
      showLoading('正在添加习惯模板...');
      const addResult = await wx.cloud.callFunction({
        name: 'addHabitsFromTemplates',
        data: {
          childId: childId,
          limit: 10
        }
      });
      console.log('习惯模板添加结果:', addResult);
      console.log('习惯模板添加完成');

      // 设置为当前孩子
      setStorage('currentChildId', childId);
      app.globalData.currentChildId = childId;

      hideLoading();
      showToast('添加成功');

      // 关闭弹窗
      this.setData({ showChildModal: false });

      // 刷新页面数据
      await this.loadChildrenList();
      await this.loadHabits();

      // 更新状态
      this.setData({ isNewUser: false });
    } catch (err) {
      hideLoading();
      console.error('添加孩子失败:', err);
      showToast(`添加失败: ${err.message || '请重试'}`);
    }
  },

  /**
   * 选择头像
   */
  selectAvatar(e) {
    const avatar = e.currentTarget.dataset.avatar;
    this.setData({
      'childForm.avatar': avatar
    });
  },

  /**
   * 输入姓名
   */
  onNameInput(e) {
    this.setData({
      'childForm.name': e.detail.value
    });
  },

  /**
   * 关闭弹窗
   */
  closeChildModal() {
    this.setData({ showChildModal: false });
  },

  /**
   * 阻止事件冒泡
   */
  stopPropagation() {}
});
