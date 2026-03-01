/**
 * 数据库初始化脚本
 * 包含所有集合的结构定义和初始数据
 */

const db = wx.cloud.database();

// ========== 集合结构定义 ==========

/**
 * 1. users (用户表)
 */
/*
{
  _id: string,
  openid: string,           // 用户openid（微信唯一标识）
  appid: string,            // 小程序appid
  nickname: string,         // 用户昵称
  avatar: string,           // 头像URL
  unionid: string,         // 微信开放平台unionid
  status: string,           // 状态: active/inactive
  loginCount: number,       // 登录次数
  lastLoginTime: Date,      // 最后登录时间
  createTime: Date,
  updateTime: Date
}
*/

/**
 * 2. families (家庭表)
 */
/*
{
  _id: string,
  name: string,             // 家庭名称
  ownerId: string,          // 创建人ID (关联users表的_id)
  _openid: string,         // 用户openid（用于权限控制）
  createTime: Date,
  updateTime: Date
}
*/

/**
 * 3. children (孩子表)
 */
/*
{
  _id: string,
  familyId: string,         // 家庭ID
  name: string,             // 孩子姓名
  avatar: string,          // 头像emoji或URL
  points: number,           // 总积分
  coins: number,            // 金币
  level: number,            // 等级
  openid: string,          // 用户openid（用于关联用户）
  _openid: string,         // 用户openid（用于权限控制）
  createTime: Date,
  updateTime: Date
}
*/

/**
 * 4. habits (习惯表)
 */
/*
{
  _id: string,
  childId: string,          // 孩子ID
  familyId: string,         // 家庭ID
  name: string,             // 习惯名称
  icon: string,             // 图标emoji
  category: string,         // 分类: study/life/exercise/habit/social
  categoryName: string,     // 分类中文名称
  color: string,            // 分类颜色
  points: number,           // 积分值
  order: number,            // 排序
  isActive: boolean,       // 是否激活
  templateId: string,      // 模板ID（来自habit_templates）
  createTime: Date,
  updateTime: Date,
  _openid: string,         // 用户openid（用于权限控制）
}
*/

/**
 * 5. check_ins (打卡记录表)
 */
/*
{
  _id: string,
  childId: string,          // 孩子ID
  habitId: string,          // 习惯ID
  date: string,             // 日期 YYYY-MM-DD
  points: number,           // 获得积分（实际获得的）
  habitPoints: number,      // 习惯设置的积分值
  coins: number,            // 获得金币
  photos: Array,            // 照片URL数组
  remark: string,           // 备注
  createTime: Date,
  _openid: string,         // 用户openid（用于权限控制）
}
*/

/**
 * 6. habit_templates (习惯模板表)
 * 全局共享的模板数据，不需要 _openid
 */
/*
{
  _id: string,
  id: string,              // 模板ID
  name: string,             // 习惯名称
  icon: string,            // 图标emoji
  category: string,        // 分类
  categoryName: string,     // 分类中文名称
  color: string,           // 分类颜色
  points: number,          // 积分值
  order: number,            // 排序
}
*/

/**
 * 7. daily_records (每日记录表)
 */
/*
{
  _id: string,
  childId: string,          // 孩子ID
  date: string,             // 日期 YYYY-MM-DD
  totalPoints: number,      // 当日总积分
  checkInCount: number,     // 打卡次数
  coins: number,            // 当日获得金币
  createTime: Date,
  updateTime: Date,
  _openid: string,         // 用户openid（用于权限控制）
}
*/

/**
 * 8. badges (称号表)
 * 全局共享的称号数据，不需要 _openid
 */
/*
{
  _id: string,
  id: string,              // 称号ID
  name: string,             // 称号名称
  icon: string,            // 图标emoji
  description: string,     // 描述
  condition: string,        // 获得条件说明
  pointsRequired: number,   // 所需积分
  color: string,           // 颜色
  rarity: string,          // 稀有度: common/rare/epic/legendary
  category: string,        // 分类: progress/consistency
  order: number,            // 排序
}
*/

/**
 * 9. rewards (礼物表)
 * 全局共享的礼物数据，不需要 _openid
 */
/*
{
  _id: string,
  id: string,              // 礼物ID
  name: string,            // 礼物名称
  icon: string,            // 图标emoji
  description: string,     // 描述
  coinCost: number,        // 金币成本
  stock: number,           // 库存（-1表示无限）
  category: string,        // 分类: food/entertainment/activity/education/toy
  order: number,           // 排序
}
*/

/**
 * 10. reward_records (礼物兑换记录表)
 */
/*
{
  _id: string,
  childId: string,          // 孩子ID
  rewardId: string,         // 礼物ID
  rewardName: string,       // 礼物名称
  coinCost: number,         // 消耗金币
  status: string,           // 状态: pending/completed/cancelled
  createTime: Date,
  _openid: string,         // 用户openid（用于权限控制）
}
*/

/**
 * 11. user_badges (用户称号表)
 */
/*
{
  _id: string,
  childId: string,          // 孩子ID
  badgeId: string,          // 称号ID
  earnedDate: Date,         // 获得日期
  isCurrent: boolean,       // 是否当前使用
  createTime: Date,
  _openid: string,         // 用户openid（用于权限控制）
}
*/

/**
 * 12. leaderboard (排行榜表)
 */
/*
{
  _id: string,
  childId: string,          // 孩子ID
  childName: string,        // 孩子姓名
  avatar: string,           // 头像
  points: number,           // 积分
  coins: number,            // 金币
  checkInCount: number,     // 总打卡次数
  consecutiveDays: number,  // 连续打卡天数
  updateTime: Date,
  _openid: string,         // 用户openid（用于权限控制）
}
*/


// ========== 初始数据定义 ==========

/**
 * 习惯模板初始数据
 * 全局共享，不需要 _openid
 */
const habitTemplates = [
  // 学习类
  { id: 'study_1', name: '完成作业', icon: '📚', category: 'study', categoryName: '学习', color: '#FF6B6B', points: 5, order: 1 },
  { id: 'study_2', name: '阅读30分钟', icon: '📖', category: 'study', categoryName: '学习', color: '#FF6B6B', points: 3, order: 2 },
  { id: 'study_3', name: '背诵单词', icon: '📝', category: 'study', categoryName: '学习', color: '#FF6B6B', points: 3, order: 3 },
  { id: 'study_4', name: '练字20分钟', icon: '✍️', category: 'study', categoryName: '学习', color: '#FF6B6B', points: 3, order: 4 },
  { id: 'study_5', name: '预习功课', icon: '📕', category: 'study', categoryName: '学习', color: '#FF6B6B', points: 4, order: 5 },
  
  // 生活类
  { id: 'life_1', name: '自己穿衣服', icon: '👕', category: 'life', categoryName: '生活', color: '#4ECDC4', points: 2, order: 6 },
  { id: 'life_2', name: '整理书包', icon: '🎒', category: 'life', categoryName: '生活', color: '#4ECDC4', points: 2, order: 7 },
  { id: 'life_3', name: '整理房间', icon: '🧹', category: 'life', categoryName: '生活', color: '#4ECDC4', points: 3, order: 8 },
  { id: 'life_4', name: '自己吃饭', icon: '🍽️', category: 'life', categoryName: '生活', color: '#4ECDC4', points: 2, order: 9 },
  { id: 'life_5', name: '按时睡觉', icon: '😴', category: 'life', categoryName: '生活', color: '#4ECDC4', points: 3, order: 10 },
  { id: 'life_6', name: '按时起床', icon: '⏰', category: 'life', categoryName: '生活', color: '#4ECDC4', points: 3, order: 11 },
  { id: 'life_7', name: '自己洗澡', icon: '🚿', category: 'life', categoryName: '生活', color: '#4ECDC4', points: 2, order: 12 },
  
  // 运动类
  { id: 'exercise_1', name: '运动30分钟', icon: '🏃', category: 'exercise', categoryName: '运动', color: '#FFE66D', points: 4, order: 13 },
  { id: 'exercise_2', name: '跑步', icon: '🏃‍♂️', category: 'exercise', categoryName: '运动', color: '#FFE66D', points: 4, order: 14 },
  { id: 'exercise_3', name: '跳绳100个', icon: '🪢', category: 'exercise', categoryName: '运动', color: '#FFE66D', points: 3, order: 15 },
  { id: 'exercise_4', name: '做眼保健操', icon: '👀', category: 'exercise', categoryName: '运动', color: '#FFE66D', points: 2, order: 16 },
  { id: 'exercise_5', name: '拉伸运动', icon: '🤸', category: 'exercise', categoryName: '运动', color: '#FFE66D', points: 2, order: 17 },
  
  // 习惯类
  { id: 'habit_1', name: '刷牙', icon: '🦷', category: 'habit', categoryName: '习惯', color: '#A8E6CF', points: 2, order: 18 },
  { id: 'habit_2', name: '洗脸', icon: '🧼', category: 'habit', categoryName: '习惯', color: '#A8E6CF', points: 1, order: 19 },
  { id: 'habit_3', name: '剪指甲', icon: '💅', category: 'habit', categoryName: '习惯', color: '#A8E6CF', points: 2, order: 20 },
  { id: 'habit_4', name: '整理玩具', icon: '🧸', category: 'habit', categoryName: '习惯', color: '#A8E6CF', points: 2, order: 21 },
  { id: 'habit_5', name: '不挑食', icon: '🥗', category: 'habit', categoryName: '习惯', color: '#A8E6CF', points: 3, order: 22 },
  { id: 'habit_6', name: '不玩手机', icon: '📵', category: 'habit', categoryName: '习惯', color: '#A8E6CF', points: 3, order: 23 },
  
  // 社交类
  { id: 'social_1', name: '主动打招呼', icon: '👋', category: 'social', categoryName: '社交', color: '#DDA0DD', points: 2, order: 24 },
  { id: 'social_2', name: '帮助别人', icon: '🤝', category: 'social', categoryName: '社交', color: '#DDA0DD', points: 3, order: 25 },
  { id: 'social_3', name: '说谢谢', icon: '🙏', category: 'social', categoryName: '社交', color: '#DDA0DD', points: 2, order: 26 },
  { id: 'social_4', name: '分享玩具', icon: '🎁', category: 'social', categoryName: '社交', color: '#DDA0DD', points: 3, order: 27 },
  { id: 'social_5', name: '关心家人', icon: '❤️', category: 'social', categoryName: '社交', color: '#DDA0DD', points: 3, order: 28 }
];

/**
 * 称号初始数据
 * 全局共享，不需要 _openid
 */
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

/**
 * 礼物初始数据
 * 全局共享，不需要 _openid
 */
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

/**
 * 初始化习惯模板
 */
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
      
      console.log('习惯模板数据初始化完成，共', habitTemplates.length, '个模板');
    } else {
      console.log('习惯模板数据已存在，跳过初始化');
    }
  } catch (err) {
    console.error('初始化习惯模板失败:', err);
    throw err;
  }
}

/**
 * 初始化称号
 */
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
    throw err;
  }
}

/**
 * 初始化礼物
 */
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
    throw err;
  }
}

/**
 * 执行所有初始化
 */
async function initAll() {
  console.log('========== 开始数据库初始化 ==========');
  
  try {
    await initHabitTemplates();
    await initBadges();
    await initRewards();
    
    console.log('========== 数据库初始化完成 ==========');
  } catch (err) {
    console.error('数据库初始化失败:', err);
    throw err;
  }
}


// ========== 导出 ==========

module.exports = {
  // 数据定义
  habitTemplates,
  badges,
  rewards,
  
  // 初始化函数
  initAll,
  initHabitTemplates,
  initBadges,
  initRewards
};
