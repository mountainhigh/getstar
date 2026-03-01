// 云函数入口文件
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// ========== 集合创建说明 ==========

/**
 * 需要在CloudBase控制台手动创建以下集合:
 * 1. families - 家庭表
 * 2. children - 孩子表
 * 3. habits - 习惯表
 * 4. check_ins - 打卡记录表
 * 5. habit_templates - 习惯模板表
 * 6. daily_records - 每日记录表
 * 7. badges - 称号表
 * 8. user_badges - 用户称号表
 * 9. rewards - 礼物表
 * 10. reward_exchanges - 兑换记录表
 * 11. coin_records - 金币记录表
 */

// ========== 习惯模板数据 ==========

const habitTemplates = [
  // 学习类
  { id: 'study_1', name: '完成作业', icon: '📚', category: 'study', categoryName: '学习', color: '#FF6B6B', points: 5, order: 1 },
  { id: 'study_2', name: '阅读30分钟', icon: '📖', category: 'study', categoryName: '学习', color: '#FF6B6B', points: 3, order: 2 },
  { id: 'study_3', name: '背诵单词', icon: '📝', category: 'study', categoryName: '学习', color: '#FF6B6B', points: 3, order: 3 },
  { id: 'study_4', name: '练字20分钟', icon: '✍️', category: 'study', categoryName: '学习', color: '#FF6B6B', points: 3, order: 4 },
  { id: 'study_5', name: '预习功课', icon: '📕', category: 'study', categoryName: '学习', color: '#FF6B6B', points: 4, order: 5 },
  
  // 运动类
  { id: 'sports_1', name: '晨跑20分钟', icon: '🏃', category: 'sports', categoryName: '运动', color: '#4ECDC4', points: 4, order: 6 },
  { id: 'sports_2', name: '跳绳100下', icon: '🪢', category: 'sports', categoryName: '运动', color: '#4ECDC4', points: 3, order: 7 },
  { id: 'sports_3', name: '做广播体操', icon: '🤸', category: 'sports', categoryName: '运动', color: '#4ECDC4', points: 2, order: 8 },
  { id: 'sports_4', name: '游泳30分钟', icon: '🏊', category: 'sports', categoryName: '运动', color: '#4ECDC4', points: 5, order: 9 },
  { id: 'sports_5', name: '打羽毛球', icon: '🏸', category: 'sports', categoryName: '运动', color: '#4ECDC4', points: 4, order: 10 },
  
  // 生活类
  { id: 'life_1', name: '整理房间', icon: '🧹', category: 'life', categoryName: '生活', color: '#95E1D3', points: 3, order: 11 },
  { id: 'life_2', name: '自己穿衣服', icon: '👕', category: 'life', categoryName: '生活', color: '#95E1D3', points: 2, order: 12 },
  { id: 'life_3', name: '按时睡觉', icon: '😴', category: 'life', categoryName: '生活', color: '#95E1D3', points: 2, order: 13 },
  { id: 'life_4', name: '主动洗碗', icon: '🍽️', category: 'life', categoryName: '生活', color: '#95E1D3', points: 3, order: 14 },
  { id: 'life_5', name: '整理书包', icon: '🎒', category: 'life', categoryName: '生活', color: '#95E1D3', points: 2, order: 15 },
  
  // 礼仪类
  { id: 'manners_1', name: '主动问好', icon: '👋', category: 'manners', categoryName: '礼仪', color: '#F38181', points: 2, order: 16 },
  { id: 'manners_2', name: '说谢谢', icon: '🙏', category: 'manners', categoryName: '礼仪', color: '#F38181', points: 2, order: 17 },
  { id: 'manners_3', name: '分享玩具', icon: '🤝', category: 'manners', categoryName: '礼仪', color: '#F38181', points: 3, order: 18 },
  { id: 'manners_4', name: '不打闹', icon: '🚫', category: 'manners', categoryName: '礼仪', color: '#F38181', points: 2, order: 19 },
  { id: 'manners_5', name: '排队等候', icon: '⏳', category: 'manners', categoryName: '礼仪', color: '#F38181', points: 2, order: 20 },
  
  // 劳动类
  { id: 'labor_1', name: '帮忙做饭', icon: '👩‍🍳', category: 'labor', categoryName: '劳动', color: '#AA96DA', points: 4, order: 21 },
  { id: 'labor_2', name: '浇花', icon: '🌱', category: 'labor', categoryName: '劳动', color: '#AA96DA', points: 2, order: 22 },
  { id: 'labor_3', name: '擦桌子', icon: '🧽', category: 'labor', categoryName: '劳动', color: '#AA96DA', points: 2, order: 23 },
  { id: 'labor_4', name: '倒垃圾', icon: '🗑️', category: 'labor', categoryName: '劳动', color: '#AA96DA', points: 2, order: 24 },
  { id: 'labor_5', name: '整理鞋子', icon: '👞', category: 'labor', categoryName: '劳动', color: '#AA96DA', points: 1, order: 25 }
];

// ========== 称号数据 ==========

const badges = [
  {
    id: 'badge_001',
    name: '初出茅庐',
    icon: '🌱',
    description: '刚开始养成习惯的小朋友',
    condition: '完成1次打卡',
    pointsRequired: 0,
    color: '#95EC69',
    rarity: 'common',
    category: 'progress',
    order: 1
  },
  {
    id: 'badge_002',
    name: '习惯小达人',
    icon: '🌟',
    description: '已经养成了一些好习惯',
    condition: '累计打卡10次',
    pointsRequired: 100,
    color: '#FFD700',
    rarity: 'common',
    category: 'progress',
    order: 2
  },
  {
    id: 'badge_003',
    name: '坚持不懈',
    icon: '💪',
    description: '连续7天打卡',
    condition: '连续打卡7天',
    pointsRequired: 200,
    color: '#FF6B6B',
    rarity: 'rare',
    category: 'consistency',
    order: 3
  },
  {
    id: 'badge_004',
    name: '习惯养成大师',
    icon: '🏆',
    description: '累计打卡30次',
    condition: '累计打卡30次',
    pointsRequired: 500,
    color: '#9B59B6',
    rarity: 'rare',
    category: 'progress',
    order: 4
  },
  {
    id: 'badge_005',
    name: '超级习惯王',
    icon: '👑',
    description: '累计打卡100次',
    condition: '累计打卡100次',
    pointsRequired: 1500,
    color: '#E74C3C',
    rarity: 'epic',
    category: 'progress',
    order: 5
  },
  {
    id: 'badge_006',
    name: '坚持到底',
    icon: '🔥',
    description: '连续30天打卡',
    condition: '连续打卡30天',
    pointsRequired: 1000,
    color: '#F39C12',
    rarity: 'epic',
    category: 'consistency',
    order: 6
  },
  {
    id: 'badge_007',
    name: '习惯传奇',
    icon: '⭐',
    description: '累计打卡300次',
    condition: '累计打卡300次',
    pointsRequired: 5000,
    color: '#3498DB',
    rarity: 'legendary',
    category: 'progress',
    order: 7
  },
  {
    id: 'badge_008',
    name: '终极习惯大师',
    icon: '💎',
    description: '累计打卡500次',
    condition: '累计打卡500次',
    pointsRequired: 10000,
    color: '#2ECC71',
    rarity: 'legendary',
    category: 'progress',
    order: 8
  }
];

// ========== 礼物数据 ==========

const rewards = [
  {
    id: 'reward_001',
    name: '冰淇淋',
    icon: '🍦',
    description: '美味的冰淇淋',
    coinCost: 50,
    stock: -1, // -1 表示无限库存
    category: 'food',
    order: 1
  },
  {
    id: 'reward_002',
    name: '动画片时间',
    icon: '📺',
    description: '30分钟动画片',
    coinCost: 100,
    stock: -1,
    category: 'entertainment',
    order: 2
  },
  {
    id: 'reward_003',
    name: '公园游玩',
    icon: '🎡',
    description: '去公园玩2小时',
    coinCost: 150,
    stock: -1,
    category: 'activity',
    order: 3
  },
  {
    id: 'reward_004',
    name: '故事书',
    icon: '📚',
    description: '一本喜欢的故事书',
    coinCost: 200,
    stock: -1,
    category: 'education',
    order: 4
  },
  {
    id: 'reward_005',
    name: '玩具车',
    icon: '🚗',
    description: '一辆玩具车',
    coinCost: 500,
    stock: -1,
    category: 'toy',
    order: 5
  },
  {
    id: 'reward_006',
    name: '绘画套装',
    icon: '🎨',
    description: '绘画用品套装',
    coinCost: 300,
    stock: -1,
    category: 'education',
    order: 6
  },
  {
    id: 'reward_007',
    name: '游乐园门票',
    icon: '🎢',
    description: '游乐园一日游',
    coinCost: 1000,
    stock: -1,
    category: 'activity',
    order: 7
  },
  {
    id: 'reward_008',
    name: '新自行车',
    icon: '🚲',
    description: '一辆新自行车',
    coinCost: 5000,
    stock: -1,
    category: 'toy',
    order: 8
  }
];

// ========== 初始化函数 ==========

// 初始化习惯模板
async function initHabitTemplates() {
  try {
    const res = await db.collection('habit_templates').limit(1).get();
    
    if (res.data.length === 0) {
      console.log('初始化习惯模板数据...');
      
      for (const template of habitTemplates) {
        await db.collection('habit_templates').add({
          data: template
        });
      }
      
      console.log('习惯模板初始化完成，共', habitTemplates.length, '个模板');
      return { success: true, count: habitTemplates.length };
    } else {
      console.log('习惯模板已存在，跳过初始化');
      return { success: true, count: 0, message: '已存在' };
    }
  } catch (err) {
    console.error('初始化习惯模板失败:', err);
    return { success: false, error: err.message };
  }
}

// 初始化称号
async function initBadges() {
  try {
    const res = await db.collection('badges').limit(1).get();
    
    if (res.data.length === 0) {
      console.log('初始化称号数据...');
      
      for (const badge of badges) {
        await db.collection('badges').add({
          data: badge
        });
      }
      
      console.log('称号数据初始化完成，共', badges.length, '个称号');
      return { success: true, count: badges.length };
    } else {
      console.log('称号数据已存在，跳过初始化');
      return { success: true, count: 0, message: '已存在' };
    }
  } catch (err) {
    console.error('初始化称号失败:', err);
    return { success: false, error: err.message };
  }
}

// 初始化礼物
async function initRewards() {
  try {
    const res = await db.collection('rewards').limit(1).get();
    
    if (res.data.length === 0) {
      console.log('初始化礼物数据...');
      
      for (const reward of rewards) {
        await db.collection('rewards').add({
          data: reward
        });
      }
      
      console.log('礼物数据初始化完成，共', rewards.length, '个礼物');
      return { success: true, count: rewards.length };
    } else {
      console.log('礼物数据已存在，跳过初始化');
      return { success: true, count: 0, message: '已存在' };
    }
  } catch (err) {
    console.error('初始化礼物失败:', err);
    return { success: false, error: err.message };
  }
}

// 主函数
exports.main = async (event, context) => {
  const { action } = event || {};
  
  let result = {
    success: true,
    message: '初始化完成',
    data: {}
  };
  
  try {
    if (!action || action === 'all') {
      // 初始化所有数据
      const habitTemplatesResult = await initHabitTemplates();
      const badgesResult = await initBadges();
      const rewardsResult = await initRewards();
      
      result.data = {
        habitTemplates: habitTemplatesResult,
        badges: badgesResult,
        rewards: rewardsResult
      };
      
      result.message = '所有数据初始化完成';
    } else if (action === 'habitTemplates') {
      result.data.habitTemplates = await initHabitTemplates();
      result.message = '习惯模板初始化完成';
    } else if (action === 'badges') {
      result.data.badges = await initBadges();
      result.message = '称号数据初始化完成';
    } else if (action === 'rewards') {
      result.data.rewards = await initRewards();
      result.message = '礼物数据初始化完成';
    } else {
      result.success = false;
      result.message = '未知的操作类型: ' + action;
    }
  } catch (err) {
    console.error('初始化失败:', err);
    result.success = false;
    result.message = err.message;
  }
  
  return result;
};
