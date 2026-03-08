// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 日志配置：生产环境设置为 false
const DEBUG = true;

/**
 * 调试日志 - 仅开发环境输出
 */
function debugLog(...args) {
  if (DEBUG) {
    console.log('[DEBUG]', ...args);
  }
}

/**
 * 错误日志 - 始终输出
 */
function errorLog(...args) {
  console.error('[ERROR]', ...args);
}

// 等级配置
const LEVELS = [
  { level: 1, name: '新手宝宝', points: 0 },
  { level: 2, name: '初学者', points: 10 },
  { level: 3, name: '进步之星', points: 30 },
  { level: 4, name: '小能手', points: 50 },
  { level: 5, name: '努力达人', points: 80 },
  { level: 6, name: '进步达人', points: 120 },
  { level: 7, name: '优秀宝宝', points: 180 },
  { level: 8, name: '小小标兵', points: 250 },
  { level: 9, name: '模范宝宝', points: 350 },
  { level: 10, name: '超级明星', points: 500 },
  { level: 11, name: '优秀标兵', points: 700 },
  { level: 12, name: '进步先锋', points: 900 },
  { level: 13, name: '习惯达人', points: 1200 },
  { level: 14, name: '自律之星', points: 1500 },
  { level: 15, name: '优秀榜样', points: 1900 },
  { level: 16, name: '超级榜样', points: 2400 },
  { level: 17, name: '习惯之王', points: 3000 },
  { level: 18, name: '自律之王', points: 3800 },
  { level: 19, name: '全能之星', points: 4800 },
  { level: 20, name: '习惯大师', points: 6000 }
];

/**
 * 计算等级
 */
function calculateLevel(points) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].points) {
      return LEVELS[i];
    }
  }
  return LEVELS[0];
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { habitId, points, photos, remark, habitPoints } = event;

  if (!habitId) {
    return {
      code: -1,
      message: '参数错误'
    };
  }

  try {
    // 获取习惯信息
    const habitRes = await db.collection('habits').doc(habitId).get();
    if (!habitRes.data) {
      return {
        code: -1,
        message: '习惯不存在'
      };
    }

    const habit = habitRes.data;
    const childId = habit.childId;

    // 使用东八区时间计算今天的日期
    const today = new Date();
    const beijingTimestamp = today.getTime() + (8 * 60 * 60 * 1000); // 东八区 = UTC+8，加8小时
    const beijingTime = new Date(beijingTimestamp);
    const dateStr = `${beijingTime.getFullYear()}-${String(beijingTime.getMonth() + 1).padStart(2, '0')}-${String(beijingTime.getDate()).padStart(2, '0')}`;

    debugLog('云函数检查今日打卡:', { habitId, childId, dateStr });
    debugLog('UTC 时间:', today.toISOString());
    debugLog('东八区时间:', beijingTime.toISOString());

    const checkRes = await db.collection('check_ins').where({
      habitId,
      date: dateStr
    }).get();

    debugLog('查询结果:', checkRes.data.length, '条');

    if (checkRes.data.length > 0) {
      return {
        code: -1,
        message: '今日已打卡'
      };
    }

    // 获取孩子信息
    const childRes = await db.collection('children').doc(childId).get();
    if (!childRes.data) {
      return {
        code: -1,
        message: '孩子不存在'
      };
    }

    const child = childRes.data;
    const oldLevel = child.level;
    const oldPoints = child.points;
    
    // 计算新星星和金币
    const newPoints = oldPoints + points;
    const newCoins = (child.coins || 0) + points; // 1星星 = 1金币
    
    // 计算新等级
    const newLevelInfo = calculateLevel(newPoints);
    const newLevel = newLevelInfo.level;
    const levelName = newLevelInfo.name;

    // 创建打卡记录
    debugLog('准备插入打卡记录:', {
      childId,
      habitId,
      date: dateStr,
      points: points,
      habitPoints: habitPoints || habit.points
    });

    const addRes = await db.collection('check_ins').add({
      data: {
        childId,
        habitId,
        date: dateStr,
        points: points,
        habitPoints: habitPoints || habit.points,
        coins: points,
        photos: photos || [],
        remark: remark || '',
        _openid: wxContext.OPENID,
        createTime: db.serverDate()
      }
    });

    debugLog('打卡记录插入成功，ID:', addRes._id);

    // 更新孩子信息
    await db.collection('children').doc(childId).update({
      data: {
        points: newPoints,
        coins: newCoins,
        level: newLevel,
        updateTime: db.serverDate()
      }
    });

    return {
      code: 0,
      message: '打卡成功',
      data: {
        points: points,
        coins: points,
        oldLevel,
        newLevel,
        levelName: newLevel > oldLevel ? levelName : ''
      }
    };
  } catch (err) {
    errorLog('打卡失败:', err);
    return {
      code: -1,
      message: '打卡失败'
    };
  }
};
