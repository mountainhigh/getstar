const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { rewardId } = event

  console.log('=== 删除礼物云函数开始 ===')
  console.log('rewardId:', rewardId)

  try {
    if (!rewardId) {
      return {
        success: false,
        error: '缺少 rewardId 参数'
      }
    }

    // 获取用户的 OPENID
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID

    console.log('用户 openid:', openid)

    // 先查询该礼物是否属于当前用户
    const rewardRes = await db.collection('rewards')
      .where({
        _id: rewardId,
        _openid: openid
      })
      .get()

    console.log('查询结果:', rewardRes)

    if (!rewardRes.data || rewardRes.data.length === 0) {
      return {
        success: false,
        error: '礼物不存在或无权删除'
      }
    }

    // 删除礼物
    await db.collection('rewards')
      .doc(rewardId)
      .remove()

    console.log('删除成功')

    return {
      success: true,
      message: '删除成功'
    }

  } catch (err) {
    console.error('删除礼物失败:', err)
    return {
      success: false,
      error: err.message || '删除失败'
    }
  }
}
