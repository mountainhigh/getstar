const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 默认礼物模板
 * 注意：category 必须与前端 reward-manage.js 中的 categories 数组一致
 * 前端 categories: ['美食', '娱乐', '活动', '学习', '玩具', '其他']
 */
const defaultRewards = [
  {
    name: '冰淇淋',
    icon: '🍦',
    description: '美味的冰淇淋',
    cost: 50,
    stock: -1,
    category: '美食',
    order: 1
  },
  {
    name: '动画片时间',
    icon: '📺',
    description: '30分钟动画片',
    cost: 100,
    stock: -1,
    category: '娱乐',
    order: 2
  },
  {
    name: '公园游玩',
    icon: '🎡',
    description: '去公园玩2小时',
    cost: 150,
    stock: -1,
    category: '活动',
    order: 3
  },
  {
    name: '故事书',
    icon: '📚',
    description: '一本喜欢的故事书',
    cost: 200,
    stock: -1,
    category: '学习',
    order: 4
  },
  {
    name: '玩具车',
    icon: '🚗',
    description: '一个玩具车',
    cost: 300,
    stock: -1,
    category: '玩具',
    order: 5
  },
  {
    name: '小蛋糕',
    icon: '🍰',
    description: '美味的小蛋糕',
    cost: 80,
    stock: -1,
    category: '美食',
    order: 6
  },
  {
    name: '游戏时间',
    icon: '🎮',
    description: '1小时游戏时间',
    cost: 120,
    stock: -1,
    category: '娱乐',
    order: 7
  },
  {
    name: '野餐',
    icon: '🧺',
    description: '家庭野餐',
    cost: 250,
    stock: -1,
    category: '活动',
    order: 8
  },
  {
    name: '新文具',
    icon: '✏️',
    description: '一套新文具',
    cost: 180,
    stock: -1,
    category: '学习',
    order: 9
  },
  {
    name: '乐高',
    icon: '🧱',
    description: '乐高玩具',
    cost: 400,
    stock: -1,
    category: '玩具',
    order: 10
  }
];

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { OPENID } = wxContext;

  try {
    console.log('开始初始化用户礼物, OPENID:', OPENID);

    // 检查用户是否已经有礼物
    const existingRewards = await db.collection('rewards')
      .where({
        _openid: OPENID
      })
      .count();

    console.log('现有礼物数量:', existingRewards.total);

    if (existingRewards.total > 0) {
      return {
        success: true,
        message: '礼物已存在，无需重复初始化',
        data: {
          count: existingRewards.total
        }
      };
    }

    // 批量插入默认礼物
    const insertPromises = defaultRewards.map(reward => {
      return db.collection('rewards').add({
        data: {
          ...reward,
          // 注意：不要手动设置 _openid，云数据库会自动添加
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      });
    });

    await Promise.all(insertPromises);

    console.log('初始化礼物成功，共插入', defaultRewards.length, '条记录');

    return {
      success: true,
      message: '初始化礼物成功',
      data: {
        count: defaultRewards.length
      }
    };
  } catch (error) {
    console.error('初始化用户礼物失败:', error);
    return {
      success: false,
      message: '初始化失败',
      error: error.message
    };
  }
};
