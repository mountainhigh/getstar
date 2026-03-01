// 初始化称号和礼物数据

const db = wx.cloud.database();

// 初始化8个特殊称号
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

// 初始化礼物列表
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

// 检查并初始化称号
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
    } else {
      console.log('称号数据已存在，跳过初始化');
    }
  } catch (err) {
    console.error('初始化称号失败:', err);
  }
}

// 检查并初始化礼物
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
    } else {
      console.log('礼物数据已存在，跳过初始化');
    }
  } catch (err) {
    console.error('初始化礼物失败:', err);
  }
}

// 执行初始化
async function init() {
  await initBadges();
  await initRewards();
}

// 导出函数
module.exports = {
  init,
  initBadges,
  initRewards
};
