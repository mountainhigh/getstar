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
      { type: 'image', value: '/images/avatars/boy1.png' },
      { type: 'image', value: '/images/avatars/boy2.png' },
      { type: 'image', value: '/images/avatars/girl1.png' },
      { type: 'image', value: '/images/avatars/girl2.png' }
    ]
  },

  onLoad(options) {
    const { createFamily } = options;
    if (createFamily === 'true') {
      // 需要创建家庭，仍然需要初始化数据
      this.setData({ hasFamily: false });
    } else {
      this.loadFamilyData();
    }
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

      // 等待 app 初始化完成
      const app = getApp();
      await app.initPromise;

      // 检查登录状态
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

      // 加载孩子列表（只使用 familyId，移除 openid 条件）
      const db = wx.cloud.database();
      const res = await db.collection('children').where({
        familyId: app.globalData.familyId,
        isDeleted: false
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
      const app = getApp();

      // 先调用登录云函数创建家庭（userLogin 会自动创建家庭）
      const loginRes = await wx.cloud.callFunction({
        name: 'userLogin'
      });

      if (loginRes.result && loginRes.result.success) {
        const { userId, familyId } = loginRes.result.data;

        app.globalData.userId = userId;
        app.globalData.familyId = familyId;
        app.globalData.isLoggedIn = true;
        app.globalData.hasFamily = true;

        this.setData({ hasFamily: true });

        hideLoading();
        showToast('创建成功');

        // 自动添加第一个孩子
        this.showAddChildModal();
      } else {
        hideLoading();
        showToast('创建失败,请重试');
      }
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
    debug('showAddChildModal 被调用', {
      avatarList: this.data.avatarList
    });

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
    debug('addChild 被调用', {
      childrenListLength: this.data.childrenList.length,
      hasFamily: this.data.hasFamily
    });

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
        avatar: child.avatar || this.data.avatarList[0].value,
        avatarType: child.avatarType || (child.avatar && child.avatar.startsWith('cloud://') ? 'image' : 'emoji')
      }
    });
  },

  /**
   * 切换孩子
   */
  switchChild(e) {
    const childId = e.currentTarget.dataset.id;

    // 设置新的当前孩子
    setStorage('currentChildId', childId);
    getApp().globalData.currentChildId = childId;
    this.setData({ currentChildId: childId });

    showToast('已切换');

    // 跳转到首页，确保其他页面能看到切换后的孩子
    setTimeout(() => {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }, 300);
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
      // 软删除：更新 isDeleted 字段为 true
      await db.collection('children').doc(childId).update({
        data: {
          isDeleted: true,
          updateTime: db.serverDate()
        }
      });
      
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
      
      // 标记首页需要刷新
      getApp().globalData.needRefreshIndex = true;
      
      // 延迟返回首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }, 500);
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

      // 调试日志
      debug('=== saveChild 调试信息 ===');
      debug('familyId:', app.globalData.familyId);
      debug('openid:', app.globalData.openid);
      debug('name:', name);
      debug('avatar:', avatar);

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
        // 添加（_openid 由系统自动注入）
        const res = await db.collection('children').add({
          data: {
            familyId: app.globalData.familyId,
            openid: app.globalData.openid,
            name,
            avatar,
            points: 0,
            coins: 0,
            level: 1,
            isDeleted: false,
            createTime: db.serverDate()
          }
        });

        const childId = res._id || res.id || res.data?._id;
        debug('孩子添加成功,childId:', childId);

        // 从模板批量添加习惯(按order排序,前10个)
        showLoading('正在添加习惯模板...');
        const addResult = await wx.cloud.callFunction({
          name: 'addHabitsFromTemplates',
          data: {
            childId: childId,
            limit: 10
          }
        });
        debug('习惯模板添加结果:', addResult);
        debug('习惯模板添加完成');

        // 如果是第一个孩子,设为当前选中
        if (this.data.childrenList.length === 0) {
          setStorage('currentChildId', childId);
          getApp().globalData.currentChildId = childId;
          this.setData({ currentChildId: childId });
        }
      }

      hideLoading();
      showToast('保存成功');
      this.closeChildModal();
      this.loadFamilyData();
      
      // 标记首页需要刷新
      getApp().globalData.needRefreshIndex = true;
      
      // 延迟返回首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }, 500);
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
    const { avatar, type } = e.currentTarget.dataset;
    this.setData({
      'childForm.avatar': avatar,
      'childForm.avatarType': type
    });
  },

  /**
   * 上传自定义头像
   */
  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        
        // 调用裁剪接口
        wx.cropImage({
          src: tempFilePath,
          cropScale: '1:1', // 裁剪比例 1:1
          success: (cropRes) => {
            this.setData({
              'childForm.avatar': cropRes.tempFilePath,
              'childForm.avatarType': 'image'
            });
          },
          fail: (err) => {
            debug('用户取消裁剪或裁剪失败', err);
            // 如果裁剪失败（非取消），使用原图
            if (err.errMsg !== 'cropImage:fail cancel') {
               this.setData({
                'childForm.avatar': tempFilePath,
                'childForm.avatarType': 'image'
              });
            }
          }
        });
      },
      fail: (err) => {
        console.error('选择图片失败', err);
      }
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
      content: '1. 创建家庭并添加孩子\n2. 选择习惯模板添加习惯\n3. 每天打卡记录孩子完成情况\n4. 获得星星和金币,升级称号\n5. 金币可以兑换礼物',
      showCancel: false
    });
  },

  /**
   * 关于我们
   */
  showAbout() {
    wx.showModal({
      title: '关于 攒星星',
      content: '攒星星 - 儿童行为激励管理小程序\\n帮助孩子养成好习惯',
      showCancel: false
    });
  },

  /**
   * 修复数据
   */
  async fixData() {
    wx.showModal({
      title: '确认修复',
      content: '此操作将为当前用户修复 familyId，是否继续？',
      success: async (res) => {
        if (res.confirm) {
          showLoading('修复中...');
          try {
            const result = await wx.cloud.callFunction({
              name: 'fixFamilyData'
            });
            hideLoading();
            if (result.result.success) {
              showToast(result.result.message, 'success');
            } else {
              showToast(result.result.message, 'error');
            }
          } catch (err) {
            hideLoading();
            console.error('修复数据失败:', err);
            showToast('修复失败', 'error');
          }
        }
      }
    });
  },


  /**
   * 修复 children 表的 isDeleted 字段（临时函数）
   */
  async fixChildrenIsDeleted() {
    wx.showModal({
      title: '修复数据',
      content: '为所有孩子记录添加 isDeleted 字段，是否继续？',
      confirmText: '确定',
      confirmColor: '#4CAF50',
      success: async (res) => {
        if (!res.confirm) {
          return;
        }

        try {
          wx.showLoading({
            title: '修复中...',
            mask: true
          });

          debug('调用 fixChildrenIsDeleted 云函数');
          
          const cloudRes = await wx.cloud.callFunction({
            name: 'fixChildrenIsDeleted'
          });

          debug('云函数返回结果:', cloudRes);

          wx.hideLoading();

          if (cloudRes.result && cloudRes.result.success) {
            const { total, updated, skipped } = cloudRes.result.data;
            
            wx.showModal({
              title: '修复完成',
              content: `共查询 ${total} 条记录\n更新 ${updated} 条记录\n跳过 ${skipped} 条记录`,
              showCancel: false,
              success: () => {
                this.loadFamilyData();
              }
            });
          } else {
            wx.showToast({
              title: cloudRes.result?.message || '修复失败',
              icon: 'none'
            });
          }
        } catch (err) {
          wx.hideLoading();
          console.error('调用云函数失败:', err);
          wx.showModal({
            title: '调用失败',
            content: '请先部署 fixChildrenIsDeleted 云函数\n\n错误信息: ' + (err.errMsg || err.message),
            showCancel: false
          });
        }
      }
    });
  },

  /**
   * 测试礼物系统
   */
  testRewards() {
    wx.navigateTo({
      url: '/pages/test-reward/test-reward'
    });
  },

  /**
   * 初始化数据库
   */
  async initDatabase() {
    debug('========== 开始初始化数据库 ==========');
    
    wx.showModal({
      title: '确认初始化',
      content: '⚠️ 此操作将清空所有表数据并重新初始化，是否继续？',
      confirmText: '确定',
      confirmColor: '#FF6B6B',
      success: async (res) => {
        if (!res.confirm) {
          debug('用户取消初始化');
          return;
        }

        debug('用户确认初始化，开始调用云函数...');
        
        try {
          wx.showLoading({
            title: '初始化中...',
            mask: true
          });

          debug('调用 initDatabase 云函数，参数: { drop: true }');
          
          const cloudRes = await wx.cloud.callFunction({
            name: 'initDatabase',
            data: {
              drop: true  // 清空并重新初始化
            }
          });

          debug('云函数返回结果:', cloudRes);
          debug('cloudRes.result:', cloudRes.result);
          debug('cloudRes.result.success:', cloudRes.result?.success);
          debug('cloudRes.result.message:', cloudRes.result?.message);
          debug('cloudRes.result.data:', cloudRes.result?.data);
          debug('cloudRes.result.results:', cloudRes.result?.results);

          wx.hideLoading();

          // 兼容两种返回格式
          let results = null;
          if (cloudRes.result?.results) {
            // 新格式：{success: true, results: {...}}
            results = cloudRes.result.results;
          } else if (cloudRes.result?.data) {
            // 旧格式：{success: true, message: "...", data: {...}}
            results = cloudRes.result.data;
          }

          debug('最终使用的 results:', results);

          if (results && Object.keys(results).length > 0) {
            let resultText = '数据库初始化完成:\n\n';

            for (const tableName in results) {
              const result = results[tableName];
              debug(`表 ${tableName} 的结果:`, result);
              if (result.success) {
                if (result.skipped) {
                  resultText += `${tableName}: 已有数据，跳过\n`;
                } else {
                  resultText += `${tableName}: ✅ 初始化完成 (${result.count} 条)\n`;
                }
              } else {
                resultText += `${tableName}: ❌ ${result.error}\n`;
              }
            }

            debug('最终显示内容:', resultText);

            wx.showModal({
              title: '初始化完成',
              content: resultText,
              showCancel: false
            });
          } else {
            console.error('云函数返回失败或没有结果数据');
            console.error('完整的 cloudRes.result:', JSON.stringify(cloudRes.result, null, 2));
            wx.showToast({
              title: '初始化失败',
              icon: 'none'
            });
          }
        } catch (err) {
          wx.hideLoading();
          console.error('========== 初始化数据库异常 ==========');
          console.error('错误类型:', err.name);
          console.error('错误消息:', err.message);
          console.error('完整错误:', err);
          console.error('错误堆栈:', err.stack);
          
          wx.showToast({
            title: '初始化失败',
            icon: 'none'
          });
        }
      }
    });
  },

  /**
   * 分享给好友
   */
  onShareAppMessage() {
    return {
      title: '攒星星 - 管理孩子的习惯养成',
      path: '/pages/index/index',
      imageUrl: '/images/share-cover.png'
    };
  },

  /**
   * 分享到朋友圈
   */
  onShareTimeline() {
    return {
      title: '攒星星 - 管理孩子的习惯养成',
      query: '',
      imageUrl: '/images/share-cover.png'
    };
  }
});
