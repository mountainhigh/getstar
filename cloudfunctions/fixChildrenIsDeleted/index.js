// 云开发：修复孩子数据的 isDeleted 字段
// 为所有没有 isDeleted 字段的孩子记录添加 isDeleted: false

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  try {
    console.log('开始修复 children 集合的 isDeleted 字段')

    // 查询所有孩子记录（限制100条）
    const res = await db.collection('children')
      .limit(100)
      .get()

    console.log('查询到', res.data.length, '条孩子记录')

    let updatedCount = 0
    let skippedCount = 0

    // 遍历所有记录，更新没有 isDeleted 字段的记录
    for (const child of res.data) {
      // 检查是否有 isDeleted 字段
      if (child.isDeleted === undefined || child.isDeleted === null) {
        console.log('更新孩子:', child.name, 'ID:', child._id)

        await db.collection('children')
          .doc(child._id)
          .update({
            data: {
              isDeleted: false,
              updateTime: db.serverDate()
            }
          })

        updatedCount++
      } else {
        skippedCount++
      }
    }

    console.log('修复完成，更新了', updatedCount, '条记录，跳过了', skippedCount, '条记录')

    return {
      success: true,
      message: '修复完成',
      data: {
        total: res.data.length,
        updated: updatedCount,
        skipped: skippedCount
      }
    }
  } catch (err) {
    console.error('修复失败:', err)
    return {
      success: false,
      message: '修复失败',
      error: err.message
    }
  }
}
