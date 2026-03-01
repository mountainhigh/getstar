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
    tips: '连续打卡可以获得更多积分哦~',
    showSuccessModal: false,
    showLevelUpModal: false,
    lastPoints: 0,
    lastCoins: 0,
    oldLevel: 1,
    newLevel: 1,
    newLevelName: ''
  },

  onLoad() {
    this.initPage();
  },

  onShow() {
    // 每次显示时刷新数据
    this.refreshData();
  },

  /**
   * 初始化页面
   */
  async initPage() {
    try {
      showLoading('加载中...');

      // 检查登录状态
      const app = getApp();
      const userInfo = app.getUserInfo();

      if (!userInfo.isLoggedIn) {
        hideLoading();
        showToast('登录失败，请重试');
        return;
      }

      // 获取当前选中的孩子ID
      const currentChildId = getStorage('currentChildId');

      if (app.globalData.hasFamily === false) {
        // 没有创建家庭,跳转到孩子管理页面
        hideLoading();
        wx.navigateTo({
          url: '/pages/children-manage/children-manage?createFamily=true'
        });
        return;
      }

      if (currentChildId) {
        this.setData({ currentChildId });
      } else if (app.globalData.currentChildId) {
        this.setData({ currentChildId: app.globalData.currentChildId });
      }

      // 加载孩子列表和习惯列表
      await this.loadChildrenList();
      await this.loadHabits();
      
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
        familyId: app.globalData.familyId
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

      const today = formatDate(new Date(), 'YYYY-MM-DD');
      const db = wx.cloud.database();
      
      const res = await db.collection('check_ins').where({
        childId: this.data.currentChildId,
        date: today
      }).get();

      const checkedHabitIds = res.data.map(item => item.habitId);
      const habits = this.data.habits.map(habit => ({
        ...habit,
        todayChecked: checkedHabitIds.includes(habit._id)
      }));

      const completedCount = habits.filter(h => h.todayChecked).length;
      
      this.setData({
        habits,
        completedCount
      });
    } catch (err) {
      console.error('检查打卡状态失败:', err);
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
          progress = Math.min(100, Math.max(0, progress));
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
   * 阻止事件冒泡
   */
  stopPropagation() {}
});
