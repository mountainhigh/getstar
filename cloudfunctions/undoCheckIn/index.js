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
    const { checkInId } = event;

    if (!checkInId) {
      return {
        success: false,
        message: '缺少打卡记录ID'
      };
    }

    // 查询打卡记录
    const checkInRes = await db.collection('check_ins').doc(checkInId).get();

    if (!checkInRes.data) {
      return {
        success: false,
        message: '打卡记录不存在'
      };
    }

    const checkInRecord = checkInRes.data;

    // 验证权限（只能撤销自己家庭的打卡）
    const userRes = await db.collection('users').where({
      openid: OPENID
    }).get();

    if (userRes.data.length === 0) {
      return {
        success: false,
        message: '用户不存在'
      };
    }

    // 检查是否在24小时内
    const createTime = new Date(checkInRecord.createTime);
    const now = new Date();
    const hoursDiff = (now - createTime) / (1000 * 60 * 60);

    if (hoursDiff > 24) {
      return {
        success: false,
        message: '只能撤销24小时内的打卡'
      };
    }

    // 查询孩子当前星星
    const currentChildRes = await db.collection('children').doc(checkInRecord.childId).get();

    if (!currentChildRes.data) {
      return {
        success: false,
        message: '孩子不存在'
      };
    }

    const currentPoints = currentChildRes.data.points || 0;
    const pointsToDeduct = checkInRecord.points || 0;

    if (currentPoints < pointsToDeduct) {
      return {
        success: false,
        message: '星星不足，无法撤销'
      };
    }

    // 扣减星星
    await db.collection('children').doc(checkInRecord.childId).update({
      data: {
        points: _.inc(-pointsToDeduct),
        coins: _.inc(-pointsToDeduct),
        updateTime: db.serverDate()
      }
    });

    // 删除打卡记录
    await db.collection('check_ins').doc(checkInId).remove();

    // 记录金币变动
    if (pointsToDeduct > 0) {
      await db.collection('coin_records').add({
        data: {
          childId: checkInRecord.childId,
          childName: currentChildRes.data.name,
          familyId: currentChildRes.data.familyId,
          amount: -pointsToDeduct,
          type: 'undo_checkin',
          description: '撤销打卡',
          relatedId: checkInId,
          balanceBefore: currentPoints,
          balanceAfter: currentPoints - pointsToDeduct,
          createTime: db.serverDate()
        }
      });
    }

    console.log('撤销打卡成功:', {
      checkInId,
      childId: checkInRecord.childId,
      pointsDeducted: pointsToDeduct
    });

    return {
      success: true,
      message: '撤销成功',
      data: {
        checkInId,
        childId: checkInRecord.childId,
        pointsDeducted: pointsToDeduct,
        newPoints: currentPoints - pointsToDeduct,
        newCoins: currentPoints - pointsToDeduct
      }
    };

  } catch (error) {
    console.error('撤销打卡失败:', error);
    return {
      success: false,
      message: '撤销打卡失败',
      error: error.message
    };
  }
};
