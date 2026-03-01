const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { OPENID } = wxContext;

  console.log('添加习惯模板:', { OPENID, event });

  try {
    const { childId, limit = 10 } = event;

    if (!childId) {
      return {
        success: false,
        message: '缺少孩子ID',
        error: 'childId is required'
      };
    }

    // 查询习惯模板,按order排序
    const templatesRes = await db.collection('habit_templates')
      .orderBy('order', 'asc')
      .limit(limit)
      .get();

    const templates = templatesRes.data;
    console.log('查询到习惯模板:', templates.length, '个');

    if (templates.length === 0) {
      return {
        success: true,
        message: '没有找到习惯模板',
        data: {
          addedCount: 0,
          templates: []
        }
      };
    }

    // 批量添加习惯
    let successCount = 0;
    let failCount = 0;
    const addedHabits = [];

    for (const template of templates) {
      try {
        const result = await db.collection('habits').add({
          data: {
            childId: childId,
            templateId: template._id,
            name: template.name,
            category: template.category,
            categoryName: template.categoryName,
            icon: template.icon,
            color: template.color,
            points: template.points,
            order: template.order,
            isActive: true,
            createTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        });
        console.log('✓ 已添加习惯:', template.name, 'ID:', result._id);
        successCount++;
        addedHabits.push({
          id: result._id,
          name: template.name
        });
      } catch (err) {
        console.error('✗ 添加习惯失败:', template.name, err);
        failCount++;
      }
    }

    console.log(`习惯添加完成: 成功 ${successCount} 个, 失败 ${failCount} 个`);

    return {
      success: true,
      message: `成功添加 ${successCount} 个习惯`,
      data: {
        addedCount: successCount,
        failCount: failCount,
        templates: addedHabits
      }
    };

  } catch (error) {
    console.error('添加习惯模板失败:', error);
    return {
      success: false,
      message: '添加习惯模板失败',
      error: error.message
    };
  }
};
