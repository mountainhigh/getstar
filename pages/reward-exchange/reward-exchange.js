const app = getApp()
const { getStorage, setStorage } = require('../../utils/storage')

Page({
  data: {
    children: [],
    currentChildId: '',
    currentChildIndex: 0,
    rewards: [],
    filteredRewards: [],
    currentCategory: 'all',
    categories: [
      { id: 'all', name: '全部' },
      { id: 'food', name: '美食' },
      { id: 'entertainment', name: '娱乐' },
      { id: 'activity', name: '活动' },
      { id: 'learning', name: '学习' },
      { id: 'toy', name: '玩具' }
    ],
    loading: true,
    showConfirm: false,
    selectedReward: null,
  },

  onLoad(options) {
    if (options.childId) {
      this.setData({ currentChildId: options.childId })
    }
    this.loadChildren()
    this.loadRewards()
  },

  onShow() {
    // 从 storage 读取最新的 currentChildId
    const storageChildId = getStorage('currentChildId')
    if (storageChildId && storageChildId !== this.data.currentChildId) {
      console.log('奖励页面检测到孩子切换:', storageChildId)
      this.setData({ currentChildId: storageChildId })
      // 同步到 app.globalData
      app.globalData.currentChildId = storageChildId
    }
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
            // 如果没有指定孩子ID，默认选择第一个
            if (!this.data.currentChildId) {
              this.setData({
                children: res.data,
                currentChildIndex: 0,
                currentChildId: res.data[0]._id
              })
              setStorage('currentChildId', res.data[0]._id)
              app.globalData.currentChildId = res.data[0]._id
            } else {
              // 找到指定孩子的索引
              const index = res.data.findIndex(c => c._id === this.data.currentChildId)
              this.setData({
                children: res.data,
                currentChildIndex: index >= 0 ? index : 0
              })
            }
          }
        },
        fail: err => {
          console.error('加载孩子列表失败:', err)
        }
      })
  },

  // 切换孩子
  switchChild(e) {
    const index = e.detail.value
    this.setData({
      currentChildIndex: index,
      currentChildId: this.data.children[index]._id
    })
  },

  // 加载礼物列表
  loadRewards() {
    this.setData({ loading: true })

    wx.cloud.callFunction({
      name: 'getRewardList',
      data: {
        category: this.data.currentCategory === 'all' ? '' : this.data.currentCategory
      },
      success: res => {
        console.log('礼物列表:', res.result)
        if (res.result.success) {
          this.setData({
            rewards: res.result.data,
            filteredRewards: res.result.data,
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
        console.error('加载礼物失败:', err)
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
        this.setData({ loading: false })
      }
    })
  },

  // 切换分类
  switchCategory(e) {
    const categoryId = e.currentTarget.dataset.id
    this.setData({ currentCategory: categoryId })

    // 筛选礼物
    if (categoryId === 'all') {
      this.setData({ filteredRewards: this.data.rewards })
    } else {
      const filtered = this.data.rewards.filter(r => r.category === categoryId)
      this.setData({ filteredRewards: filtered })
    }
  },

  // 点击兑换礼物
  onExchangeTap(e) {
    if (!this.data.currentChildId) {
      wx.showToast({
        title: '请先添加孩子',
        icon: 'none'
      })
      return
    }

    const reward = e.currentTarget.dataset.reward
    const child = this.data.children[this.data.currentChildIndex]

    // 检查金币是否足够
    if (child.coins < reward.cost) {
      wx.showToast({
        title: '金币不足',
        icon: 'none'
      })
      return
    }

    this.setData({
      selectedReward: reward,
      showConfirm: true
    })
  },

  // 确认兑换
  confirmExchange() {
    const { selectedReward, currentChildId } = this.data

    wx.showLoading({ title: '兑换中...' })

    wx.cloud.callFunction({
      name: 'exchangeReward',
      data: {
        childId: currentChildId,
        rewardId: selectedReward._id
      },
      success: res => {
        console.log('兑换结果:', res.result)
        wx.hideLoading()

        if (res.result.success) {
          wx.showToast({
            title: '兑换成功！',
            icon: 'success',
            duration: 2000
          })

          // 刷新孩子数据
          this.loadChildren()

          // 刷新礼物列表（更新库存）
          this.loadRewards()

          // 关闭确认弹窗
          this.setData({ showConfirm: false })
        } else {
          wx.showToast({
            title: res.result.message || '兑换失败',
            icon: 'none'
          })
        }
      },
      fail: err => {
        console.error('兑换失败:', err)
        wx.hideLoading()
        wx.showToast({
          title: '兑换失败',
          icon: 'none'
        })
      }
    })
  },

  // 取消兑换
  cancelExchange() {
    this.setData({ showConfirm: false })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadChildren()
    this.loadRewards()
    setTimeout(() => {
      wx.stopPullDownRefresh()
    }, 1000)
  },

  // 分享
  onShareAppMessage() {
    return {
      title: 'GetStar 礼物兑换中心',
      path: '/pages/reward-exchange/reward-exchange'
    }
  }
})
