const { showToast, showLoading, hideLoading } = require('../../utils/util');
const { getStorage } = require('../../utils/storage');

Page({
  data: {
    currentCategory: 'all',
    categories: [
      { id: 'all', name: '全部' },
      { id: 'study', name: '学习' },
      { id: 'life', name: '生活' },
      { id: 'sports', name: '运动' },
      { id: 'manners', name: '礼仪' },
      { id: 'labor', name: '劳动' }
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
      // 优先从 storage 读取当前选中的孩子
      const app = getApp();
      childId = getStorage('currentChildId') || app.globalData.currentChildId;
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

      console.log('开始加载习惯模板...');

      // 通过云函数读取习惯模板（云函数有管理员权限，不受前端安全规则限制）
      const res = await wx.cloud.callFunction({
        name: 'getHabitTemplates'
      });

      console.log('云函数返回结果:', res);

      if (!res.result || !res.result.success) {
        hideLoading();
        showToast(res.result?.message || '加载失败');
        return;
      }

      const templates = res.result.data.map(t => ({
        ...t,
        id: t._id,
        selected: false
      }));

      console.log('处理后的模板数量:', templates.length);
      console.log('第一个模板:', templates[0]);

      this.setData({
        templates,
        filteredTemplates: templates
      });

      console.log('setData完成, 当前filteredTemplates长度:', this.data.filteredTemplates.length);

      hideLoading();
    } catch (err) {
      hideLoading();
      console.error('加载习惯模板失败:', err);
      console.error('错误详情:', JSON.stringify(err));
      showToast('加载失败: ' + (err.errMsg || err.message || '未知错误'));
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
      selected: selectedTemplates.has(t._id)
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
      const app = getApp();

      let successCount = 0;
      let failCount = 0;

      for (const templateId of selectedTemplates) {
        try {
          const template = templates.find(t => t._id === templateId);
          if (!template) continue;

          const result = await db.collection('habits').add({
            data: {
              childId,
              templateId: template._id,
              name: template.name,
              icon: template.icon,
              category: template.category,
              categoryName: template.categoryName,
              color: template.color,
              points: template.points,
              order: template.order,
              isActive: true,
              createTime: db.serverDate(),
              updateTime: db.serverDate()
            }
          });
          console.log('✓ 已添加习惯:', template.name, 'ID:', result._id);
          successCount++;
        } catch (err) {
          console.error('✗ 添加习惯失败:', err);
          failCount++;
        }
      }

      console.log(`习惯添加完成: 成功 ${successCount} 个, 失败 ${failCount} 个`);

      hideLoading();

      if (successCount > 0) {
        showToast('添加成功');
        setTimeout(() => {
          wx.navigateBack();
        }, 500);
      } else {
        showToast('添加失败,请重试');
      }
    } catch (err) {
      hideLoading();
      console.error('添加习惯失败:', err);
      showToast('添加失败,请重试');
    }
  }
});
