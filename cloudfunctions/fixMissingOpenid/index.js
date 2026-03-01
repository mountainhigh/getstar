const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  console.log('开始修复缺少 _openid 的记录')

  const tablesToFix = ['check_ins', 'families', 'habits']
  const results = {}

  for (const tableName of tablesToFix) {
    try {
      console.log(`\n========== 处理表: ${tableName} ==========`)

      // 查询所有记录
      const allRecords = await db.collection(tableName).get()
      console.log(`找到 ${allRecords.data.length} 条记录`)

      let fixedCount = 0
      let skippedCount = 0

      // 为每条记录添加 _openid
      for (const record of allRecords.data) {
        if (!record._openid) {
          // 如果记录中有 openid 字段，使用它；否则使用当前用户的 openid
          const openidToUse = record.openid || wxContext.OPENID

          console.log(`修复记录: ${record._id}, 使用 openid: ${openidToUse}`)

          await db.collection(tableName).doc(record._id).update({
            data: {
              _openid: openidToUse
            }
          })

          fixedCount++
        } else {
          skippedCount++
        }
      }

      results[tableName] = {
        total: allRecords.data.length,
        fixed: fixedCount,
        skipped: skippedCount
      }

      console.log(`${tableName} 修复完成: 修复 ${fixedCount} 条, 跳过 ${skippedCount} 条`)

    } catch (error) {
      console.error(`修复 ${tableName} 失败:`, error)
      results[tableName] = {
        error: error.message
      }
    }
  }

  console.log('\n========== 修复结果 ==========')
  console.log(JSON.stringify(results, null, 2))

  return {
    success: true,
    results: results
  }
}
