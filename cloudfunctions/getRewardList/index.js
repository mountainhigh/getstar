const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { OPENID } = wxContext;

  try {
    const { category } = event;
    debug('获取礼物列表, category:', category, 'OPENID:', OPENID);

    // 先检查用户是否有礼物，如果没有则自动初始化
    const countRes = await db.collection('rewards')
      .where({
        _openid: OPENID
      })
      .count();

    debug('用户礼物数量:', countRes.total);

    if (countRes.total === 0) {
      debug('用户没有礼物，开始初始化默认礼物');
      try {
        await cloud.callFunction({
          name: 'initUserRewards'
        });
        debug('默认礼物初始化成功');
      } catch (initError) {
        console.error('初始化默认礼物失败:', initError);
        // 即使初始化失败也继续，返回空列表
      }
    }

    // 查询用户的礼物列表（使用 _openid）
    let query = db.collection('rewards')
      .where({
        _openid: OPENID
      })
      .orderBy('createTime', 'desc');

    if (category && category !== 'all') {
      query = query.where({ category: category });
    }

    const res = await query.get();
    debug('查询结果:', res.data.length, '条记录');

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
