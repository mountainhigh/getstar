const { showToast, showLoading, hideLoading } = require('../../utils/util');

Page({
  data: {
    habits: [],
    childId: '',
    showEditModal: false,
    editHabitId: '',
    editForm: {
      name: '',
      points: 0,
      isActive: true
    }
  },

  onLoad() {
    this.loadHabits();
  },

  onShow() {
    this.loadHabits();
  },

  /**
   * 加载习惯列表
   */
  async loadHabits() {
    try {
      // 检查登录状态
      const app = getApp();
      const userInfo = app.getUserInfo();

      if (!userInfo.isLoggedIn) {
        showToast('未登录，请先登录');
        return;
      }

      const childId = app.globalData.currentChildId;

      if (!childId) {
        showToast('请先选择孩子');
        return;
      }

      this.setData({ childId });
      showLoading('加载中...');

      const db = wx.cloud.database();
      const res = await db.collection('habits').where({
        childId
      }).orderBy('order', 'asc').get();

      this.setData({ habits: res.data });
      hideLoading();
    } catch (err) {
      hideLoading();
      console.error('加载习惯失败:', err);
      showToast('加载失败');
    }
  },

  /**
   * 前往模板选择
   */
  goToTemplates() {
    wx.navigateTo({
      url: `/pages/habit-templates/habit-templates?childId=${this.data.childId}`
    });
  },

  /**
   * 上移习惯
   */
  async moveHabit(e) {
    const { index, direction } = e.currentTarget.dataset;
    
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === this.data.habits.length - 1) return;

    try {
      const habits = [...this.data.habits];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      
      // 交换order值
      const currentHabit = habits[index];
      const targetHabit = habits[newIndex];
      
      const currentOrder = currentHabit.order;
      const targetOrder = targetHabit.order;
      
      // 更新数据库
      const db = wx.cloud.database();
      await db.collection('habits').doc(currentHabit._id).update({
        data: { order: targetOrder }
      });
      await db.collection('habits').doc(targetHabit._id).update({
        data: { order: currentOrder }
      });
      
      // 更新本地数据
      habits[index] = targetHabit;
      habits[newIndex] = currentHabit;
      
      this.setData({ habits });
    } catch (err) {
      console.error('调整顺序失败:', err);
      showToast('操作失败');
    }
  },

  /**
   * 编辑习惯
   */
  editHabit(e) {
    const habitId = e.currentTarget.dataset.id;
    const habit = this.data.habits.find(h => h._id === habitId);
    
    if (!habit) return;
    
    this.setData({
      showEditModal: true,
      editHabitId: habitId,
      editForm: {
        name: habit.name,
        points: habit.points,
        isActive: habit.isActive
      }
    });
  },

  /**
   * 删除习惯
   */
  async deleteHabit(e) {
    const habitId = e.currentTarget.dataset.id;
    const habit = this.data.habits.find(h => h._id === habitId);
    
    if (!habit) return;
    
    const res = await wx.showModal({
      title: '确认删除',
      content: `确定要删除"${habit.name}"吗?`,
      confirmColor: '#FF6B6B'
    });
    
    if (!res.confirm) return;
    
    try {
      showLoading('删除中...');
      
      const db = wx.cloud.database();
      await db.collection('habits').doc(habitId).remove();
      
      hideLoading();
      showToast('删除成功');
      this.loadHabits();
    } catch (err) {
      hideLoading();
      console.error('删除习惯失败:', err);
      showToast('删除失败');
    }
  },

  /**
   * 保存编辑
   */
  async saveEdit() {
    const { name, points, isActive } = this.data.editForm;
    
    if (!name.trim()) {
      showToast('请输入习惯名称');
      return;
    }
    
    if (points <= 0) {
      showToast('积分必须大于0');
      return;
    }
    
    try {
      showLoading('保存中...');
      
      const db = wx.cloud.database();
      await db.collection('habits').doc(this.data.editHabitId).update({
        data: {
          name: name.trim(),
          points: points,
          isActive: isActive,
          updateTime: db.serverDate()
        }
      });
      
      hideLoading();
      showToast('保存成功');
      this.closeEditModal();
      this.loadHabits();
    } catch (err) {
      hideLoading();
      console.error('保存失败:', err);
      showToast('保存失败');
    }
  },

  /**
   * 调整积分
   */
  adjustPoints(e) {
    const delta = parseInt(e.currentTarget.dataset.delta);
    const newPoints = Math.max(1, this.data.editForm.points + delta);
    this.setData({
      'editForm.points': newPoints
    });
  },

  /**
   * 输入处理
   */
  onNameInput(e) {
    this.setData({
      'editForm.name': e.detail.value
    });
  },

  onPointsInput(e) {
    const value = parseInt(e.detail.value);
    const points = isNaN(value) ? 0 : Math.max(1, value);
    this.setData({
      'editForm.points': points
    });
  },

  onActiveChange(e) {
    this.setData({
      'editForm.isActive': e.detail.value
    });
  },

  /**
   * 关闭弹窗
   */
  closeEditModal() {
    this.setData({ showEditModal: false });
  },

  /**
   * 阻止事件冒泡
   */
  stopPropagation() {}
});
