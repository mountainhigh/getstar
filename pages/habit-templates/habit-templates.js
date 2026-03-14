const { showToast, showLoading, hideLoading } = require('../../utils/util');
const { getStorage } = require('../../utils/storage');
const { debug, info, warn, error } = require('../../utils/logger');

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
    selectedTemplates: [],
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
    this.loadChildHabits();
  },

  /**
   * 加载孩子已有的习惯
   */
  async loadChildHabits() {
    try {
      const { childId } = this.data;
      if (!childId) return;

      const db = wx.cloud.database();
      const res = await db.collection('habits').where({
        childId: childId,
        isActive: true
      }).get();

      // 获取已使用的模板ID列表
      const existingTemplateIds = res.data.map(h => h.templateId).filter(id => id);
      debug('孩子已有的习惯模板ID:', existingTemplateIds);

      // 更新模板列表，标记已存在的
      const templates = this.data.templates.map(t => ({
        ...t,
        alreadyAdded: existingTemplateIds.includes(t.id) || existingTemplateIds.includes(t._id)
      }));

      this.setData({ 
        templates,
        filteredTemplates: templates 
      });
    } catch (err) {
      console.error('加载孩子习惯失败:', err);
    }
  },

  /**
   * 加载习惯模板
   */
  async loadTemplates() {
    try {
      showLoading('加载中...');

      debug('开始加载习惯模板...');

      // 通过云函数读取习惯模板（云函数有管理员权限，不受前端安全规则限制）
      const res = await wx.cloud.callFunction({
        name: 'getHabitTemplates'
      });

      debug('云函数返回结果:', res);

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

      debug('处理后的模板数量:', templates.length);
      debug('第一个模板:', templates[0]);

      this.setData({
        templates,
        filteredTemplates: templates
      });

      debug('setData完成, 当前filteredTemplates长度:', this.data.filteredTemplates.length);

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
    
    debug('=== 过滤模板调试 ===');
    debug('当前选中分类:', currentCategory);
    debug('所有模板数量:', templates.length);
    
    // 显示所有模板的分类值
    const allCategories = templates.map(t => ({ name: t.name, category: t.category }));
    debug('所有模板详情:', JSON.stringify(allCategories, null, 2));
    
    // 统计各分类数量
    const categoryCount = {};
    templates.forEach(t => {
      categoryCount[t.category] = (categoryCount[t.category] || 0) + 1;
    });
    debug('各分类数量:', categoryCount);
    
    let filtered = templates;
    if (currentCategory !== 'all') {
      filtered = templates.filter(t => {
        const match = t.category === currentCategory;
        debug(`比较: 模板"${t.name}"的分类"${t.category}" === 当前"${currentCategory}" ? ${match}`);
        return match;
      });
      debug('过滤后数量:', filtered.length);
    }
    
    this.setData({ filteredTemplates: filtered });
  },

  /**
   * 切换模板选择状态
   */
  toggleTemplate(e) {
    const templateId = e.currentTarget.dataset.id;
    const template = this.data.filteredTemplates.find(t => t.id === templateId);
    
    // 如果已经添加过，不允许选择
    if (template && template.alreadyAdded) {
      showToast('该习惯已添加');
      return;
    }

    let selectedTemplates = [...this.data.selectedTemplates];

    const index = selectedTemplates.indexOf(templateId);
    if (index > -1) {
      selectedTemplates.splice(index, 1);
    } else {
      selectedTemplates.push(templateId);
    }

    const filteredTemplates = this.data.filteredTemplates.map(t => ({
      ...t,
      selected: selectedTemplates.includes(t.id)
    }));

    this.setData({
      selectedTemplates,
      selectedCount: selectedTemplates.length,
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
          const template = templates.find(t => t.id === templateId || t._id === templateId);
          if (!template) {
            debug('未找到模板:', templateId);
            continue;
          }

          const result = await db.collection('habits').add({
            data: {
              childId,
              templateId: template.id,
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
          debug('✓ 已添加习惯:', template.name, 'ID:', result._id);
          successCount++;
        } catch (err) {
          console.error('✗ 添加习惯失败:', err);
          failCount++;
        }
      }

      debug(`习惯添加完成: 成功 ${successCount} 个, 失败 ${failCount} 个`);

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
  },

  /**
   * 分享给好友
   */
  onShareAppMessage() {
    return {
      title: '攒星星 - 丰富的习惯模板库',
      path: '/pages/habit-templates/habit-templates',
      imageUrl: '/images/share-cover.png'
    };
  },

  /**
   * 分享到朋友圈
   */
  onShareTimeline() {
    return {
      title: '攒星星 - 丰富的习惯模板库',
      query: '',
      imageUrl: '/images/share-cover.png'
    };
  }
});
