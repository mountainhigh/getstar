const app = getApp()
const { getStorage } = require('../../utils/storage')
const { debug, info, warn, error } = require('../../utils/logger');

Page({
  data: {
    currentTab: 'week', // week, month, total
    leaderboard: [],
    loading: true,
    familyId: '',
    currentChildId: '',
  },

  onLoad(options) {
    this.setData({
      familyId: app.globalData.familyId,
      currentChildId: options.childId || getStorage('currentChildId') || '',
    })
    this.loadLeaderboard()
  },

  onShow() {
    // 从 storage 读取最新的 currentChildId
    const storageChildId = getStorage('currentChildId')
    if (storageChildId && storageChildId !== this.data.currentChildId) {
      console.log('排行榜页面检测到孩子切换:', storageChildId)
      this.setData({ currentChildId: storageChildId })
      app.globalData.currentChildId = storageChildId
    }
    // 每次显示页面刷新数据
    this.loadLeaderboard()
  },

  // 切换标签
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })
    this.loadLeaderboard()
  },

  // 加载排行榜数据
  loadLeaderboard() {
    if (!this.data.familyId) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    this.setData({ loading: true })

    wx.cloud.callFunction({
      name: 'getLeaderboard',
      data: {
        familyId: this.data.familyId,
        period: this.data.currentTab,
      },
      success: res => {
        console.log('排行榜数据:', res.result)
        if (res.result.success) {
          this.setData({
            leaderboard: res.result.data,
            loading: false
          })
        } else {
          wx.showToast({
            title: res.result.message || '加载失败',
            icon: 'none'
          })
          this.setData({ loading: false })
        }
      },
      fail: err => {
        console.error('加载排行榜失败:', err)
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
        this.setData({ loading: false })
      }
    })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadLeaderboard()
    setTimeout(() => {
      wx.stopPullDownRefresh()
    }, 1000)
  },

  // 点击排行榜项，跳转到孩子详情
  onChildTap(e) {
    const childId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/check-in-detail/check-in-detail?childId=${childId}`
    })
  },

  // 分享排行榜
  onShareAppMessage() {
    return {
      title: '查看我们的星星排行榜',
      path: '/pages/leaderboard/leaderboard',
      imageUrl: '/images/share-cover.png'
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '攒星星 星星排行榜',
      query: '',
      imageUrl: '/images/share-cover.png'
    };
  }
})
