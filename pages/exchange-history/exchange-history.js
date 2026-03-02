const app = getApp()
const { getStorage, setStorage } = require('../../utils/storage')

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

  async onLoad(options) {
    console.log('=== 兑换历史页面 onLoad 开始 ===')
    console.log('options:', options)
    console.log('storage 中的 currentChildId:', getStorage('currentChildId'))
    
    if (options.childId) {
      console.log('从 options 获取 childId:', options.childId)
      this.setData({ currentChildId: options.childId })
    }
    this.loadChildren()
    console.log('=== 兑换历史页面 onLoad 结束 ===')
  },

  onShow() {
    console.log('=== 兑换历史页面 onShow ===')
    console.log('当前 currentChildId:', this.data.currentChildId)
    
    // 从 storage 读取最新的 currentChildId
    const storageChildId = getStorage('currentChildId')
    console.log('storage 中的 currentChildId:', storageChildId)
    
    if (storageChildId && storageChildId !== this.data.currentChildId) {
      console.log('兑换历史页面检测到孩子切换:', storageChildId)
      this.setData({ currentChildId: storageChildId })
      // 同步到 app.globalData
      app.globalData.currentChildId = storageChildId
      this.loadExchangeHistory()
    }
  },

  // 加载孩子列表
  loadChildren() {
    console.log('=== loadChildren 开始 ===')
    const db = wx.cloud.database()
    console.log('familyId:', app.globalData.familyId)

    db.collection('children')
      .where({
        familyId: app.globalData.familyId,
        isDeleted: false
      })
      .orderBy('createTime', 'asc')
      .get({
        success: res => {
          console.log('孩子列表查询成功:', res.data.length, '条记录')
          console.log('孩子数据:', res.data)
          
          if (res.data.length > 0) {
            if (!this.data.currentChildId) {
              console.log('当前没有 childId，使用第一个孩子')
              this.setData({
                children: res.data,
                currentChildIndex: 0,
                currentChildId: res.data[0]._id
              })
              setStorage('currentChildId', res.data[0]._id)
              app.globalData.currentChildId = res.data[0]._id
            } else {
              console.log('当前已有 childId:', this.data.currentChildId)
              const index = res.data.findIndex(c => c._id === this.data.currentChildId)
              this.setData({
                children: res.data,
                currentChildIndex: index >= 0 ? index : 0
              })
            }
            this.loadExchangeHistory()
          } else {
            console.log('没有找到孩子数据')
          }
        },
        fail: err => {
          console.error('加载孩子列表失败:', err)
        }
      })
    console.log('=== loadChildren 结束 ===')
  },

  // 切换时间周期
  switchTimePeriod(e) {
    const period = e.currentTarget.dataset.period
    this.setData({ currentTimePeriod: period })
    this.loadExchangeHistory()
  },

  // 加载兑换记录
  async loadExchangeHistory() {
    console.log('=== loadExchangeHistory 开始 ===')
    console.log('currentChildId:', this.data.currentChildId)
    console.log('currentTimePeriod:', this.data.currentTimePeriod)
    
    if (!this.data.currentChildId) {
      console.warn('currentChildId 为空，无法加载兑换记录')
      this.setData({ loading: false })
      return
    }

    this.setData({ loading: true })

    try {
      console.log('调用云函数 getExchangeHistory')
      const res = await wx.cloud.callFunction({
        name: 'getExchangeHistory',
        data: {
          childId: this.data.currentChildId,
          timePeriod: this.data.currentTimePeriod
        }
      })
      
      console.log('云函数返回结果:', res)

      if (!res.result.success) {
        console.error('查询失败:', res.result.error)
        this.setData({ loading: false })
        wx.showToast({
          title: res.result.error || '加载失败',
          icon: 'none'
        })
        return
      }

      const exchangeList = res.result.data || []
      console.log('兑换记录:', exchangeList)

      // 按日期分组
      const groupedHistory = this.groupByDate(exchangeList)
      console.log('分组后的 groupedHistory:', groupedHistory)

      this.setData({
        exchangeList,
        groupedHistory,
        loading: false
      })
      console.log('=== loadExchangeHistory 结束 ===')
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
