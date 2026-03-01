const app = getApp()

Page({
  data: {
    exchangeList: [],
    groupedHistory: [],
    currentTimePeriod: 'all', // all, week, month
    loading: true,
    currentChildId: '',
    children: [],
    currentChildIndex: 0
  },

  onLoad(options) {
    if (options.childId) {
      this.setData({ currentChildId: options.childId })
    }
    this.loadChildren()
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
          if (res.data.length > 0) {
            if (!this.data.currentChildId) {
              this.setData({
                children: res.data,
                currentChildIndex: 0,
                currentChildId: res.data[0]._id
              })
            } else {
              const index = res.data.findIndex(c => c._id === this.data.currentChildId)
              this.setData({
                children: res.data,
                currentChildIndex: index >= 0 ? index : 0
              })
            }
            this.loadExchangeHistory()
          }
        }
      })
  },

  // 切换时间周期
  switchTimePeriod(e) {
    const period = e.currentTarget.dataset.period
    this.setData({ currentTimePeriod: period })
    this.loadExchangeHistory()
  },

  // 加载兑换记录
  async loadExchangeHistory() {
    if (!this.data.currentChildId) {
      this.setData({ loading: false })
      return
    }

    this.setData({ loading: true })

    const { currentChildId, currentTimePeriod } = this.data
    const db = wx.cloud.database()

    // 计算日期范围
    const now = new Date()
    let startDate = new Date()

    switch (currentTimePeriod) {
      case 'week':
        startDate = new Date(now)
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate = new Date(now)
        startDate.setDate(now.getDate() - 30)
        break
      case 'all':
      default:
        startDate = new Date(0) // 不限
        break
    }

    try {
      const res = await db.collection('reward_exchanges')
        .where({
          childId: currentChildId,
          createTime: db.command.gte(startDate)
        })
        .orderBy('createTime', 'desc')
        .get()

      // 获取礼物信息
      const rewardIds = [...new Set(res.data.map(item => item.rewardId))]
      let rewardMap = {}

      if (rewardIds.length > 0) {
        const rewardRes = await db.collection('rewards')
          .where({
            _id: db.command.in(rewardIds)
          })
          .get()

        rewardMap = rewardRes.data.reduce((map, reward) => {
          map[reward._id] = reward
          return map
        }, {})
      }

      // 组装数据
      const exchangeList = res.data.map(item => {
        const reward = rewardMap[item.rewardId] || {}
        const createTime = new Date(item.createTime)

        return {
          ...item,
          rewardName: reward.name || '未知礼物',
          rewardIcon: reward.icon || '🎁',
          date: this.formatDate(createTime),
          time: `${String(createTime.getHours()).padStart(2, '0')}:${String(createTime.getMinutes()).padStart(2, '0')}`,
          statusText: item.status === 'completed' ? '已完成' : '进行中'
        }
      })

      // 按日期分组
      const groupedHistory = this.groupByDate(exchangeList)

      this.setData({
        exchangeList,
        groupedHistory,
        loading: false
      })
    } catch (err) {
      console.error('加载兑换记录失败:', err)
      this.setData({ loading: false })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 按日期分组
  groupByDate(list) {
    const map = {}

    list.forEach(item => {
      if (!map[item.date]) {
        map[item.date] = {
          date: item.date,
          records: []
        }
      }
      map[item.date].records.push(item)
    })

    return Object.values(map)
  },

  // 格式化日期
  formatDate(date) {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    const dateStr = date.toISOString().split('T')[0]

    if (dateStr === today) {
      return '今天'
    } else if (dateStr === yesterdayStr) {
      return '昨天'
    } else {
      return `${date.getMonth() + 1}月${date.getDate()}日`
    }
  },

  // 长按记录
  onLongPressRecord(e) {
    const exchangeId = e.currentTarget.dataset.id
    const exchange = this.data.exchangeList.find(item => item._id === exchangeId)

    if (!exchange) return

    const items = ['标记为已完成', '删除记录']

    wx.showActionSheet({
      itemList: items,
      success: res => {
        if (res.tapIndex === 0) {
          this.markAsCompleted(exchangeId)
        } else if (res.tapIndex === 1) {
          this.deleteExchange(exchangeId)
        }
      }
    })
  },

  // 标记为已完成
  async markAsCompleted(exchangeId) {
    try {
      wx.showLoading({ title: '更新中...' })

      const db = wx.cloud.database()
      await db.collection('reward_exchanges').doc(exchangeId).update({
        data: {
          status: 'completed'
        }
      })

      wx.hideLoading()
      wx.showToast({
        title: '标记成功',
        icon: 'success'
      })

      this.loadExchangeHistory()
    } catch (err) {
      wx.hideLoading()
      console.error('标记失败:', err)
      wx.showToast({
        title: '标记失败',
        icon: 'none'
      })
    }
  },

  // 删除兑换记录
  deleteExchange(exchangeId) {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条兑换记录吗？',
      confirmText: '删除',
      confirmColor: '#FF6B6B',
      success: async res => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' })

            const db = wx.cloud.database()
            await db.collection('reward_exchanges').doc(exchangeId).remove()

            wx.hideLoading()
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            })

            this.loadExchangeHistory()
          } catch (err) {
            wx.hideLoading()
            console.error('删除失败:', err)
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadExchangeHistory()
    setTimeout(() => {
      wx.stopPullDownRefresh()
    }, 1000)
  }
})
