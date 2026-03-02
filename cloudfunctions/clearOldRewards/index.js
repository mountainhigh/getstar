const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 清理没有 _openid 的旧礼物数据
 * 仅在开发环境使用
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { OPENID } = wxContext;

  try {
    console.log('开始清理旧礼物数据, OPENID:', OPENID);

    // 查询所有没有 _openid 的礼物
    const res = await db.collection('rewards')
      .limit(100)
      .get();

    console.log('查询到', res.data.length, '条礼物记录');

    if (res.data.length === 0) {
      return {
        success: true,
        message: '没有需要清理的旧数据',
        data: { count: 0 }
      };
    }

    // 过滤出没有 _openid 的记录
    const oldRewards = res.data.filter(r => !r._openid);
    console.log('需要清理的旧记录:', oldRewards.length, '条');

    // 删除旧记录
    const deletePromises = oldRewards.map(reward => {
      return db.collection('rewards').doc(reward._id).remove();
    });

    await Promise.all(deletePromises);

    console.log('清理完成，删除了', oldRewards.length, '条记录');

    return {
      success: true,
      message: '清理完成',
      data: {
        total: res.data.length,
        deleted: oldRewards.length
      }
    };
  } catch (error) {
    console.error('清理旧数据失败:', error);
    return {
      success: false,
      message: '清理失败',
      error: error.message
    };
  }
};
