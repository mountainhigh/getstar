const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  const { rewardId, rewardData, isEdit } = event
  const { OPENID } = cloud.getWXContext()

  try {
    if (isEdit) {
      // 编辑礼物 - 先检查权限
      const reward = await db.collection('rewards').doc(rewardId).get()
      
      if (!reward.data) {
        return { success: false, error: '礼物不存在' }
      }
      
      if (reward.data._openid !== OPENID) {
        return { success: false, error: '无权修改此礼物' }
      }

      // 更新礼物
      await db.collection('rewards').doc(rewardId).update({
        data: {
          ...rewardData,
          updatedAt: db.serverDate()
        }
      })

      return { success: true }
    } else {
      // 添加新礼物
      const result = await db.collection('rewards').add({
        data: {
          ...rewardData,
          stock: -1, // -1 表示无限库存
          enabled: true,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      })

      return { success: true, id: result._id }
    }
  } catch (error) {
    console.error('保存礼物失败:', error)
    return { success: false, error: error.message }
  }
}
