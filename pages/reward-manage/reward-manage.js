const app = getApp()

Page({
  data: {
    rewards: [],
    loading: true,
    showModal: false,
    isEdit: false,
    currentRewardId: '',
    form: {
      name: '',
      cost: '50',
      category: '美食',
      icon: '★',
      color: '#FF6B6B',
      description: ''
    },
    categories: ['美食', '娱乐', '活动', '学习', '玩具', '其他'],
    icons: ['🍰', '🍦', '🧸', '🪙', '🎮', '🎬', '🎡', '🌟', '🎁', '🎀', '🎈', '🎪', '🎠', '🎨', '🎭', '🎯', '🎲', '🎳', '🎵', '🎼'],
    colors: ['#FF6B6B', '#FF8E53', '#4ECDC4', '#44A8B0', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F']
  },

  onLoad() {
    debug('=== 礼物管理页面 onLoad ===')
    debug('familyId:', app.globalData.familyId)
    this.loadRewards()
  },

  onShow() {
    debug('=== 礼物管理页面 onShow ===')
    this.loadRewards()
  },

  // 加载礼物列表
  async loadRewards() {
    debug('=== loadRewards 开始 ===')
    this.setData({ loading: true })
    
    const familyId = app.globalData.familyId
    
    if (!familyId) {
      wx.showToast({
        title: '请先选择家庭',
        icon: 'none'
      })
      this.setData({ loading: false })
      return
    }

    try {
      const db = wx.cloud.database()

      // 调用云函数，传递familyId
      wx.cloud.callFunction({
        name: 'getRewardList',
        data: {
          familyId: familyId
        },
        success: res => {
          if (res.result && res.result.success) {
            debug('礼物列表查询成功:', res.result.data.length, '条记录')
            debug('礼物数据:', res.result.data)

            this.setData({
              rewards: res.result.data,
              loading: false
            })
          } else {
            console.error('获取礼物列表失败:', res.result)
            this.setData({ loading: false })
            wx.showToast({
              title: res.result?.message || '加载失败',
              icon: 'none'
            })
          }
        },
        fail: err => {
          console.error('调用云函数失败:', err)
          this.setData({ loading: false })
          wx.showToast({
            title: '加载失败',
            icon: 'none'
          })
        }
      })
    } catch (err) {
      console.error('加载礼物列表失败:', err)
      this.setData({ loading: false })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 打开添加礼物弹窗
  addReward() {
    this.setData({
      showModal: true,
      isEdit: false,
      currentRewardId: '',
      form: {
        name: '',
        cost: '50',
        category: '美食',
        icon: '★',
        color: '#FF6B6B',
        description: ''
      }
    })
  },

  // 打开编辑礼物弹窗
  editReward(e) {
    const rewardId = e.currentTarget.dataset.id
    const reward = this.data.rewards.find(r => r._id === rewardId)

    if (reward) {
      this.setData({
        showModal: true,
        isEdit: true,
        currentRewardId: rewardId,
        form: {
          name: reward.name || '',
          cost: String(reward.cost || reward.coinCost || reward.coinsRequired || '50'),
          category: reward.category || '美食',
          icon: reward.icon || '★',
          color: reward.color || '#FF6B6B',
          description: reward.description || ''
        }
      })
    }
  },

  // 关闭弹窗
  closeModal() {
    this.setData({
      showModal: false
    })
  },

  // 表单输入
  onInputChange(e) {
    const field = e.currentTarget.dataset.field
    this.setData({
      [`form.${field}`]: e.detail.value
    })
  },

  // 金币输入
  onCostInput(e) {
    let value = e.detail.value
    // 只允许数字
    value = value.replace(/[^0-9]/g, '')
    // 限制最大值
    const numValue = parseInt(value) || 0
    if (numValue > 99999) {
      value = '99999'
    }
    this.setData({
      'form.cost': value
    })
  },

  // 调整金币
  adjustCost(e) {
    const delta = parseInt(e.currentTarget.dataset.delta)
    let currentCost = parseInt(this.data.form.cost) || 0
    currentCost += delta
    if (currentCost < 0) currentCost = 0
    if (currentCost > 99999) currentCost = 99999
    this.setData({
      'form.cost': String(currentCost)
    })
  },

  // 选择分类
  selectCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({
      'form.category': category
    })
  },

  // 选择图标
  selectIcon(e) {
    const icon = e.currentTarget.dataset.icon
    this.setData({
      'form.icon': icon
    })
  },

  // 选择颜色
  selectColor(e) {
    const color = e.currentTarget.dataset.color
    this.setData({
      'form.color': color
    })
  },

  // 保存礼物
  async saveReward() {
    const { name, cost, category, icon, color, description } = this.data.form

    // 表单验证
    if (!name || !name.trim()) {
      wx.showToast({
        title: '请输入礼物名称',
        icon: 'none'
      })
      return
    }

    const costValue = parseInt(cost) || 0
    if (costValue <= 0) {
      wx.showToast({
        title: '金币数量必须大于0',
        icon: 'none'
      })
      return
    }

    try {
      wx.showLoading({ title: '保存中...' })

      const rewardData = {
        name: name.trim(),
        cost: costValue,
        category: category,
        icon: icon,
        color: color,
        description: description.trim()
      }

      const app = getApp(); // 获取 app 实例
      const familyId = app.globalData.familyId; // 获取 familyId

      if (this.data.isEdit) {
        // 编辑礼物
        await wx.cloud.callFunction({
          name: 'saveReward',
          data: {
            rewardId: this.data.currentRewardId,
            rewardData: rewardData,
            isEdit: true,
            familyId: familyId // 传递 familyId
          }
        })
      } else {
        // 添加礼物
        await wx.cloud.callFunction({
          name: 'saveReward',
          data: {
            rewardData: rewardData,
            isEdit: false,
            familyId: familyId // 传递 familyId
          }
        })
      }

      wx.hideLoading()
      wx.showToast({
        title: this.data.isEdit ? '修改成功' : '添加成功',
        icon: 'success'
      })

      this.closeModal()
      this.loadRewards()
    } catch (err) {
      wx.hideLoading()
      console.error('保存礼物失败:', err)
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    }
  },

  // 删除礼物
  deleteReward(e) {
    const rewardId = e.currentTarget.dataset.id
    const reward = this.data.rewards.find(r => r._id === rewardId)

    wx.showModal({
      title: '确认删除',
      content: `确定要删除礼物"${reward ? reward.name : ''}"吗？`,
      confirmText: '删除',
      confirmColor: '#FF6B6B',
      success: async res => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' })

            // 使用云函数删除礼物
            const familyId = app.globalData.familyId
            const deleteRes = await wx.cloud.callFunction({
              name: 'deleteReward',
              data: {
                rewardId: rewardId,
                familyId: familyId
              }
            })

            wx.hideLoading()

            if (deleteRes.result && deleteRes.result.success) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              })
              this.loadRewards()
            } else {
              wx.showToast({
                title: deleteRes.result.error || '删除失败',
                icon: 'none'
              })
            }
          } catch (err) {
            wx.hideLoading()
            console.error('删除礼物失败:', err)
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 分享给好友
  onShareAppMessage() {
    return {
      title: '攒星星 - 管理礼物奖励',
      path: '/pages/reward-manage/reward-manage',
      imageUrl: '/images/share-cover.png'
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '攒星星 - 管理礼物奖励',
      query: '',
      imageUrl: '/images/share-cover.png'
    }
  }
})
