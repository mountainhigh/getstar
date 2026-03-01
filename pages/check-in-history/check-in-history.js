const { formatDate, showLoading, hideLoading } = require('../../utils/util');

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
    checkInDates: [],
    exporting: false
  },

  onLoad() {
    this.initPage();
  },

  onShow() {
    this.loadCheckInHistory();
  },

  /**
   * 初始化页面
   */
  initPage() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const date = formatDate(now, 'YYYY-MM-DD');

    this.setData({
      currentYear: year,
      currentMonth: month,
      selectedDate: date,
      selectedDateStr: `${month}月${now.getDate()}日`
    });

    this.generateCalendar();
    this.loadCheckInDates();
    this.loadCheckInHistory();
  },

  /**
   * 生成日历
   */
  generateCalendar() {
    const { currentYear, currentMonth } = this.data;
    const now = new Date();
    const todayStr = formatDate(now, 'YYYY-MM-DD');
    
    // 获取当月第一天
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    // 获取当月最后一天
    const lastDay = new Date(currentYear, currentMonth, 0);
    
    // 获取当月第一天是星期几
    const firstWeekday = firstDay.getDay();
    // 获取当月总天数
    const totalDays = lastDay.getDate();
    
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
      const isSelected = dateStr === this.data.selectedDate;
      const hasCheckIn = this.data.checkInDates.includes(dateStr);
      
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
    
    this.setData({ calendarDays: days });
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
    
    this.generateCalendar();
    this.loadCheckInDates();
  },

  /**
   * 选择日期
   */
  selectDate(e) {
    const date = e.currentTarget.dataset.date;
    if (!date) return;
    
    const dateObj = new Date(date);
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();
    
    this.setData({
      selectedDate: date,
      selectedDateStr: `${month}月${day}日`
    });
    
    // 更新日历选中状态
    const calendarDays = this.data.calendarDays.map(item => ({
      ...item,
      isSelected: item.date === date
    }));
    
    this.setData({ calendarDays });
    
    this.loadCheckInHistory();
  },

  /**
   * 加载打卡日期
   */
  async loadCheckInDates() {
    try {
      const { childId, currentYear, currentMonth } = this.data;
      
      if (!childId) {
        const app = getApp();
        childId = app.globalData.currentChildId;
      }
      
      if (!childId) return;
      
      this.setData({ childId });
      
      const db = wx.cloud.database();
      const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const monthEnd = `${currentYear}-${String(currentMonth).padStart(2, '0')}-31`;
      
      const res = await db.collection('check_ins').where({
        childId,
        date: db.command.gte(monthStart).and(db.command.lte(monthEnd))
      }).get();
      
      // 获取所有打卡日期
      const checkInDates = res.data.map(item => item.date);
      
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
      });
      
      this.generateCalendar();
    } catch (err) {
      console.error('加载打卡日期失败:', err);
    }
  },

  /**
   * 加载打卡记录
   */
  async loadCheckInHistory() {
    try {
      const { childId, selectedDate } = this.data;

      if (!childId || !selectedDate) return;

      showLoading('加载中...');

      const db = wx.cloud.database();
      const res = await db.collection('check_ins').where({
        childId,
        date: selectedDate
      }).orderBy('createTime', 'desc').get();

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

      this.setData({ checkInList });
      hideLoading();
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
      content: '撤销后将扣除对应的积分和金币，确定要撤销吗？',
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
   * 导出数据
   */
  async exportData() {
    if (!this.data.childId) {
      wx.showToast({
        title: '请先选择孩子',
        icon: 'none'
      });
      return;
    }

    this.setData({ exporting: true });
    showLoading('导出中...');

    try {
      const db = wx.cloud.database();
      const { childId, currentYear, currentMonth } = this.data;

      // 查询当月所有打卡记录
      const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const monthEnd = `${currentYear}-${String(currentMonth).padStart(2, '0')}-31`;

      const checkInRes = await db.collection('check_ins')
        .where({
          childId: childId,
          date: db.command.gte(monthStart).and(db.command.lte(monthEnd))
        })
        .orderBy('date', 'asc')
        .orderBy('createTime', 'asc')
        .get();

      if (checkInRes.data.length === 0) {
        hideLoading();
        this.setData({ exporting: false });
        wx.showToast({
          title: '本月没有打卡记录',
          icon: 'none'
        });
        return;
      }

      // 获取习惯信息
      const habitIds = [...new Set(checkInRes.data.map(item => item.habitId))];
      const habitRes = await db.collection('habits')
        .where({
          _id: db.command.in(habitIds)
        })
        .get();

      const habitMap = {};
      habitRes.data.forEach(habit => {
        habitMap[habit._id] = habit;
      });

      // 获取孩子信息
      const childRes = await db.collection('children')
        .doc(childId)
        .get();
      const childName = childRes.data ? childRes.data.name : '未知孩子';

      // 生成 CSV 内容
      let csvContent = '\uFEFF'; // 添加 BOM 以支持中文
      csvContent += '日期,时间,习惯名称,备注,积分,金币,照片数量\n';

      checkInRes.data.forEach(item => {
        const habit = habitMap[item.habitId];
        const habitName = habit ? habit.name : '未知习惯';
        const createTime = new Date(item.createTime);
        const time = `${String(createTime.getHours()).padStart(2, '0')}:${String(createTime.getMinutes()).padStart(2, '0')}`;
        const photosCount = item.photos ? item.photos.length : 0;

        csvContent += `${item.date},${time},"${habitName}","${item.remark || ''}",${item.points || 0},${item.coins || 0},${photosCount}\n`;
      });

      // 添加统计信息
      csvContent += `\n汇总信息\n`;
      csvContent += `孩子姓名,${childName}\n`;
      csvContent += `统计月份,${currentYear}年${currentMonth}月\n`;
      csvContent += `打卡次数,${checkInRes.data.length}\n`;
      csvContent += `获得积分,${this.data.monthStats.totalPoints}\n`;
      csvContent += `获得金币,${this.data.monthStats.totalCoins}\n`;

      // 写入临时文件
      const fs = wx.getFileSystemManager();
      const fileName = `${childName}_${currentYear}年${currentMonth}月打卡记录.csv`;
      const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;

      fs.writeFileSync(filePath, csvContent, 'utf-8');

      // 分享文件
      hideLoading();
      this.setData({ exporting: false });

      wx.shareFile({
        filePath: filePath,
        fileName: fileName,
        success: () => {
          console.log('文件分享成功');
        },
        fail: err => {
          console.error('文件分享失败:', err);
          // 如果分享失败，直接打开文件
          wx.openDocument({
            filePath: filePath,
            fileType: 'csv',
            showMenu: true
          });
        }
      });

    } catch (err) {
      hideLoading();
      this.setData({ exporting: false });
      console.error('导出失败:', err);
      wx.showToast({
        title: '导出失败',
        icon: 'none'
      });
    }
  }
});
