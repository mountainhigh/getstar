const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  const { childId, timePeriod } = event
  const { OPENID } = cloud.getWXContext()

  console.log('=== getExchangeHistory 云函数开始 ===')
  console.log('childId:', childId)
  console.log('timePeriod:', timePeriod)
  console.log('OPENID:', OPENID)

  try {
    // 验证孩子是否属于当前用户
    const child = await db.collection('children').doc(childId).get()
    console.log('孩子数据:', child.data)
    
    if (!child.data || child.data._openid !== OPENID) {
      console.log('无权查看此孩子的兑换记录')
      return { success: false, error: '无权查看此孩子的兑换记录' }
    }

    // 计算日期范围
    const now = new Date()
    let startDate = new Date(0)
    
    console.log('当前时间:', now)

    switch (timePeriod) {
      case 'week':
        startDate = new Date(now)
        startDate.setDate(now.getDate() - 7)
        console.log('查询最近7天， startDate:', startDate)
        break
      case 'month':
        startDate = new Date(now)
        startDate.setDate(now.getDate() - 30)
        console.log('查询最近30天， startDate:', startDate)
        break
      case 'all':
      default:
        startDate = new Date(0)
        console.log('查询全部记录')
        break
    }

    // 查询兑换记录
    const exchanges = await db.collection('reward_exchanges')
      .where({
        childId: childId,
        createdAt: _.gte(startDate)
      })
      .orderBy('createdAt', 'desc')
      .get()

    console.log('兑换记录查询成功:', exchanges.data.length, '条记录')
    console.log('原始数据:', JSON.stringify(exchanges.data, null, 2))

    // 获取关联的礼物信息
    const rewardIds = [...new Set(exchanges.data.map(item => item.rewardId))]
    console.log('关联的 rewardIds:', rewardIds)
    let rewardMap = {}

    if (rewardIds.length > 0) {
      const rewards = await db.collection('rewards')
        .where({
          _id: _.in(rewardIds)
        })
        .get()

      console.log('礼物查询成功:', rewards.data.length, '条记录')

      rewardMap = rewards.data.reduce((map, reward) => {
        map[reward._id] = reward
        return map
      }, {})
    }

    // 组装数据
    const exchangeList = exchanges.data.map(item => {
      const reward = rewardMap[item.rewardId] || {}
      
      // 处理日期 - 将 createdAt 转换为字符串再解析
      const createTime = new Date(String(item.createdAt))

      // 使用 UTC 时间 + 8 小时 = 东八区时间
      const utcTimestamp = createTime.getTime()
      const beijingTimestamp = utcTimestamp + (8 * 60 * 60 * 1000)
      const beijingTime = new Date(beijingTimestamp)

      const year = beijingTime.getUTCFullYear()
      const month = beijingTime.getUTCMonth() + 1
      const day = beijingTime.getUTCDate()
      const hours = beijingTime.getUTCHours()
      const minutes = beijingTime.getUTCMinutes()

      // 获取今天的日期（东八区）
      const now = new Date()
      const beijingNow = new Date(now.getTime() + (8 * 60 * 60 * 1000))
      const todayYear = beijingNow.getUTCFullYear()
      const todayMonth = beijingNow.getUTCMonth() + 1
      const todayDay = beijingNow.getUTCDate()

      // 获取昨天的日期（东八区）
      const beijingYesterday = new Date(beijingNow.getTime() - (24 * 60 * 60 * 1000))
      const yesterdayYear = beijingYesterday.getUTCFullYear()
      const yesterdayMonth = beijingYesterday.getUTCMonth() + 1
      const yesterdayDay = beijingYesterday.getUTCDate()

      let dateText = ''
      if (year === todayYear && month === todayMonth && day === todayDay) {
        dateText = '今天'
      } else if (year === yesterdayYear && month === yesterdayMonth && day === yesterdayDay) {
        dateText = '昨天'
      } else {
        dateText = `${month}月${day}日`
      }

      const timeText = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
      const datetime = `${dateText} ${timeText}`

      return {
        _id: item._id,
        rewardName: reward.name || item.rewardName || '未知礼物',
        rewardIcon: reward.icon || item.rewardIcon || '🎁',
        cost: item.coinsUsed || 0,
        date: dateText,
        time: timeText,
        datetime: datetime,
        status: item.status || 'pending',
        statusText: item.status === 'completed' ? '已完成' : '进行中',
        childId: item.childId,
        rewardId: item.rewardId,
        createdAt: item.createdAt
      }
    })

    console.log('最终 exchangeList:', exchangeList.length, '条')
    console.log('=== getExchangeHistory 云函数结束 ===')

    return { success: true, data: exchangeList }
  } catch (error) {
    console.error('查询兑换历史失败:', error)
    console.error('错误堆栈:', error.stack)
    return { success: false, error: error.message }
  }
}
