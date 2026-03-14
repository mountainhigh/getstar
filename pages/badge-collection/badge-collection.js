const { debug, info, warn, error } = require('../../utils/logger');
const db = wx.cloud.database();
const _ = db.command;

Page({
  data: {
    badges: [],
    filteredBadges: [],
    currentCategory: 'all',
    collectedCount: 0,
    currentBadge: null,
    rarityLabels: {
      'common': '普通',
      'rare': '稀有',
      'epic': '史诗',
      'legendary': '传说'
    },
    showDetail: false,
    selectedBadge: null,
    showUnlock: false,
    newUnlockedBadge: null,
    progressHint: ''
  },

  onLoad() {
    this.loadBadges();
    this.loadUserBadges();
  },

  /**
   * 加载称号列表
   */
  async loadBadges() {
    try {
      const res = await db.collection('badges').orderBy('order', 'asc').get();
      const badges = res.data.map(badge => ({
        ...badge,
        unlocked: false,
        isWearing: false,
        progress: 0,
        animation: null
      }));

      this.setData({ badges });
      this.filterBadges();
    } catch (err) {
      console.error('加载称号失败:', err);
    }
  },

  /**
   * 加载用户称号
   */
  async loadUserBadges() {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      if (!userInfo) return;

      const childId = wx.getStorageSync('currentChildId');
      if (!childId) return;

      // 获取用户已获得的称号
      const userBadgesRes = await db.collection('user_badges')
        .where({ childId })
        .get();

      const userBadgesMap = {};
      userBadgesRes.data.forEach(ub => {
        userBadgesMap[ub.badgeId] = ub;
      });

      // 查找当前佩戴的称号
      const childRes = await db.collection('children').doc(childId).get();
      const currentBadgeId = childRes.data.currentBadgeId || '';
      
      const badges = this.data.badges.map(badge => {
        const userBadge = userBadgesMap[badge.id];
        const isWearing = badge.id === currentBadgeId;
        
        return {
          ...badge,
          unlocked: !!userBadge,
          isWearing: isWearing,
          unlockedAt: userBadge ? userBadge.unlockedAt : null
        };
      });

      const collectedCount = badges.filter(b => b.unlocked).length;
      const currentBadge = badges.find(b => b.isWearing) || { name: '无' };

      this.setData({ badges, collectedCount, currentBadge });
      this.loadBadgeProgress();
      this.filterBadges();
    } catch (err) {
      console.error('加载用户称号失败:', err);
    }
  },

  /**
   * 加载称号进度
   */
  async loadBadgeProgress() {
    try {
      const childId = wx.getStorageSync('currentChildId');
      if (!childId) return;

      // 获取总打卡次数
      const totalCheckInsRes = await db.collection('check_ins')
        .where({ childId })
        .count();

      const totalCheckIns = totalCheckInsRes.total || 0;

      // 计算连续打卡天数
      const datesRes = await db.collection('check_ins')
        .where({ childId })
        .groupBy('date')
        .orderBy('date', 'desc')
        .limit(100)
        .get();

      const dates = datesRes.data.map(item => item.date);
      let consecutiveDays = this.calculateConsecutiveDays(dates);

      // 更新每个称号的进度
      const badges = this.data.badges.map(badge => {
        let progress = 0;
        let hint = '';

        if (badge.category === 'progress') {
          // 根据累计打卡次数计算进度
          const required = parseInt(badge.condition.match(/\d+/)[0]);
          progress = Math.min(100, Math.floor((totalCheckIns / required) * 100));
          hint = `已完成 ${totalCheckIns}/${required} 次打卡`;
        } else if (badge.category === 'consistency') {
          // 根据连续打卡天数计算进度
          const required = parseInt(badge.condition.match(/\d+/)[0]);
          progress = Math.min(100, Math.floor((consecutiveDays / required) * 100));
          hint = `已连续打卡 ${consecutiveDays}/${required} 天`;
        }

        return {
          ...badge,
          progress,
          progressHint: hint
        };
      });

      // 更新进度提示
      this.setData({ badges, progressHint: badges[0]?.progressHint || '' });
      this.filterBadges();
    } catch (err) {
      console.error('加载称号进度失败:', err);
    }
  },

  /**
   * 计算连续打卡天数
   */
  calculateConsecutiveDays(dates) {
    if (dates.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let consecutiveDays = 0;
    let currentDate = new Date(today);

    for (let i = 0; i < dates.length; i++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      if (dates.includes(dateStr)) {
        consecutiveDays++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (i === 0) {
        // 今天没打卡，检查昨天
        currentDate.setDate(currentDate.getDate() - 1);
        continue;
      } else {
        break;
      }
    }

    return consecutiveDays;
  },

  /**
   * 切换分类
   */
  switchCategory(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({ currentCategory: category });
    this.filterBadges();
  },

  /**
   * 过滤称号
   */
  filterBadges() {
    const { badges, currentCategory } = this.data;
    let filtered = [];

    switch (currentCategory) {
      case 'all':
        filtered = badges;
        break;
      case 'collected':
        filtered = badges.filter(b => b.unlocked);
        break;
      case 'progress':
        filtered = badges.filter(b => b.category === 'progress');
        break;
      case 'consistency':
        filtered = badges.filter(b => b.category === 'consistency');
        break;
    }

    this.setData({ filteredBadges: filtered });
  },

  /**
   * 点击称号
   */
  onBadgeTap(e) {
    const badge = e.currentTarget.dataset.badge;
    
    if (!badge.unlocked) {
      // 未解锁的称号显示详情但不弹出
      return;
    }

    this.setData({ 
      showDetail: true, 
      selectedBadge: badge,
      progressHint: badge.progressHint || '已完成!'
    });
  },

  /**
   * 关闭详情
   */
  closeDetail() {
    this.setData({ showDetail: false, selectedBadge: null });
  },

  /**
   * 阻止冒泡
   */
  stopPropagation() {},

  /**
   * 佩戴称号
   */
  async wearBadge() {
    try {
      const { selectedBadge } = this.data;
      const childId = wx.getStorageSync('currentChildId');

      showLoading('处理中...');

      const newBadgeId = selectedBadge.isWearing ? '' : selectedBadge.id;

      // 更新孩子当前称号
      await db.collection('children').doc(childId).update({
        data: {
          currentBadgeId: newBadgeId,
          updateTime: new Date()
        }
      });

      hideLoading();

      wx.showToast({
        title: selectedBadge.isWearing ? '已取消佩戴' : '佩戴成功',
        icon: 'success'
      });

      // 刷新数据
      this.loadUserBadges();
      this.closeDetail();
    } catch (err) {
      hideLoading();
      console.error('佩戴称号失败:', err);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  },

  /**
   * 关闭解锁弹窗
   */
  closeUnlock() {
    this.setData({ 
      showUnlock: false, 
      newUnlockedBadge: null 
    });
  },

  /**
   * 分享给好友
   */
  onShareAppMessage() {
    const collectedCount = this.data.collectedCount || 0;
    return {
      title: collectedCount > 0 ? `我在攒星星已收集${collectedCount}个称号！` : '攒星星 - 称号收藏',
      path: '/pages/badge-collection/badge-collection',
      imageUrl: '/images/share-cover.png'
    };
  },

  /**
   * 分享到朋友圈
   */
  onShareTimeline() {
    const collectedCount = this.data.collectedCount || 0;
    return {
      title: collectedCount > 0 ? `我在攒星星已收集${collectedCount}个称号！` : '攒星星 - 称号收藏',
      query: '',
      imageUrl: '/images/share-cover.png'
    };
  }
});
