const { showToast, showLoading, hideLoading, formatDate } = require('../../utils/util');

Page({
  data: {
    habitId: '',
    habit: null,
    points: 0,
    photos: [],
    remark: ''
  },

  onLoad(options) {
    const { habitId } = options;
    if (!habitId) {
      showToast('参数错误');
      wx.navigateBack();
      return;
    }

    this.setData({ habitId });
    this.loadHabit();
  },

  /**
   * 加载习惯信息
   */
  async loadHabit() {
    try {
      showLoading('加载中...');
      
      const db = wx.cloud.database();
      const res = await db.collection('habits').doc(this.data.habitId).get();
      
      if (!res.data) {
        hideLoading();
        showToast('习惯不存在');
        wx.navigateBack();
        return;
      }

      this.setData({
        habit: res.data,
        points: res.data.points
      });
      
      hideLoading();
    } catch (err) {
      hideLoading();
      console.error('加载习惯失败:', err);
      showToast('加载失败');
    }
  },

  /**
   * 调整星星
   */
  adjustPoints(e) {
    const delta = parseInt(e.currentTarget.dataset.delta);
    const newPoints = Math.max(0, this.data.points + delta);
    this.setData({ points: newPoints });
  },

  /**
   * 星星输入
   */
  onPointsInput(e) {
    const value = parseInt(e.detail.value);
    const points = isNaN(value) ? 0 : Math.max(0, value);
    this.setData({ points });
  },

  /**
   * 选择照片
   */
  async choosePhoto() {
    try {
      const res = await wx.chooseMedia({
        count: 9 - this.data.photos.length,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed']
      });

      const tempFiles = res.tempFiles.map(file => file.tempFilePath);
      
      // 上传到云存储
      showLoading('上传中...');
      const uploadPromises = tempFiles.map(file => this.uploadFile(file));
      const cloudPaths = await Promise.all(uploadPromises);
      
      hideLoading();
      
      this.setData({
        photos: [...this.data.photos, ...cloudPaths]
      });
    } catch (err) {
      hideLoading();
      if (err.errMsg && err.errMsg.includes('cancel')) {
        return;
      }
      console.error('选择照片失败:', err);
      showToast('选择失败');
    }
  },

  /**
   * 上传文件到云存储
   */
  async uploadFile(filePath) {
    try {
      const cloudPath = `checkin_photos/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
      const res = await wx.cloud.uploadFile({
        cloudPath,
        filePath
      });
      return res.fileID;
    } catch (err) {
      console.error('上传文件失败:', err);
      throw err;
    }
  },

  /**
   * 预览照片
   */
  previewPhoto(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({
      current: url,
      urls: this.data.photos
    });
  },

  /**
   * 删除照片
   */
  deletePhoto(e) {
    const index = e.currentTarget.dataset.index;
    const photos = [...this.data.photos];
    photos.splice(index, 1);
    this.setData({ photos });
  },

  /**
   * 备注输入
   */
  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
  },

  /**
   * 提交打卡
   */
  async submitCheckIn() {
    try {
      const { habit, points, photos, remark } = this.data;
      
      if (!habit) {
        showToast('习惯信息错误');
        return;
      }

      // 检查今日是否已打卡
      const today = formatDate(new Date(), 'YYYY-MM-DD');
      const db = wx.cloud.database();
      
      console.log('=== 打卡详情页检查今日是否已打卡 ===');
      console.log('habitId:', habit._id);
      console.log('date:', today);
      console.log('查询条件:', { habitId: habit._id, date: today });
      console.log('查询条件类型:', { habitIdType: typeof habit._id, dateType: typeof today });

      const checkRes = await db.collection('check_ins').where({
        habitId: habit._id,
        date: today
      }).get();

      console.log('打卡详情页查询结果:', checkRes.data.length, '条');
      console.log('打卡详情页详细数据:', checkRes.data);

      if (checkRes.data.length > 0) {
        console.log('今日已打卡，返回');
        showToast('今日已打卡');
        return;
      }

      showLoading('打卡中...');

      // 调用打卡云函数
      const res = await wx.cloud.callFunction({
        name: 'checkIn',
        data: {
          habitId: habit._id,
          points: points,
          photos: photos,
          remark: remark,
          habitPoints: habit.points // 记录习惯设置的星星值
        }
      });

      hideLoading();

      if (res.result.code === 0) {
        const { points: addedPoints, coins: addedCoins, oldLevel, newLevel, levelName } = res.result.data;
        
        // 显示成功提示
        showToast('打卡成功!');
        
        // 检查称号解锁
        this.checkBadgeUnlock();
        
        // 延迟返回首页
        setTimeout(() => {
          const pages = getCurrentPages();
          const prevPage = pages[pages.length - 2];
          
          // 如果是首页,传递升级信息
          if (prevPage && prevPage.route === 'pages/index/index') {
            prevPage.showSuccess(addedPoints, addedCoins);
            
            // 如果升级了,显示升级弹窗
            if (newLevel > oldLevel) {
              prevPage.showLevelUp(oldLevel, newLevel, levelName);
            }
          }
          
          wx.navigateBack();
        }, 500);
      } else {
        showToast(res.result.message || '打卡失败');
      }
    } catch (err) {
      hideLoading();
      console.error('打卡失败:', err);
      showToast('打卡失败,请重试');
    }
  },

  /**
   * 检查称号解锁
   */
  async checkBadgeUnlock() {
    try {
      const childId = wx.getStorageSync('currentChildId');
      if (!childId) return;

      const res = await wx.cloud.callFunction({
        name: 'checkBadgeUnlock',
        data: { childId }
      });

      if (res.result.success && res.result.data.unlockedBadges.length > 0) {
        // 有新称号解锁,显示解锁动画
        const unlockedBadges = res.result.data.unlockedBadges;
        
        // 延迟显示解锁动画,让打卡成功提示先显示
        setTimeout(() => {
          this.showBadgeUnlock(unlockedBadges);
        }, 1000);
      }
    } catch (err) {
      console.error('检查称号解锁失败:', err);
    }
  },

  /**
   * 显示称号解锁动画
   */
  showBadgeUnlock(badges) {
    // 显示第一个解锁的称号
    const badge = badges[0];
    
    wx.showModal({
      title: '🎉 恭喜解锁新称号!',
      content: `${badge.icon} ${badge.name}\n${badge.description}`,
      showCancel: false,
      confirmText: '太棒了!',
      confirmColor: '#FF6B6B',
      success: () => {
        // 如果还有其他称号,继续显示
        if (badges.length > 1) {
          setTimeout(() => {
            this.showBadgeUnlock(badges.slice(1));
          }, 500);
        }
      }
    });
  }
});
