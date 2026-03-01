const { showToast, showLoading, hideLoading } = require('../../utils/util');

Page({
  data: {
    currentCategory: 'all',
    categories: [
      { id: 'all', name: '全部' },
      { id: 'study', name: '学习' },
      { id: 'life', name: '生活' },
      { id: 'exercise', name: '运动' },
      { id: 'habit', name: '习惯' },
      { id: 'social', name: '社交' }
    ],
    templates: [],
    filteredTemplates: [],
    selectedTemplates: new Set(),
    selectedCount: 0,
    childId: ''
  },

  onLoad(options) {
    const { childId } = options;
    if (!childId) {
      // 如果没有传childId,使用当前选中的孩子
      const app = getApp();
      childId = app.globalData.currentChildId;
    }

    if (!childId) {
      showToast('请先选择孩子');
      wx.navigateBack();
      return;
    }

    this.setData({ childId });
    this.loadTemplates();
  },

  /**
   * 加载习惯模板
   */
  async loadTemplates() {
    try {
      showLoading('加载中...');
      
      const db = wx.cloud.database();
      const res = await db.collection('habit_templates').get();
      
      const templates = res.data.map(t => ({
        ...t,
        selected: false
      }));
      
      this.setData({
        templates,
        filteredTemplates: templates
      });
      
      hideLoading();
    } catch (err) {
      hideLoading();
      console.error('加载习惯模板失败:', err);
      showToast('加载失败');
    }
  },

  /**
   * 选择分类
   */
  selectCategory(e) {
    const categoryId = e.currentTarget.dataset.id;
    this.setData({ currentCategory: categoryId });
    
    this.filterTemplates();
  },

  /**
   * 过滤模板
   */
  filterTemplates() {
    const { templates, currentCategory } = this.data;
    
    let filtered = templates;
    if (currentCategory !== 'all') {
      filtered = templates.filter(t => t.category === currentCategory);
    }
    
    this.setData({ filteredTemplates: filtered });
  },

  /**
   * 切换模板选择状态
   */
  toggleTemplate(e) {
    const templateId = e.currentTarget.dataset.id;
    const selectedTemplates = new Set(this.data.selectedTemplates);
    
    if (selectedTemplates.has(templateId)) {
      selectedTemplates.delete(templateId);
    } else {
      selectedTemplates.add(templateId);
    }
    
    const filteredTemplates = this.data.filteredTemplates.map(t => ({
      ...t,
      selected: selectedTemplates.has(t.id)
    }));
    
    this.setData({
      selectedTemplates,
      selectedCount: selectedTemplates.size,
      filteredTemplates
    });
  },

  /**
   * 添加习惯
   */
  async addHabits() {
    try {
      const { selectedTemplates, templates, childId } = this.data;
      
      if (selectedTemplates.size === 0) {
        showToast('请选择习惯');
        return;
      }
      
      showLoading('添加中...');
      
      const db = wx.cloud.database();
      const _ = db.command;
      const app = getApp();
      
      // 获取当前孩子的习惯数量,用于排序
      const habitRes = await db.collection('habits').where({
        childId
      }).count();
      
      let maxOrder = habitRes.total;
      
      // 批量添加习惯
      const addPromises = Array.from(selectedTemplates).map(async (templateId) => {
        const template = templates.find(t => t.id === templateId);
        if (!template) return;
        
        await db.collection('habits').add({
          data: {
            childId,
            familyId: app.globalData.familyId,
            name: template.name,
            icon: template.icon,
            category: template.category,
            categoryColor: template.color,
            points: template.points,
            order: ++maxOrder,
            isActive: true,
            createTime: db.serverDate()
          }
        });
      });
      
      await Promise.all(addPromises);
      
      hideLoading();
      showToast('添加成功');
      
      // 返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 500);
    } catch (err) {
      hideLoading();
      console.error('添加习惯失败:', err);
      showToast('添加失败,请重试');
    }
  }
});
