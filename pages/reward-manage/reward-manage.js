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
      cost: '',
      categoryIndex: 0,
      icon: '🎁'
    },
    categories: ['美食', '娱乐', '活动', '学习', '玩具'],
    icons: ['🎁', '🍦', '🎮', '📺', '🎡', '📚', '🎨', '🚗', '🎢', '🚲']
  },

  onLoad() {
    this.loadRewards()
  },

  // 加载礼物列表
  async loadRewards() {
    this.setData({ loading: true })

    try {
      const db = wx.cloud.database()
      const res = await db.collection('rewards').get()

      this.setData({
        rewards: res.data,
        loading: false
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
      form: {
        name: '',
        cost: '',
        categoryIndex: 0,
        icon: '🎁'
      }
    })
  },

  // 打开编辑礼物弹窗
  editReward(e) {
    const rewardId = e.currentTarget.dataset.id
    const reward = this.data.rewards.find(r => r._id === rewardId)

    if (reward) {
      const categoryIndex = this.data.categories.indexOf(reward.category)

      this.setData({
        showModal: true,
        isEdit: true,
        currentRewardId: rewardId,
        form: {
          name: reward.name,
          cost: reward.cost,
          categoryIndex: categoryIndex >= 0 ? categoryIndex : 0,
          icon: reward.icon
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

  // 选择分类
  onCategoryChange(e) {
    this.setData({
      'form.categoryIndex': e.detail.value
    })
  },

  // 选择图标
  selectIcon(e) {
    const icon = e.currentTarget.dataset.icon
    this.setData({
      'form.icon': icon
    })
  },

  // 保存礼物
  async saveReward() {
    const { name, cost, categoryIndex, icon } = this.data.form

    // 表单验证
    if (!name || !name.trim()) {
      wx.showToast({
        title: '请输入礼物名称',
        icon: 'none'
      })
      return
    }

    if (!cost || cost <= 0) {
      wx.showToast({
        title: '请输入有效的金币数量',
        icon: 'none'
      })
      return
    }

    const category = this.data.categories[categoryIndex]

    try {
      wx.showLoading({ title: '保存中...' })

      const db = wx.cloud.database()

      if (this.data.isEdit) {
        // 编辑礼物
        await db.collection('rewards').doc(this.data.currentRewardId).update({
          data: {
            name: name.trim(),
            cost: parseInt(cost),
            category: category,
            icon: icon
          }
        })
      } else {
        // 添加礼物
        await db.collection('rewards').add({
          data: {
            name: name.trim(),
            cost: parseInt(cost),
            category: category,
            icon: icon,
            stock: 999, // 默认库存
            createTime: new Date()
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

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个礼物吗？',
      confirmText: '删除',
      confirmColor: '#FF6B6B',
      success: async res => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' })

            const db = wx.cloud.database()
            await db.collection('rewards').doc(rewardId).remove()

            wx.hideLoading()
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            })

            this.loadRewards()
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
  }
})
