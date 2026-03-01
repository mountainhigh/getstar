const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const tables = ['check_ins', 'children', 'habits', 'users', 'rewards', 'families', 'reward_records', 'leaderboard']
  const stats = {}
  let totalRecords = 0

  console.log('开始查询数据库统计')

  for (const tableName of tables) {
    try {
      const res = await db.collection(tableName).count()
      stats[tableName] = res.total
      totalRecords += res.total
      console.log(`${tableName}: ${res.total} 条`)
    } catch (err) {
      console.error(`查询 ${tableName} 失败:`, err)
      stats[tableName] = '查询失败'
    }
  }

  console.log('查询完成，总计:', totalRecords)

  return {
    success: true,
    stats: stats,
    totalRecords: totalRecords
  }
}
