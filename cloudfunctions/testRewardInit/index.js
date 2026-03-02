const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 测试礼物初始化
 * 清理旧数据并重新初始化
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { OPENID } = wxContext;

  try {
    console.log('========== 开始测试礼物初始化 ==========');
    console.log('OPENID:', OPENID);

    // 1. 检查当前用户的礼物数量
    const userRewardsRes = await db.collection('rewards')
      .where({
        _openid: OPENID
      })
      .count();

    console.log('当前用户的礼物数量:', userRewardsRes.total);

    // 2. 检查所有礼物数量
    const allRewardsRes = await db.collection('rewards')
      .limit(100)
      .get();

    console.log('数据库中所有礼物数量:', allRewardsRes.data.length);

    // 3. 分析礼物数据
    const userRewards = allRewardsRes.data.filter(r => r._openid === OPENID);
    const otherRewards = allRewardsRes.data.filter(r => !r._openid || r._openid !== OPENID);

    console.log('属于当前用户的礼物:', userRewards.length);
    console.log('其他用户的礼物（或无_openid的旧数据）:', otherRewards.length);

    if (otherRewards.length > 0) {
      console.log('其他礼物数据:');
      otherRewards.forEach(r => {
        console.log(`  - ID: ${r._id}, Name: ${r.name}, _openid: ${r._openid || '无'}`);
      });
    }

    // 4. 清理没有 _openid 的旧数据（仅当用户确认时）
    if (event.cleanOld && otherRewards.length > 0) {
      console.log('开始清理旧数据...');

      const deletePromises = otherRewards.map(reward => {
        console.log(`删除礼物: ${reward.name} (${reward._id})`);
        return db.collection('rewards').doc(reward._id).remove();
      });

      await Promise.all(deletePromises);
      console.log('清理完成，删除了', otherRewards.length, '条记录');
    }

    // 5. 如果用户没有礼物，初始化默认礼物
    if (userRewardsRes.total === 0) {
      console.log('用户没有礼物，开始初始化默认礼物...');

      const defaultRewards = [
        {
          name: '冰淇淋',
          icon: '🍦',
          description: '美味的冰淇淋',
          cost: 50,
          stock: -1,
          category: 'food',
          order: 1
        },
        {
          name: '动画片时间',
          icon: '📺',
          description: '30分钟动画片',
          cost: 100,
          stock: -1,
          category: 'entertainment',
          order: 2
        },
        {
          name: '公园游玩',
          icon: '🎡',
          description: '去公园玩2小时',
          cost: 150,
          stock: -1,
          category: 'activity',
          order: 3
        },
        {
          name: '故事书',
          icon: '📚',
          description: '一本喜欢的故事书',
          cost: 200,
          stock: -1,
          category: 'education',
          order: 4
        },
        {
          name: '玩具车',
          icon: '🚗',
          description: '一个玩具车',
          cost: 300,
          stock: -1,
          category: 'toy',
          order: 5
        }
      ];

      const insertPromises = defaultRewards.map(reward => {
        return db.collection('rewards').add({
          data: {
            ...reward,
            createTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        });
      });

      await Promise.all(insertPromises);
      console.log('初始化默认礼物成功，共', defaultRewards.length, '条记录');
    }

    // 6. 再次检查结果
    const finalRes = await db.collection('rewards')
      .where({
        _openid: OPENID
      })
      .count();

    console.log('========== 测试完成 ==========');
    console.log('用户最终礼物数量:', finalRes.total);

    return {
      success: true,
      message: '测试完成',
      data: {
        userRewards: userRewards.length,
        otherRewards: otherRewards.length,
        finalCount: finalRes.total
      }
    };
  } catch (error) {
    console.error('测试失败:', error);
    return {
      success: false,
      message: '测试失败',
      error: error.message
    };
  }
};
