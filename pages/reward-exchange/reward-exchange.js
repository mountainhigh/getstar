const app = getApp()
const { getStorage, setStorage } = require('../../utils/storage')

Page({
  data: {
    children: [],
    selectedChild: null,
    currentChildIndex: 0,
    rewards: [],
    filteredRewards: [],
    currentCategory: 'all',
    categories: [
      { id: 'all', name: '全部', icon: '✨', color: '#f0f0f0', activeColor: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)' },
      { id: '美食', name: '美食', icon: '🍔', color: '#FFF3E0', activeColor: 'linear-gradient(135deg, #FF9800 0%, #FF5722 100%)' },
      { id: '娱乐', name: '娱乐', icon: '🎮', color: '#E3F2FD', activeColor: 'linear-gradient(135deg, #2196F3 0%, #03A9F4 100%)' },
      { id: '活动', name: '活动', icon: '🎨', color: '#F3E5F5', activeColor: 'linear-gradient(135deg, #9C27B0 0%, #E91E63 100%)' },
      { id: '学习', name: '学习', icon: '📚', color: '#E8F5E9', activeColor: 'linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%)' },
      { id: '玩具', name: '玩具', icon: '🧸', color: '#FFF8E1', activeColor: 'linear-gradient(135deg, #FFC107 0%, #FF9800 100%)' }
    ],
    loading: true,
    showConfirm: false,
    selectedReward: null,
    showChildModal: false
  },

  async onLoad(options) {
    // 等待初始化完成然后加载数据
    await this.waitForInit()
    await this.loadData()
  },

  // 等待应用初始化完成
  async waitForInit() {
    const app = getApp()
    
    // 如果已经初始化完成，直接返回
    if (app.globalData.isInitialized) {
      return
    }
    
    // 等待初始化完成，最多等待5秒
    let waitCount = 0
    while (!app.globalData.isInitialized && waitCount < 50) {
      await new Promise(resolve => setTimeout(resolve, 100))
      waitCount++
    }
  },

  // 加载所有数据
  async loadData() {
    const app = getApp()
    
    if (!app.globalData.familyId) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    
    // 从缓存或全局获取当前孩子ID
    const storageChildId = getStorage('currentChildId')
    const globalChildId = app.globalData.currentChildId
    const currentChildId = storageChildId || globalChildId
    
    if (currentChildId) {
      this.setData({ currentChildId: currentChildId })
    }
    
    // 先加载孩子列表，再加载礼物
    await this.loadChildren()
    this.loadRewards()
  },

  async onShow() {
    const app = getApp()
    
    // 如果已经初始化并且有 familyId，刷新数据
    if (app.globalData.isInitialized && app.globalData.familyId) {
      // 从 storage 读取最新的 currentChildId
      const storageChildId = getStorage('currentChildId')
      const globalChildId = app.globalData.currentChildId
      const targetChildId = storageChildId || globalChildId
      
      if (targetChildId && this.data.children.length > 0) {
        const child = this.data.children.find(c => c._id === targetChildId)
        if (child) {
          const index = this.data.children.findIndex(c => c._id === targetChildId)
          this.setData({
            selectedChild: child,
            currentChildIndex: index >= 0 ? index : 0
          })
        }
      }
      
      // 刷新礼物列表和孩子列表
      this.loadRewards()
      await this.loadChildren()
    }
  },

  // 加载孩子列表
  loadChildren() {
    return new Promise((resolve, reject) => {
      const db = wx.cloud.database()
      const app = getApp()
      
      // 确保有 familyId
      const familyId = app.globalData.familyId
      
      if (!familyId) {
        this.setData({
          children: [],
          selectedChild: null,
          loading: false
        })
        resolve()
        return
      }

      db.collection('children')
        .where({
          familyId: familyId,
          isDeleted: false
        })
        .orderBy('createTime', 'asc')
        .get({
          success: res => {
            if (res.data.length > 0) {
              const storageChildId = getStorage('currentChildId')
              const globalChildId = app.globalData.currentChildId
              const targetChildId = storageChildId || globalChildId
              
              let selectedChild = res.data[0]
              let currentIndex = 0

              if (targetChildId) {
                const found = res.data.find(c => c._id === targetChildId)
                if (found) {
                  selectedChild = found
                  currentIndex = res.data.indexOf(found)
                }
              }

              this.setData({
                children: res.data,
                selectedChild: selectedChild,
                currentChildIndex: currentIndex
              })
            } else {
              this.setData({
                children: [],
                selectedChild: null,
                currentChildIndex: 0
              })
            }
            resolve()
          },
          fail: err => {
            console.error('加载孩子列表失败:', err)
            wx.showToast({
              title: '加载失败',
              icon: 'none'
            })
            reject(err)
          }
        })
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
        if (res.result && res.result.success) {
          // 兼容多种数据格式
          let rewards = []
          const data = res.result.data
          
          if (Array.isArray(data)) {
            rewards = data
          } else if (data && typeof data === 'object') {
            // 可能是 {rewards: [...]} 格式
            if (Array.isArray(data.rewards)) {
              rewards = data.rewards
            } else if (Array.isArray(data.list)) {
              rewards = data.list
            }
          }
          
          this.setData({
            rewards: rewards,
            filteredRewards: this.filterRewards(rewards, this.data.currentCategory),
            loading: false
          })
        } else {
          const msg = res.result ? (res.result.message || '加载失败') : '加载失败'
          wx.showToast({
            title: msg,
            icon: 'none'
          })
          this.setData({ loading: false })
        }
      },
      fail: err => {
        console.error('加载礼物失败:', err)
        wx.showToast({
          title: '加载失败，请检查网络',
          icon: 'none'
        })
        this.setData({ loading: false })
      }
    })
  },

  // 筛选礼物
  filterRewards(rewards, category) {
    // 确保 rewards 是数组
    if (!Array.isArray(rewards)) {
      return []
    }
    if (category === 'all') {
      return rewards
    }
    return rewards.filter(r => r.category === category)
  },

  // 切换分类
  switchCategory(e) {
    const categoryId = e.currentTarget.dataset.id

    console.log('=== 切换分类 ===')
    console.log('选择的分类ID:', categoryId)
    console.log('当前所有rewards:', this.data.rewards)

    if (!categoryId) {
      return
    }

    const filtered = this.filterRewards(this.data.rewards, categoryId)
    console.log('筛选后的rewards:', filtered)
    console.log('筛选后的数量:', filtered.length)

    this.setData({
      currentCategory: categoryId,
      filteredRewards: filtered
    })
  },

  // 显示孩子选择器
  showChildPicker() {
    if (this.data.children.length === 0) {
      wx.showToast({
        title: '请先添加孩子',
        icon: 'none'
      })
      return
    }
    this.setData({ showChildModal: true })
  },

  // 隐藏孩子选择器
  hideChildPicker() {
    this.setData({ showChildModal: false })
  },

  // 选择孩子
  selectChild(e) {
    const index = e.currentTarget.dataset.index
    const child = this.data.children[index]
    this.setData({
      selectedChild: child,
      currentChildIndex: index,
      showChildModal: false
    })
    setStorage('currentChildId', child._id)
    app.globalData.currentChildId = child._id
  },

  // 点击礼物
  onRewardTap(e) {
    if (!this.data.selectedChild) {
      wx.showToast({
        title: '请先选择孩子',
        icon: 'none'
      })
      return
    }

    const reward = e.currentTarget.dataset.reward
    const child = this.data.selectedChild
    const cost = reward.cost || reward.coinCost || reward.coinsRequired || 0

    // 检查金币是否足够
    if (child.coins < cost) {
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
    const { selectedReward, selectedChild } = this.data

    if (!selectedReward || !selectedChild) {
      return
    }

    wx.showLoading({ title: '兑换中...' })

    wx.cloud.callFunction({
      name: 'exchangeReward',
      data: {
        childId: selectedChild._id,
        rewardId: selectedReward._id
      },
      success: res => {
        wx.hideLoading()

        if (res.result.success) {
          wx.showToast({
            title: '兑换成功！',
            icon: 'success',
            duration: 2000
          })

          // 刷新孩子数据
          this.loadChildren()

          // 刷新礼物列表
          this.loadRewards()

          // 关闭确认弹窗
          this.setData({ showConfirm: false, selectedReward: null })
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
    this.setData({ 
      showConfirm: false,
      selectedReward: null
    })
  },

  // 跳转到礼物管理
  goToManage() {
    wx.navigateTo({
      url: '/pages/reward-manage/reward-manage'
    })
  },

  // 跳转到兑换历史
  goToHistory() {
    wx.navigateTo({
      url: '/pages/exchange-history/exchange-history'
    })
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
