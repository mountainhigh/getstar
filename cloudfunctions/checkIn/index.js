// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

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

    // 检查今日是否已打卡
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    console.log('云函数检查今日打卡:');
    console.log('habitId:', habitId);
    console.log('childId:', childId);
    console.log('dateStr:', dateStr);
    
    const checkRes = await db.collection('check_ins').where({
      habitId,
      date: dateStr
    }).get();
    
    console.log('云函数查询结果:', checkRes.data.length, '条');
    console.log('云函数查询详细数据:', checkRes.data);
    
    // 同时查询所有 check_ins 记录
    const allCheckIns = await db.collection('check_ins').limit(5).get();
    console.log('云函数：数据库中所有 check_ins 记录（前5条）:', allCheckIns.data);

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
    console.log('准备插入打卡记录:', {
      childId,
      habitId,
      date: dateStr,
      points: points,
      habitPoints: habitPoints || habit.points,
      openid: wxContext.OPENID
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
        createTime: db.serverDate()
      }
    });
    
    console.log('打卡记录插入成功，ID:', addRes._id);
    
    // 验证插入：立即查询刚插入的记录
    const verifyRes = await db.collection('check_ins').doc(addRes._id).get();
    console.log('验证查询结果:', verifyRes.data);

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
    console.error('打卡失败:', err);
    return {
      code: -1,
      message: '打卡失败'
    };
  }
};
