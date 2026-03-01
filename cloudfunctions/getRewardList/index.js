const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();

  try {
    const { category } = event;

    // 构建查询条件
    const whereCondition = {};
    if (category && category !== 'all') {
      whereCondition.category = category;
    }

    // 查询礼物列表
    const res = await db.collection('rewards')
      .where(whereCondition)
      .orderBy('coinCost', 'asc')
      .get();

    return {
      success: true,
      message: '获取礼物列表成功',
      data: {
        rewards: res.data
      }
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
