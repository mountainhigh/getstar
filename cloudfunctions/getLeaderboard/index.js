const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { OPENID } = wxContext;

  try {
    const { period = 'total' } = event; // period: 'week' | 'month' | 'total'

    // 查询用户家庭ID
    const userRes = await db.collection('users').where({
      _openid: OPENID
    }).get();

    if (userRes.data.length === 0) {
      return {
        success: false,
        message: '用户不存在'
      };
    }

    const familyId = userRes.data[0].familyId;

    // 计算时间范围
    let startDate;
    const now = new Date();

    if (period === 'week') {
      // 本周
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      startDate = new Date(now.getFullYear(), now.getMonth(), diff);
    } else if (period === 'month') {
      // 本月
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      // 总榜
      startDate = new Date(0);
    }

    // 查询家庭中所有孩子
    const childrenRes = await db.collection('children').where({
      familyId: familyId
    }).get();

    if (childrenRes.data.length === 0) {
      return {
        success: true,
        data: {
          leaderboard: []
        }
      };
    }

    // 为每个孩子计算星星
    const leaderboard = [];

    for (const child of childrenRes.data) {
      // 查询该孩子的打卡记录
      const checkInRes = await db.collection('check_in_records').where({
        childId: child._id,
        createTime: _.gte(startDate)
      }).get();

      // 计算总星星
      const totalPoints = checkInRes.data.reduce((sum, record) => {
        return sum + (record.points || 0);
      }, 0);

      // 查询打卡次数
      const checkInCount = checkInRes.data.length;

      // 查询连续打卡天数（简化版）
      const consecutiveDays = await calculateConsecutiveDays(child._id);

      leaderboard.push({
        childId: child._id,
        childName: child.name,
        avatar: child.avatar,
        totalPoints: totalPoints,
        checkInCount: checkInCount,
        consecutiveDays: consecutiveDays,
        rank: 0 // 稍后计算
      });
    }

    // 按星星降序排序
    leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);

    // 分配排名
    leaderboard.forEach((item, index) => {
      item.rank = index + 1;
    });

    return {
      success: true,
      message: '获取排行榜成功',
      data: {
        period: period,
        leaderboard: leaderboard
      }
    };

  } catch (error) {
    console.error('获取排行榜失败:', error);
    return {
      success: false,
      message: '获取排行榜失败',
      error: error.message
    };
  }
};

// 计算连续打卡天数
async function calculateConsecutiveDays(childId) {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 查询最近30天的打卡记录
    const startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const checkInRes = await db.collection('check_in_records').where({
      childId: childId,
      createTime: _.gte(startDate)
    }).get();

    // 获取所有打卡日期
    const dates = checkInRes.data.map(record => {
      const recordDate = new Date(record.createTime);
      return new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());
    });

    // 去重并排序
    const uniqueDates = [...new Set(dates.map(d => d.getTime()))]
      .map(t => new Date(t))
      .sort((a, b) => b - a);

    // 计算连续天数
    let consecutiveDays = 0;
    let currentDate = new Date(today);

    for (const date of uniqueDates) {
      const diffDays = Math.floor((currentDate - date) / (24 * 60 * 60 * 1000));

      if (diffDays <= 1) {
        consecutiveDays++;
        currentDate = new Date(date.getTime() - 24 * 60 * 60 * 1000);
      } else {
        break;
      }
    }

    return consecutiveDays;
  } catch (err) {
    console.error('计算连续打卡天数失败:', err);
    return 0;
  }
}
