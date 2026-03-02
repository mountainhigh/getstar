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
    
    console.log('=== 兑换礼物开始 ===');
    console.log('传入参数:', { rewardId, childId, OPENID });

    if (!rewardId || !childId) {
      return {
        success: false,
        message: '缺少必要参数'
      };
    }

    // 查询用户信息（使用 openid 字段，与 userLogin 保持一致）
    const userRes = await db.collection('users').where({
      openid: OPENID
    }).get();
    
    console.log('用户查询结果:', userRes.data.length, '条');
    console.log('用户数据:', JSON.stringify(userRes.data[0]));

    if (userRes.data.length === 0) {
      return {
        success: false,
        message: '用户不存在'
      };
    }

    const user = userRes.data[0];
    
    // 从 families 集合查询用户的家庭
    const familyRes = await db.collection('families').where({
      ownerId: user._id
    }).get();
    
    let userFamilyId = null;
    if (familyRes.data.length > 0) {
      userFamilyId = familyRes.data[0]._id;
    }
    
    console.log('用户 _id:', user._id);
    console.log('用户家庭查询结果:', familyRes.data.length, '条');
    console.log('用户 familyId:', userFamilyId);

    // 查询孩子信息
    const childRes = await db.collection('children').doc(childId).get();
    
    console.log('孩子查询结果:', childRes.data ? '找到' : '未找到');
    console.log('孩子数据:', JSON.stringify(childRes.data));

    if (!childRes.data) {
      return {
        success: false,
        message: '孩子不存在'
      };
    }

    const child = childRes.data;
    console.log('孩子 familyId:', child.familyId);

    // 验证孩子是否属于当前用户家庭
    console.log('权限验证:', {
      'userFamilyId': userFamilyId,
      'child.familyId': child.familyId,
      '是否相等': child.familyId === userFamilyId
    });
    
    if (child.familyId !== userFamilyId) {
      return {
        success: false,
        message: '无权操作此孩子',
        debug: {
          userId: user._id,
          userFamilyId: userFamilyId,
          childFamilyId: child.familyId
        }
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

    // 检查金币是否足够 - 统一使用 cost 字段
    const currentCoins = child.coins || 0;
    const coinCost = reward.cost || reward.coinCost || reward.coinsRequired || 0;

    if (currentCoins < coinCost) {
      return {
        success: false,
        message: `金币不足，还需要${coinCost - currentCoins}金币`,
        data: {
          required: coinCost,
          current: currentCoins
        }
      };
    }

    // 扣减金币
    await db.collection('children').doc(childId).update({
      data: {
        coins: _.inc(-coinCost),
        updatedAt: db.serverDate()
      }
    });

    // 创建兑换记录
    const exchangeRes = await db.collection('reward_exchanges').add({
      data: {
        childId: childId,
        childName: child.name,
        familyId: userFamilyId,
        rewardId: rewardId,
        rewardName: reward.name,
        rewardIcon: reward.icon,
        coinsUsed: coinCost,
        status: 'pending',
        exchangedAt: Date.now(),
        createdAt: db.serverDate()
      }
    });

    // 记录金币变动
    await db.collection('coin_records').add({
      data: {
        childId: childId,
        familyId: userFamilyId,
        type: 'spend',
        amount: -coinCost,
        source: `兑换礼物：${reward.name}`,
        relatedId: exchangeRes._id,
        coinsBefore: currentCoins,
        coinsAfter: currentCoins - coinCost,
        createdAt: db.serverDate()
      }
    });

    console.log('礼物兑换成功:', {
      childId,
      childName: child.name,
      rewardName: reward.name,
      coinCost: coinCost
    });

    return {
      success: true,
      message: '兑换成功',
      data: {
        exchangeId: exchangeRes._id,
        childId,
        rewardName: reward.name,
        coinCost: coinCost,
        remainingCoins: currentCoins - coinCost
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
