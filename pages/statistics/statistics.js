const app = getApp()
const { getStorage, setStorage } = require('../../utils/storage')

Page({
  data: {
    currentPeriod: 'today', // today, week, month
    children: [],
    currentChildIndex: 0,
    currentChildId: '',
    stats: {
      checkInCount: 0,
      totalPoints: 0,
      totalCoins: 0,
      maxStreak: 0
    },
    habitStats: [],
    pointsTrend: [],
    heatmapData: [],
    loading: true
  },

  onLoad(options) {
    if (options.childId) {
      this.setData({ currentChildId: options.childId })
    }
    this.loadChildren()
  },

  onShow() {
    // 从 storage 读取最新的 currentChildId
    const storageChildId = getStorage('currentChildId')
    if (storageChildId && storageChildId !== this.data.currentChildId) {
      console.log('统计页面检测到孩子切换:', storageChildId)
      this.setData({ currentChildId: storageChildId })
      // 同步到 app.globalData
      app.globalData.currentChildId = storageChildId
    }
    this.loadStatistics()
  },

  // 加载孩子列表
  loadChildren() {
    const db = wx.cloud.database()

    db.collection('children')
      .where({
        familyId: app.globalData.familyId,
        isDeleted: false
      })
      .orderBy('createTime', 'asc')
      .get({
        success: res => {
          console.log('孩子列表:', res.data)

          if (res.data.length > 0) {
            if (!this.data.currentChildId) {
              this.setData({
                children: res.data,
                currentChildIndex: 0,
                currentChildId: res.data[0]._id
              })
              setStorage('currentChildId', res.data[0]._id)
              app.globalData.currentChildId = res.data[0]._id
            } else {
              const index = res.data.findIndex(c => c._id === this.data.currentChildId)
              this.setData({
                children: res.data,
                currentChildIndex: index >= 0 ? index : 0
              })
            }
            this.loadStatistics()
          }
        },
        fail: err => {
          console.error('加载孩子列表失败:', err)
        }
      })
  },

  // 切换时间周期
  switchPeriod(e) {
    const period = e.currentTarget.dataset.period
    this.setData({ currentPeriod: period })
    this.loadStatistics()
  },

  // 选择孩子
  selectChild(e) {
    const index = e.detail.value
    this.setData({
      currentChildIndex: index,
      currentChildId: this.data.children[index]._id
    })
    this.loadStatistics()
  },

  // 加载统计数据
  async loadStatistics() {
    if (!this.data.currentChildId) {
      this.setData({ loading: false })
      return
    }

    this.setData({ loading: true })

    const { currentChildId, currentPeriod } = this.data
    const db = wx.cloud.database()

    // 计算日期范围
    const now = new Date()
    let startDate = new Date()

    switch (currentPeriod) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        startDate = new Date(now)
        startDate.setDate(now.getDate() - now.getDay() + 1) // 本周一
        startDate.setHours(0, 0, 0, 0)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
    }

    try {
      // 查询打卡记录
      const checkInRes = await db.collection('check_ins')
        .where({
          childId: currentChildId,
          createTime: db.command.gte(startDate)
        })
        .get()

      const checkIns = checkInRes.data
      console.log('打卡记录:', checkIns)

      // 计算统计数据
      const totalPoints = checkIns.reduce((sum, item) => sum + (item.points || 0), 0)
      const totalCoins = checkIns.reduce((sum, item) => sum + (item.coins || 0), 0)

      // 计算最长连续天数
      const maxStreak = await this.calculateMaxStreak(currentChildId)

      // 习惯统计
      const habitStats = await this.calculateHabitStats(checkIns)

      // 星星趋势
      const pointsTrend = await this.calculatePointsTrend(currentChildId, currentPeriod)

      // 热力图数据
      const heatmapData = await this.generateHeatmap(currentChildId)

      this.setData({
        stats: {
          checkInCount: checkIns.length,
          totalPoints,
          totalCoins,
          maxStreak
        },
        habitStats,
        pointsTrend,
        heatmapData,
        loading: false
      })
    } catch (err) {
      console.error('加载统计数据失败:', err)
      this.setData({ loading: false })
    }
  },

  // 计算最长连续天数
  async calculateMaxStreak(childId) {
    const db = wx.cloud.database()

    const res = await db.collection('check_ins')
      .where({
        childId: childId
      })
      .orderBy('date', 'asc')
      .get()

    if (res.data.length === 0) return 0

    // 去重日期
    const dates = [...new Set(res.data.map(item => item.date))]
    let maxStreak = 1
    let currentStreak = 1

    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i - 1])
      const currDate = new Date(dates[i])
      const diffTime = currDate.getTime() - prevDate.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays === 1) {
        currentStreak++
        maxStreak = Math.max(maxStreak, currentStreak)
      } else {
        currentStreak = 1
      }
    }

    return maxStreak
  },

  // 计算习惯统计
  async calculateHabitStats(checkIns) {
    const db = wx.cloud.database()

    // 统计每个习惯的打卡次数
    const habitCountMap = {}
    checkIns.forEach(item => {
      const habitId = item.habitId
      habitCountMap[habitId] = (habitCountMap[habitId] || 0) + 1
    })

    // 获取习惯信息
    const habitIds = Object.keys(habitCountMap)
    if (habitIds.length === 0) return []

    const habitRes = await db.collection('habits')
      .where({
        _id: db.command.in(habitIds)
      })
      .get()

    const habitMap = {}
    habitRes.data.forEach(habit => {
      habitMap[habit._id] = habit
    })

    // 组装数据
    const totalCheckIns = checkIns.length
    const habitStats = Object.entries(habitCountMap)
      .map(([habitId, count]) => {
        const habit = habitMap[habitId]
        return {
          _id: habitId,
          name: habit ? habit.name : '未知习惯',
          icon: habit ? habit.icon : '📝',
          color: habit ? habit.categoryColor : '#FF6B6B',
          count: count,
          percent: totalCheckIns > 0 ? Math.round((count / totalCheckIns) * 100) : 0
        }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5) // 只显示前5个

    return habitStats
  },

  // 计算星星趋势
  async calculatePointsTrend(childId, period) {
    const db = wx.cloud.database()
    const trend = []
    const now = new Date()

    let days = 7
    let startDate = new Date()

    if (period === 'today') {
      days = 24
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (period === 'week') {
      days = 7
      startDate = new Date(now)
      startDate.setDate(now.getDate() - 6)
    } else {
      days = 30
      startDate = new Date(now)
      startDate.setDate(now.getDate() - 29)
    }

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)

      let dayStart, dayEnd, label

      if (period === 'today') {
        dayStart = new Date(date)
        dayStart.setHours(i, 0, 0, 0)
        dayEnd = new Date(date)
        dayEnd.setHours(i + 1, 0, 0, 0)
        label = `${i}时`
      } else {
        dayStart = new Date(date)
        dayStart.setHours(0, 0, 0, 0)
        dayEnd = new Date(date)
        dayEnd.setHours(23, 59, 59, 999)
        label = `${date.getMonth() + 1}/${date.getDate()}`
      }

      const res = await db.collection('check_ins')
        .where({
          childId: childId,
          createTime: db.command.gte(dayStart).and(db.command.lte(dayEnd))
        })
        .get()

      const points = res.data.reduce((sum, item) => sum + (item.points || 0), 0)

      trend.push({
        date: dayStart.toISOString().split('T')[0],
        label: label,
        points: points,
        percent: 0
      })
    }

    // 计算百分比
    const maxPoints = Math.max(...trend.map(t => t.points))
    if (maxPoints > 0) {
      trend.forEach(item => {
        item.percent = Math.round((item.points / maxPoints) * 100)
      })
    }

    return trend
  },

  // 生成热力图数据
  async generateHeatmap(childId) {
    const db = wx.cloud.database()
    const heatmapData = []
    const now = new Date()
    const endDate = new Date(now)
    endDate.setDate(now.getDate() - 1) // 昨天
    const startDate = new Date(endDate)
    startDate.setDate(endDate.getDate() - 6 * 7) // 6周前

    // 查询打卡记录
    const checkInRes = await db.collection('check_ins')
      .where({
        childId: childId,
        createTime: db.command.gte(startDate).and(db.command.lte(endDate))
      })
      .get()

    // 统计每天打卡次数
    const checkInCountMap = {}
    checkInRes.data.forEach(item => {
      const date = item.date
      checkInCountMap[date] = (checkInCountMap[date] || 0) + 1
    })

    // 生成7周的数据（42天）
    for (let week = 0; week < 7; week++) {
      for (let day = 0; day < 7; day++) {
        const date = new Date(startDate)
        date.setDate(startDate.getDate() + week * 7 + day)
        const dateStr = date.toISOString().split('T')[0]
        const count = checkInCountMap[dateStr] || 0

        let level = 0
        if (count >= 5) level = 3
        else if (count >= 3) level = 2
        else if (count >= 1) level = 1

        heatmapData.push({
          date: dateStr,
          count: count,
          level: level
        })
      }
    }

    return heatmapData
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadStatistics()
    setTimeout(() => {
      wx.stopPullDownRefresh()
    }, 1000)
  },

  // 分享给好友
  onShareAppMessage() {
    const childName = this.data.children[this.data.currentChildIndex]?.name || '';
    return {
      title: childName ? `查看${childName}的习惯养成统计` : '攒星星 - 习惯养成统计',
      path: '/pages/statistics/statistics',
      imageUrl: '/images/share-cover.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    const childName = this.data.children[this.data.currentChildIndex]?.name || '';
    return {
      title: childName ? `${childName}的习惯养成统计` : '攒星星 - 习惯养成统计',
      query: '',
      imageUrl: '/images/share-cover.png'
    };
  }
})
