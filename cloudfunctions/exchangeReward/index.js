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
    const { rewardId, childId } = event;

    if (!rewardId || !childId) {
      return {
        success: false,
        message: '缺少必要参数'
      };
    }

    // 查询用户信息
    const userRes = await db.collection('users').where({
      _openid: OPENID
    }).get();

    if (userRes.data.length === 0) {
      return {
        success: false,
        message: '用户不存在'
      };
    }

    const user = userRes.data[0];

    // 查询孩子信息
    const childRes = await db.collection('children').doc(childId).get();

    if (!childRes.data) {
      return {
        success: false,
        message: '孩子不存在'
      };
    }

    const child = childRes.data;

    // 验证孩子是否属于当前用户家庭
    if (child.familyId !== user.familyId) {
      return {
        success: false,
        message: '无权操作此孩子'
      };
    }

    // 查询礼物信息
    const rewardRes = await db.collection('rewards').doc(rewardId).get();

    if (!rewardRes.data) {
      return {
        success: false,
        message: '礼物不存在'
      };
    }

    const reward = rewardRes.data;

    // 检查金币是否足够
    const currentCoins = child.coins || 0;

    if (currentCoins < reward.coinCost) {
      return {
        success: false,
        message: `金币不足，还需要${reward.coinCost - currentCoins}金币`,
        data: {
          required: reward.coinCost,
          current: currentCoins
        }
      };
    }

    // 扣减金币
    await db.collection('children').doc(childId).update({
      data: {
        coins: _.inc(-reward.coinCost),
        updateTime: db.serverDate()
      }
    });

    // 创建兑换记录
    const exchangeRes = await db.collection('reward_exchanges').add({
      data: {
        childId: childId,
        childName: child.name,
        rewardId: rewardId,
        rewardName: reward.name,
        rewardIcon: reward.icon,
        coinCost: reward.coinCost,
        status: 'pending', // pending | completed
        createTime: db.serverDate()
      }
    });

    // 记录金币变动
    await db.collection('coin_records').add({
      data: {
        childId: childId,
        childName: child.name,
        familyId: user.familyId,
        amount: -reward.coinCost,
        type: 'exchange',
        description: `兑换礼物：${reward.name}`,
        relatedId: exchangeRes._id,
        balanceBefore: currentCoins,
        balanceAfter: currentCoins - reward.coinCost,
        createTime: db.serverDate()
      }
    });

    console.log('礼物兑换成功:', {
      childId,
      childName: child.name,
      rewardName: reward.name,
      coinCost: reward.coinCost
    });

    return {
      success: true,
      message: '兑换成功',
      data: {
        exchangeId: exchangeRes._id,
        childId,
        rewardName: reward.name,
        coinCost: reward.coinCost,
        remainingCoins: currentCoins - reward.coinCost
      }
    };

  } catch (error) {
    console.error('兑换礼物失败:', error);
    return {
      success: false,
      message: '兑换礼物失败',
      error: error.message
    };
  }
};
