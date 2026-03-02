const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 初始数据
const habitTemplates = [
  { id: 'study_1', name: '完成作业', icon: '📚', category: 'study', categoryName: '学习', color: '#FF6B6B', points: 5, order: 1 },
  { id: 'study_2', name: '阅读30分钟', icon: '📖', category: 'study', categoryName: '学习', color: '#FF6B6B', points: 3, order: 2 },
  { id: 'study_3', name: '背诵单词', icon: '📝', category: 'study', categoryName: '学习', color: '#FF6B6B', points: 3, order: 3 },
  { id: 'study_4', name: '练字20分钟', icon: '✍️', category: 'study', categoryName: '学习', color: '#FF6B6B', points: 3, order: 4 },
  { id: 'study_5', name: '预习功课', icon: '📕', category: 'study', categoryName: '学习', color: '#FF6B6B', points: 4, order: 5 },
  { id: 'life_1', name: '自己穿衣服', icon: '👕', category: 'life', categoryName: '生活', color: '#4ECDC4', points: 2, order: 6 },
  { id: 'life_2', name: '整理书包', icon: '🎒', category: 'life', categoryName: '生活', color: '#4ECDC4', points: 2, order: 7 },
  { id: 'life_3', name: '整理房间', icon: '🧹', category: 'life', categoryName: '生活', color: '#4ECDC4', points: 3, order: 8 },
  { id: 'life_4', name: '自己吃饭', icon: '🍽️', category: 'life', categoryName: '生活', color: '#4ECDC4', points: 2, order: 9 },
  { id: 'life_5', name: '按时睡觉', icon: '😴', category: 'life', categoryName: '生活', color: '#4ECDC4', points: 3, order: 10 },
  { id: 'life_6', name: '按时起床', icon: '⏰', category: 'life', categoryName: '生活', color: '#4ECDC4', points: 3, order: 11 },
  { id: 'life_7', name: '自己洗澡', icon: '🚿', category: 'life', categoryName: '生活', color: '#4ECDC4', points: 2, order: 12 },
  { id: 'exercise_1', name: '运动30分钟', icon: '🏃', category: 'exercise', categoryName: '运动', color: '#FFE66D', points: 4, order: 13 },
  { id: 'exercise_2', name: '跑步', icon: '🏃‍♂️', category: 'exercise', categoryName: '运动', color: '#FFE66D', points: 4, order: 14 },
  { id: 'exercise_3', name: '跳绳100个', icon: '🪢', category: 'exercise', categoryName: '运动', color: '#FFE66D', points: 3, order: 15 },
  { id: 'exercise_4', name: '做眼保健操', icon: '👀', category: 'exercise', categoryName: '运动', color: '#FFE66D', points: 2, order: 16 },
  { id: 'exercise_5', name: '拉伸运动', icon: '🤸', category: 'exercise', categoryName: '运动', color: '#FFE66D', points: 2, order: 17 },
  { id: 'habit_1', name: '刷牙', icon: '🦷', category: 'habit', categoryName: '习惯', color: '#A8E6CF', points: 2, order: 18 },
  { id: 'habit_2', name: '洗脸', icon: '🧼', category: 'habit', categoryName: '习惯', color: '#A8E6CF', points: 1, order: 19 },
  { id: 'habit_3', name: '剪指甲', icon: '💅', category: 'habit', categoryName: '习惯', color: '#A8E6CF', points: 2, order: 20 },
  { id: 'habit_4', name: '整理玩具', icon: '🧸', category: 'habit', categoryName: '习惯', color: '#A8E6CF', points: 2, order: 21 },
  { id: 'habit_5', name: '不挑食', icon: '🥗', category: 'habit', categoryName: '习惯', color: '#A8E6CF', points: 3, order: 22 },
  { id: 'habit_6', name: '不玩手机', icon: '📵', category: 'habit', categoryName: '习惯', color: '#A8E6CF', points: 3, order: 23 },
  { id: 'social_1', name: '主动打招呼', icon: '👋', category: 'social', categoryName: '社交', color: '#DDA0DD', points: 2, order: 24 },
  { id: 'social_2', name: '帮助别人', icon: '🤝', category: 'social', categoryName: '社交', color: '#DDA0DD', points: 3, order: 25 },
  { id: 'social_3', name: '说谢谢', icon: '🙏', category: 'social', categoryName: '社交', color: '#DDA0DD', points: 2, order: 26 },
  { id: 'social_4', name: '分享玩具', icon: '🎁', category: 'social', categoryName: '社交', color: '#DDA0DD', points: 3, order: 27 },
  { id: 'social_5', name: '关心家人', icon: '❤️', category: 'social', categoryName: '社交', color: '#DDA0DD', points: 3, order: 28 }
];

const badges = [
  { id: 'badge_001', name: '初出茅庐', icon: '🌱', description: '刚开始养成习惯的小朋友', condition: '完成1次打卡', pointsRequired: 0, color: '#95EC69', rarity: 'common', category: 'progress', order: 1 },
  { id: 'badge_002', name: '习惯小达人', icon: '🌟', description: '已经养成了一些好习惯', condition: '累计打卡10次', pointsRequired: 100, color: '#FFD700', rarity: 'common', category: 'progress', order: 2 },
  { id: 'badge_003', name: '坚持不懈', icon: '💪', description: '连续7天打卡', condition: '连续打卡7天', pointsRequired: 200, color: '#FF6B6B', rarity: 'rare', category: 'consistency', order: 3 },
  { id: 'badge_004', name: '习惯养成大师', icon: '🏆', description: '累计打卡30次', condition: '累计打卡30次', pointsRequired: 500, color: '#9B59B6', rarity: 'rare', category: 'progress', order: 4 },
  { id: 'badge_005', name: '超级习惯王', icon: '👑', description: '累计打卡100次', condition: '累计打卡100次', pointsRequired: 1500, color: '#E74C3C', rarity: 'epic', category: 'progress', order: 5 },
  { id: 'badge_006', name: '坚持到底', icon: '🔥', description: '连续30天打卡', condition: '连续打卡30天', pointsRequired: 1000, color: '#F39C12', rarity: 'epic', category: 'consistency', order: 6 },
  { id: 'badge_007', name: '习惯传奇', icon: '⭐', description: '累计打卡300次', condition: '累计打卡300次', pointsRequired: 5000, color: '#3498DB', rarity: 'legendary', category: 'progress', order: 7 },
  { id: 'badge_008', name: '终极习惯大师', icon: '💎', description: '累计打卡500次', condition: '累计打卡500次', pointsRequired: 10000, color: '#2ECC71', rarity: 'legendary', category: 'progress', order: 8 }
];

const rewards = [
  { id: 'reward_001', name: '冰淇淋', icon: '🍦', description: '美味的冰淇淋', coinCost: 50, stock: -1, category: 'food', order: 1 },
  { id: 'reward_002', name: '动画片时间', icon: '📺', description: '30分钟动画片', coinCost: 100, stock: -1, category: 'entertainment', order: 2 },
  { id: 'reward_003', name: '公园游玩', icon: '🎡', description: '去公园玩2小时', coinCost: 150, stock: -1, category: 'activity', order: 3 },
  { id: 'reward_004', name: '故事书', icon: '📚', description: '一本喜欢的故事书', coinCost: 200, stock: -1, category: 'education', order: 4 },
  { id: 'reward_005', name: '玩具车', icon: '🚗', description: '一辆玩具车', coinCost: 500, stock: -1, category: 'toy', order: 5 },
  { id: 'reward_006', name: '绘画套装', icon: '🎨', description: '绘画用品套装', coinCost: 300, stock: -1, category: 'education', order: 6 },
  { id: 'reward_007', name: '游乐园门票', icon: '🎢', description: '游乐园一日游', coinCost: 1000, stock: -1, category: 'activity', order: 7 },
  { id: 'reward_008', name: '新自行车', icon: '🚲', description: '一辆新自行车', coinCost: 5000, stock: -1, category: 'toy', order: 8 }
];

// 需要初始化的表（全局共享数据，不需要 _openid）
const globalTablesToInit = [
  { name: 'habit_templates', data: habitTemplates },
  { name: 'badges', data: badges }
  // 注意：rewards 已移除，改由 initUserRewards 云函数为每个用户单独初始化
];

// 需要初始化的用户相关表（需要 _openid）
// 这些表不需要初始数据,只需要创建表结构
const userTablesToInit = [
  'users',          // 用户表
  'families',       // 家庭表
  'children',        // 孩子表
  'habits',          // 习惯表
  'check_ins',       // 打卡记录表
  'daily_records',   // 每日记录表
  'reward_exchanges', // 奖品兑换表
  'user_badges',     // 用户称号表
  'leaderboard'      // 排行榜表
];

async function initTable(tableName, data) {
  try {
    console.log(`[initTable] 开始处理表 ${tableName}...`);

    // 检查表是否已有数据（使用 count 方法避免集合不存在时抛错）
    let hasData = false;
    let collectionExists = false;

    try {
      const countRes = await db.collection(tableName).count();
      collectionExists = true;
      hasData = countRes.total > 0;
      console.log(`[initTable] ${tableName} 表当前记录数: ${countRes.total}`);
    } catch (checkErr) {
      // 表不存在，需要创建
      console.log(`[initTable] ${tableName} 表不存在，需要先创建集合`);
      collectionExists = false;
      hasData = false;
    }

    // 集合必须通过 MCP 工具或控制台手动创建，云函数无法创建集合
    if (!collectionExists) {
      console.error(`[initTable] ${tableName} 集合不存在！请先通过 MCP 工具或控制台创建集合`);
      return { success: false, error: `集合不存在，请先创建集合` };
    }

    if (!hasData) {
      console.log(`[initTable] 开始初始化 ${tableName} 表，准备插入 ${data.length} 条数据...`);

      // 批量插入数据
      let successCount = 0;
      for (const item of data) {
        try {
          const result = await db.collection(tableName).add({
            data: item
          });
          console.log(`[initTable] ${tableName} 插入记录成功: ${result._id}, 数据: ${item.name || item.id}`);
          successCount++;
        } catch (insertErr) {
          console.error(`[initTable] ${tableName} 插入记录失败:`, insertErr);
          console.error(`[initTable] 失败的数据:`, item);
          throw insertErr;
        }
      }

      console.log(`[initTable] ${tableName} 表初始化完成，成功插入 ${successCount}/${data.length} 条记录`);
      return { success: true, count: successCount };
    } else {
      console.log(`[initTable] ${tableName} 表已有数据，跳过初始化`);
      return { success: true, count: 0, skipped: true };
    }
  } catch (err) {
    console.error(`[initTable] 初始化 ${tableName} 表失败:`, err);
    console.error(`[initTable] 错误类型:`, err.name);
    console.error(`[initTable] 错误消息:`, err.message);
    console.error(`[initTable] 错误堆栈:`, err.stack);
    return { success: false, error: err.message };
  }
}

// 初始化用户相关表（只创建表结构，不插入数据）
async function initUserTable(tableName) {
  try {
    console.log(`[initUserTable] 开始处理用户表 ${tableName}...`);

    // 检查表是否存在
    try {
      const countRes = await db.collection(tableName).count();
      console.log(`[initUserTable] ${tableName} 表已存在，当前记录数: ${countRes.total}`);
      return { success: true, count: countRes.total, exists: true };
    } catch (checkErr) {
      // 表不存在，需要创建
      console.log(`[initUserTable] ${tableName} 表不存在！请先通过 MCP 工具或控制台创建集合`);
      return { success: false, error: `集合不存在，请先创建集合` };
    }
  } catch (err) {
    console.error(`[initUserTable] 初始化用户表 ${tableName} 失败:`, err);
    console.error(`[initUserTable] 错误类型:`, err.name);
    console.error(`[initUserTable] 错误消息:`, err.message);
    return { success: false, error: err.message };
  }
}

exports.main = async (event, context) => {
  const { drop = false } = event;
  const wxContext = cloud.getWXContext();

  console.log('========== 开始数据库初始化 ==========');
  console.log('调用者 OPENID:', wxContext.OPENID);
  console.log('drop 参数:', drop);

  if (drop) {
    console.log('⚠️  注意：drop=true，将清空并重新初始化表数据');
  }

  const results = {};

  // 1. 初始化全局共享表（有初始数据）
  console.log('\n### 第一步: 初始化全局共享表 ###');
  for (const table of globalTablesToInit) {
    console.log(`\n--- 处理表: ${table.name} ---`);
    console.log(`准备插入 ${table.data.length} 条数据`);

    if (drop) {
      try {
        // 删除表中的所有数据
        console.log(`清空表 ${table.name}...`);
        const allRecords = await db.collection(table.name).get();
        console.log(`找到 ${allRecords.data.length} 条旧记录`);

        for (const record of allRecords.data) {
          await db.collection(table.name).doc(record._id).remove();
          console.log(`删除记录: ${record._id}`);
        }

        console.log(`表 ${table.name} 已清空 ${allRecords.data.length} 条记录`);

        // 重新初始化
        const result = await initTable(table.name, table.data);
        console.log(`${table.name} 初始化结果:`, result);
        results[table.name] = result;
      } catch (err) {
        console.error(`清空并重新初始化表 ${table.name} 失败:`, err);
        console.error(`错误详情:`, err.message);
        results[table.name] = { success: false, error: err.message };
      }
    } else {
      const result = await initTable(table.name, table.data);
      console.log(`${table.name} 初始化结果:`, result);
      results[table.name] = result;
    }
  }

  // 2. 初始化用户相关表（只创建表结构）
  console.log('\n### 第二步: 初始化用户相关表（创建表结构）###');
  const userResults = {};
  for (const tableName of userTablesToInit) {
    console.log(`\n--- 处理用户表: ${tableName} ---`);
    const result = await initUserTable(tableName);
    console.log(`${tableName} 初始化结果:`, result);
    userResults[tableName] = result;
  }

  console.log('\n========== 数据库初始化完成 ==========');
  console.log('全局表结果:', JSON.stringify(results, null, 2));
  console.log('用户表结果:', JSON.stringify(userResults, null, 2));

  // 返回结果
  return {
    success: true,
    message: '数据库初始化完成',
    data: {
      globalTables: results,
      userTables: userResults
    }
  };
}
