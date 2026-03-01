const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { OPENID } = wxContext;

  console.log('获取习惯模板:', { OPENID, event });

  try {
    const { limit = 100 } = event;

    // 查询所有习惯模板，按order排序
    const templatesRes = await db.collection('habit_templates')
      .orderBy('order', 'asc')
      .limit(limit)
      .get();

    const templates = templatesRes.data;
    console.log('查询到习惯模板:', templates.length, '个');

    return {
      success: true,
      message: `成功加载 ${templates.length} 个习惯模板`,
      data: templates
    };

  } catch (error) {
    console.error('获取习惯模板失败:', error);
    return {
      success: false,
      message: '获取习惯模板失败',
      error: error.message
    };
  }
};
