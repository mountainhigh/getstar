const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { OPENID } = wxContext;

  try {
    const { category, familyId } = event;
    
    // 检查familyId参数
    if (!familyId) {
      return {
        success: false,
        message: '缺少familyId参数'
      };
    }
    
    console.log('获取礼物列表, category:', category, 'familyId:', familyId);

    // 先检查家庭是否有礼物，如果没有则自动初始化
    const countRes = await db.collection('rewards')
      .where({
        familyId: familyId
      })
      .count();

    console.log('家庭礼物数量:', countRes.total);

    if (countRes.total === 0) {
      console.log('家庭没有礼物，开始初始化默认礼物');
      try {
        await cloud.callFunction({
          name: 'initUserRewards',
          data: {
            familyId: familyId
          }
        });
        console.log('默认礼物初始化成功');
      } catch (initError) {
        console.error('初始化默认礼物失败:', initError);
        // 即使初始化失败也继续，返回空列表
      }
    }

    // 查询家庭的礼物列表（使用 familyId）
    let query = db.collection('rewards')
      .where({
        familyId: familyId
      })
      .orderBy('createTime', 'desc');

    if (category && category !== 'all') {
      query = query.where({ category: category });
    }

    const res = await query.get();
    console.log('查询结果:', res.data.length, '条记录');

    return {
      success: true,
      message: '获取礼物列表成功',
      data: res.data
    };

  } catch (error) {
    console.error('获取礼物列表失败:', error);
    return {
      success: false,
      message: '获取礼物列表失败',
      error: error.message
    };
  }
};
