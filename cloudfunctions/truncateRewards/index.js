const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  try {
    console.log('开始清空 rewards 表...');

    // 获取所有记录
    const getAllRes = await db.collection('rewards').get();
    const allRecords = getAllRes.data;

    console.log(`找到 ${allRecords.length} 条记录`);

    // 删除所有记录
    const deletePromises = allRecords.map(record => {
      return db.collection('rewards').doc(record._id).remove();
    });

    await Promise.all(deletePromises);

    console.log(`已删除 ${allRecords.length} 条记录`);

    return {
      success: true,
      data: {
        deletedCount: allRecords.length
      }
    };
  } catch (err) {
    console.error('清空表失败:', err);
    return {
      success: false,
      error: err.message
    };
  }
};
