const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  console.log('开始修复 check_ins 表的 _openid 字段')
  
  try {
    // 1. 查询所有没有 _openid 的 check_ins 记录
    const allRecords = await db.collection('check_ins').get()
    console.log(`找到 ${allRecords.data.length} 条记录`)
    
    let fixedCount = 0
    
    // 2. 为每条记录添加 _openid
    for (const record of allRecords.data) {
      if (!record._openid) {
        console.log(`修复记录: ${record._id}`)
        
        await db.collection('check_ins').doc(record._id).update({
          data: {
            _openid: wxContext.OPENID
          }
        })
        
        fixedCount++
      }
    }
    
    console.log(`修复完成，共修复 ${fixedCount} 条记录`)
    
    return {
      success: true,
      totalRecords: allRecords.data.length,
      fixedCount: fixedCount
    }
    
  } catch (error) {
    console.error('修复失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
