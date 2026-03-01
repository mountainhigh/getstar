const { showToast, showLoading, hideLoading } = require('../../utils/util');
const { getStorage, setStorage } = require('../../utils/storage');

Page({
  data: {
    hasFamily: false,
    childrenList: [],
    currentChildId: null,
    showChildModal: false,
    isEdit: false,
    editChildId: '',
    childForm: {
      name: '',
      avatar: ''
    },
    avatarList: [
      'https://img.icons8.com/color/96/child--v1.png',
      'https://img.icons8.com/color/96/baby-boy.png',
      'https://img.icons8.com/color/96/baby-girl.png',
      'https://img.icons8.com/color/96/student-female.png',
      'https://img.icons8.com/color/96/student-male.png'
    ]
  },

  onLoad(options) {
    const { createFamily } = options;
    if (createFamily === 'true') {
      // 需要创建家庭
      return;
    }
    this.loadFamilyData();
  },

  onShow() {
    this.loadFamilyData();
  },

  /**
   * 加载家庭数据
   */
  async loadFamilyData() {
    try {
      showLoading('加载中...');

      // 检查登录状态
      const app = getApp();
      const userInfo = app.getUserInfo();

      if (!userInfo.isLoggedIn) {
        hideLoading();
        showToast('未登录，请先登录');
        return;
      }

      if (!app.globalData.familyId) {
        this.setData({ hasFamily: false });
        hideLoading();
        return;
      }
      
      this.setData({ hasFamily: true });
      
      // 加载孩子列表
      const db = wx.cloud.database();
      const res = await db.collection('children').where({
        familyId: app.globalData.familyId
      }).orderBy('createTime', 'asc').get();
      
      this.setData({ childrenList: res.data });
      
      // 获取当前选中的孩子
      const currentChildId = getStorage('currentChildId');
      this.setData({ currentChildId });
      
      hideLoading();
    } catch (err) {
      hideLoading();
      console.error('加载家庭数据失败:', err);
      showToast('加载失败');
    }
  },

  /**
   * 创建家庭
   */
  async createFamily() {
    try {
      showLoading('创建中...');
      
      const db = wx.cloud.database();
      const res = await db.collection('families').add({
        data: {
          name: '我的家庭',
          createTime: db.serverDate()
        }
      });
      
      const app = getApp();
      app.globalData.familyId = res._id;
      app.globalData.hasFamily = true;
      
      this.setData({ hasFamily: true });
      
      hideLoading();
      showToast('创建成功');
      
      // 自动添加第一个孩子
      this.showAddChildModal();
    } catch (err) {
      hideLoading();
      console.error('创建家庭失败:', err);
      showToast('创建失败,请重试');
    }
  },

  /**
   * 显示添加孩子弹窗
   */
  showAddChildModal() {
    this.setData({
      showChildModal: true,
      isEdit: false,
      editChildId: '',
      childForm: {
        name: '',
        avatar: this.data.avatarList[0]
      }
    });
  },

  /**
   * 添加孩子
   */
  addChild() {
    if (this.data.childrenList.length >= 5) {
      showToast('最多添加5个孩子');
      return;
    }
    
    this.showAddChildModal();
  },

  /**
   * 编辑孩子
   */
  editChild(e) {
    const childId = e.currentTarget.dataset.id;
    const child = this.data.childrenList.find(c => c._id === childId);
    
    if (!child) return;
    
    this.setData({
      showChildModal: true,
      isEdit: true,
      editChildId: childId,
      childForm: {
        name: child.name,
        avatar: child.avatar || this.data.avatarList[0]
      }
    });
  },

  /**
   * 删除孩子
   */
  async deleteChild(e) {
    const childId = e.currentTarget.dataset.id;
    
    const res = await wx.showModal({
      title: '确认删除',
      content: '删除后数据将无法恢复,确定要删除吗?',
      confirmColor: '#FF6B6B'
    });
    
    if (!res.confirm) return;
    
    try {
      showLoading('删除中...');
      
      const db = wx.cloud.database();
      await db.collection('children').doc(childId).remove();
      
      // 如果删除的是当前选中的孩子,切换到第一个孩子
      if (childId === this.data.currentChildId) {
        const remainingChildren = this.data.childrenList.filter(c => c._id !== childId);
        if (remainingChildren.length > 0) {
          const newCurrentId = remainingChildren[0]._id;
          setStorage('currentChildId', newCurrentId);
          getApp().globalData.currentChildId = newCurrentId;
          this.setData({ currentChildId: newCurrentId });
        }
      }
      
      hideLoading();
      showToast('删除成功');
      this.loadFamilyData();
    } catch (err) {
      hideLoading();
      console.error('删除孩子失败:', err);
      showToast('删除失败');
    }
  },

  /**
   * 保存孩子
   */
  async saveChild() {
    const { name, avatar } = this.data.childForm;
    
    if (!name.trim()) {
      showToast('请输入孩子姓名');
      return;
    }
    
    try {
      showLoading('保存中...');
      
      const db = wx.cloud.database();
      const app = getApp();
      
      if (this.data.isEdit) {
        // 编辑
        await db.collection('children').doc(this.data.editChildId).update({
          data: {
            name,
            avatar,
            updateTime: db.serverDate()
          }
        });
      } else {
        // 添加
        const res = await db.collection('children').add({
          data: {
            familyId: app.globalData.familyId,
            name,
            avatar,
            points: 0,
            coins: 0,
            level: 1,
            createTime: db.serverDate()
          }
        });
        
        // 如果是第一个孩子,设为当前选中
        if (this.data.childrenList.length === 0) {
          setStorage('currentChildId', res._id);
          getApp().globalData.currentChildId = res._id;
          this.setData({ currentChildId: res._id });
        }
      }
      
      hideLoading();
      showToast('保存成功');
      this.closeChildModal();
      this.loadFamilyData();
    } catch (err) {
      hideLoading();
      console.error('保存孩子失败:', err);
      showToast('保存失败');
    }
  },

  /**
   * 选择头像
   */
  selectAvatar(e) {
    const avatar = e.currentTarget.dataset.avatar;
    this.setData({
      'childForm.avatar': avatar
    });
  },

  /**
   * 关闭弹窗
   */
  closeChildModal() {
    this.setData({ showChildModal: false });
  },

  /**
   * 阻止事件冒泡
   */
  stopPropagation() {},

  /**
   * 输入处理
   */
  onNameInput(e) {
    this.setData({
      'childForm.name': e.detail.value
    });
  },

  /**
   * 使用帮助
   */
  showHelp() {
    wx.showModal({
      title: '使用帮助',
      content: '1. 创建家庭并添加孩子\n2. 选择习惯模板添加习惯\n3. 每天打卡记录孩子完成情况\n4. 获得积分和金币,升级称号\n5. 金币可以兑换礼物',
      showCancel: false
    });
  },

  /**
   * 关于我们
   */
  showAbout() {
    wx.showModal({
      title: '关于 GetStar',
      content: 'GetStar - 儿童行为激励管理小程序\n帮助孩子养成好习惯',
      showCancel: false
    });
  }
});
