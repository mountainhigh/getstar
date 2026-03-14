const { formatDate, showLoading, hideLoading } = require('../../utils/util');
const { getStorage } = require('../../utils/storage');
const { debug, info, warn, error } = require('../../utils/logger');

Page({
  data: {
    childId: '',
    currentYear: 0,
    currentMonth: 0,
    selectedDate: '',
    selectedDateStr: '',
    isCurrentMonth: true,
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    calendarDays: [],
    monthStats: {
      checkInCount: 0,
      totalPoints: 0,
      totalCoins: 0
    },
    checkInList: [],
    checkInDates: []
  },

  onLoad() {
    this.initPage();
  },

  onShow() {
    // 从 storage 读取最新的 currentChildId
    const storageChildId = getStorage('currentChildId');
    if (storageChildId && storageChildId !== this.data.childId) {
      debug('打卡历史页面检测到孩子切换:', storageChildId);
      this.setData({ childId: storageChildId });
      // 重新初始化页面
      this.initPage();
    } else if (this.data.calendarDays.length > 0) {
      // 如果日历已经生成，只刷新打卡历史
      this.loadCheckInHistory();
    }
  },

  /**
   * 初始化页面
   */
  initPage() {
    debug('=== initPage 开始 ===');
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const date = formatDate(now, 'YYYY-MM-DD');

    debug('当前日期:', { year, month, date });

    this.setData({
      currentYear: year,
      currentMonth: month,
      selectedDate: date,
      selectedDateStr: `${month}月${now.getDate()}日`
    });

    debug('setData 完成，selectedDate:', this.data.selectedDate);

    // 先加载打卡日期，再生成日历，确保日历能正确标记打卡状态
    this.loadCheckInDates().then(() => {
      debug('loadCheckInDates 完成，开始生成日历');
      this.generateCalendar();
      debug('generateCalendar 完成，开始加载打卡历史');
      this.loadCheckInHistory();
      debug('loadCheckInHistory 完成');
    }).catch(err => {
      console.error('initPage 出错:', err);
    });
  },

  /**
   * 生成日历
   */
  generateCalendar() {
    debug('=== generateCalendar 开始 ===');
    const { currentYear, currentMonth, selectedDate, checkInDates } = this.data;
    debug('当前数据:', { currentYear, currentMonth, selectedDate, checkInDates });

    const now = new Date();
    const todayStr = formatDate(now, 'YYYY-MM-DD');
    debug('今天日期:', todayStr);

    // 获取当月第一天
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    // 获取当月最后一天
    const lastDay = new Date(currentYear, currentMonth, 0);

    // 获取当月第一天是星期几
    const firstWeekday = firstDay.getDay();
    // 获取当月总天数
    const totalDays = lastDay.getDate();
    debug('日历信息:', { firstWeekday, totalDays });

    // 生成日历数组
    const days = [];

    // 上个月的日期
    const prevLastDay = new Date(currentYear, currentMonth - 1, 0).getDate();
    for (let i = firstWeekday - 1; i >= 0; i--) {
      const day = prevLastDay - i;
      days.push({
        day,
        date: '',
        isOtherMonth: true,
        isToday: false,
        hasCheckIn: false,
        isSelected: false
      });
    }

    // 当月的日期
    for (let i = 1; i <= totalDays; i++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === selectedDate;
      const hasCheckIn = checkInDates.includes(dateStr);

      if (isToday) {
        debug('今天:', dateStr, '是否选中:', isSelected);
      }
      if (isSelected) {
        debug('选中日期:', dateStr);
      }

      days.push({
        day: i,
        date: dateStr,
        isOtherMonth: false,
        isToday,
        hasCheckIn,
        isSelected
      });
    }

    // 下个月的日期
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        date: '',
        isOtherMonth: true,
        isToday: false,
        hasCheckIn: false,
        isSelected: false
      });
    }

    debug('日历生成完成，共', days.length, '天');
    debug('选中的日期数量:', days.filter(d => d.isSelected).length);

    this.setData({ calendarDays: days }, () => {
      debug('日历数据已更新到视图');
    });
  },

  /**
   * 切换月份
   */
  changeMonth(e) {
    const direction = e.currentTarget.dataset.direction;
    let { currentYear, currentMonth } = this.data;

    if (direction === 'prev') {
      currentMonth--;
      if (currentMonth === 0) {
        currentMonth = 12;
        currentYear--;
      }
    } else {
      currentMonth++;
      if (currentMonth === 13) {
        currentMonth = 1;
        currentYear++;
      }
    }

    const now = new Date();
    const isCurrentMonth = currentYear === now.getFullYear() && currentMonth === now.getMonth() + 1;

    this.setData({
      currentYear,
      currentMonth,
      isCurrentMonth
    });

    // 先加载打卡日期，再生成日历
    this.loadCheckInDates().then(() => {
      this.generateCalendar();
    });
  },

  /**
   * 选择日期
   */
  selectDate(e) {
    debug('=== selectDate 开始 ===');
    const date = e.currentTarget.dataset.date;
    debug('点击的日期:', date);

    if (!date) {
      debug('日期为空，返回');
      return;
    }

    const dateObj = new Date(date);
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();

    debug('即将设置:', { selectedDate: date, selectedDateStr: `${month}月${day}日` });

    this.setData({
      selectedDate: date,
      selectedDateStr: `${month}月${day}日`
    }, () => {
      debug('setData 完成，selectedDate:', this.data.selectedDate);
      // 在 setData 回调中更新日历选中状态和加载记录
      const calendarDays = this.data.calendarDays.map(item => ({
        ...item,
        isSelected: item.date === date
      }));

      debug('更新日历选中状态，选中的日期数:', calendarDays.filter(d => d.isSelected).length);

      this.setData({ calendarDays }, () => {
        debug('日历已更新，开始加载打卡历史');
        this.loadCheckInHistory();
      });
    });
  },

  /**
   * 加载打卡日期
   */
  async loadCheckInDates() {
    debug('=== loadCheckInDates 开始 ===');
    try {
      let { childId, currentYear, currentMonth } = this.data;
      debug('当前数据:', { childId, currentYear, currentMonth });

      if (!childId) {
        // 优先从 storage 读取
        const app = getApp();
        childId = getStorage('currentChildId') || app.globalData.currentChildId;
        debug('从 storage/globalData 获取 childId:', childId);
        if (childId) {
          this.setData({ childId });
        }
      }

      if (!childId) {
        debug('childId 为空，返回');
        return;
      }

      const db = wx.cloud.database();
      const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const monthEnd = `${currentYear}-${String(currentMonth).padStart(2, '0')}-31`;

      debug('查询日期范围:', { monthStart, monthEnd });

      const res = await db.collection('check_ins').where({
        childId,
        date: db.command.gte(monthStart).and(db.command.lte(monthEnd))
      }).get();

      debug('查询结果:', res.data.length, '条记录');

      // 获取所有打卡日期
      const checkInDates = res.data.map(item => item.date);
      debug('打卡日期列表:', checkInDates);

      // 计算月度统计
      const totalPoints = res.data.reduce((sum, item) => sum + (item.points || 0), 0);
      const totalCoins = res.data.reduce((sum, item) => sum + (item.coins || 0), 0);

      this.setData({
        checkInDates,
        monthStats: {
          checkInCount: res.data.length,
          totalPoints,
          totalCoins
        }
      }, () => {
        debug('checkInDates 已更新到视图:', this.data.checkInDates);
      });

      // 移除 generateCalendar() 调用，由调用者统一处理
    } catch (err) {
      console.error('加载打卡日期失败:', err);
    }
  },

  /**
   * 加载打卡记录
   */
  async loadCheckInHistory() {
    debug('=== loadCheckInHistory 开始 ===');
    try {
      const { childId, selectedDate } = this.data;
      debug('查询打卡记录:', { childId, selectedDate });

      if (!childId || !selectedDate) {
        debug('childId 或 selectedDate 为空，返回');
        return;
      }

      showLoading('加载中...');

      const db = wx.cloud.database();

      const res = await db.collection('check_ins').where({
        childId,
        date: selectedDate
      }).get();

      debug('打卡记录查询结果:', res.data.length, '条');

      // 获取习惯信息
      const habitIds = res.data.map(item => item.habitId);
      let habitMap = {};

      if (habitIds.length > 0) {
        const habitRes = await db.collection('habits').where({
          _id: db.command.in(habitIds)
        }).get();

        habitMap = habitRes.data.reduce((map, habit) => {
          map[habit._id] = habit;
          return map;
        }, {});
      }

      // 计算24小时内是否可以撤销
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // 组装数据
      const checkInList = res.data.map(item => {
        const habit = habitMap[item.habitId] || {};
        const createTime = new Date(item.createTime);

        return {
          ...item,
          habitName: habit.name || '未知习惯',
          habitIcon: habit.icon || '📝',
          habitColor: habit.categoryColor || '#FF6B6B',
          time: `${String(createTime.getHours()).padStart(2, '0')}:${String(createTime.getMinutes()).padStart(2, '0')}`,
          canUndo: createTime > twentyFourHoursAgo // 24小时内可撤销
        };
      });

      debug('打卡记录列表已组装:', checkInList.length, '条');

      this.setData({ checkInList }, () => {
        debug('打卡记录已更新到视图');
        hideLoading();
      });
    } catch (err) {
      hideLoading();
      console.error('加载打卡记录失败:', err);
    }
  },

  /**
   * 预览照片
   */
  previewPhotos(e) {
    const { photos, current } = e.currentTarget.dataset;
    wx.previewImage({
      current,
      urls: photos
    });
  },

  /**
   * 长按打卡记录显示撤销选项
   */
  onLongPressHistory(e) {
    const record = e.currentTarget.dataset.id;
    const checkInRecord = this.data.checkInList.find(item => item._id === record);

    if (checkInRecord && checkInRecord.canUndo) {
      wx.showActionSheet({
        itemList: ['撤销打卡'],
        success: res => {
          if (res.tapIndex === 0) {
            this.undoCheckIn(e);
          }
        }
      });
    }
  },

  /**
   * 撤销打卡
   */
  undoCheckIn(e) {
    const checkInId = e.currentTarget.dataset.id || (e.currentTarget.dataset && e.currentTarget.dataset.id);

    wx.showModal({
      title: '确认撤销',
      content: '撤销后将扣除对应的星星和金币，确定要撤销吗？',
      confirmText: '确定撤销',
      confirmColor: '#FF6B6B',
      success: res => {
        if (res.confirm) {
          this.executeUndo(checkInId);
        }
      }
    });
  },

  /**
   * 执行撤销操作
   */
  async executeUndo(checkInId) {
    try {
      showLoading('撤销中...');

      const res = await wx.cloud.callFunction({
        name: 'undoCheckIn',
        data: {
          checkInId: checkInId
        }
      });

      hideLoading();

      if (res.result.success) {
        wx.showToast({
          title: '撤销成功',
          icon: 'success'
        });

        // 刷新数据
        this.loadCheckInDates();
        this.loadCheckInHistory();
      } else {
        wx.showToast({
          title: res.result.message || '撤销失败',
          icon: 'none'
        });
      }
    } catch (err) {
      hideLoading();
      console.error('撤销打卡失败:', err);
      wx.showToast({
        title: '撤销失败',
        icon: 'none'
      });
    }
  },

  /**
   * 分享给好友
   */
  onShareAppMessage() {
    return {
      title: '攒星星 - 查看打卡历史记录',
      path: '/pages/check-in-history/check-in-history',
      imageUrl: '/images/share-cover.png'
    };
  },

  /**
   * 分享到朋友圈
   */
  onShareTimeline() {
    return {
      title: '攒星星 - 查看打卡历史记录',
      query: '',
      imageUrl: '/images/share-cover.png'
    };
  }
});
