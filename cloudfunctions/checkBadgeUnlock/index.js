// 云函数：检查并解锁称号
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { childId } = event;
  
  if (!childId) {
    return {
      success: false,
      message: '缺少孩子ID'
    };
  }

  try {
    // 1. 获取孩子信息
    const childRes = await db.collection('children').doc(childId).get();
    if (!childRes.data) {
      return {
        success: false,
        message: '孩子不存在'
      };
    }
    const child = childRes.data;

    // 2. 获取总打卡次数
    const totalCheckInsRes = await db.collection('check_ins')
      .where({ childId })
      .count();
    
    const totalCheckIns = totalCheckInsRes.total || 0;

    // 3. 计算连续打卡天数
    const datesRes = await db.collection('check_ins')
      .where({ childId })
      .groupBy('date')
      .field({ date: true })
      .orderBy('date', 'desc')
      .limit(100)
      .get();

    const dates = datesRes.data.map(item => item.date);
    const consecutiveDays = calculateConsecutiveDays(dates);

    // 4. 获取所有称号
    const badgesRes = await db.collection('badges').get();
    const badges = badgesRes.data;

    // 5. 获取用户已获得的称号
    const userBadgesRes = await db.collection('user_badges')
      .where({ childId })
      .get();

    const userBadgesMap = {};
    userBadgesRes.data.forEach(ub => {
      userBadgesMap[ub.badgeId] = ub;
    });

    // 6. 检查哪些称号可以解锁
    const unlockedBadges = [];
    const now = new Date();

    for (const badge of badges) {
      // 跳过已获得的称号
      if (userBadgesMap[badge.id]) {
        continue;
      }

      let shouldUnlock = false;

      if (badge.category === 'progress') {
        // 根据累计打卡次数判断
        const required = parseInt(badge.condition.match(/\d+/)[0]);
        if (totalCheckIns >= required) {
          shouldUnlock = true;
        }
      } else if (badge.category === 'consistency') {
        // 根据连续打卡天数判断
        const required = parseInt(badge.condition.match(/\d+/)[0]);
        if (consecutiveDays >= required) {
          shouldUnlock = true;
        }
      }

      if (shouldUnlock) {
        // 添加解锁记录
        await db.collection('user_badges').add({
          data: {
            childId,
            badgeId: badge.id,
            unlockedAt: now,
            createTime: now
          }
        });

        unlockedBadges.push(badge);
      }
    }

    // 7. 更新孩子星星（可选：解锁称号也可以获得星星）
    if (unlockedBadges.length > 0) {
      const pointsToAdd = unlockedBadges.length * 50; // 每解锁一个称号获得50星星
      await db.collection('children').doc(childId).update({
        data: {
          points: _.inc(pointsToAdd),
          updateTime: now
        }
      });
    }

    return {
      success: true,
      data: {
        unlockedBadges,
        totalCheckIns,
        consecutiveDays
      },
      message: unlockedBadges.length > 0 ? 
        `解锁了 ${unlockedBadges.length} 个新称号！` : 
        '暂时没有新称号可解锁'
    };

  } catch (err) {
    console.error('检查称号解锁失败:', err);
    return {
      success: false,
      message: '检查失败: ' + err.message
    };
  }
};

/**
 * 计算连续打卡天数
 */
function calculateConsecutiveDays(dates) {
  if (dates.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let consecutiveDays = 0;
  let currentDate = new Date(today);

  for (let i = 0; i < dates.length; i++) {
    const dateStr = currentDate.toISOString().split('T')[0];
    
    if (dates.includes(dateStr)) {
      consecutiveDays++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else if (i === 0) {
      // 今天没打卡，检查昨天
      currentDate.setDate(currentDate.getDate() - 1);
      continue;
    } else {
      break;
    }
  }

  return consecutiveDays;
}
