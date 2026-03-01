const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { OPENID, APPID, UNIONID } = wxContext;

  console.log('用户登录:', { OPENID, APPID, UNIONID });

  try {
    // 1. 查询用户是否已存在
    const userRes = await db.collection('users').where({
      _openid: OPENID
    }).get();

    let userId;
    let isNewUser = false;

    if (userRes.data.length === 0) {
      // 2. 新用户，创建用户记录
      const userResult = await db.collection('users').add({
        data: {
          openid: OPENID,
          unionid: UNIONID || null,
          appid: APPID,
          nickname: event.nickname || `用户${OPENID.substring(0, 6)}`,
          avatar: event.avatar || '',
          createTime: db.serverDate(),
          updateTime: db.serverDate(),
          status: 'active',
          loginCount: 1,
          lastLoginTime: db.serverDate()
        }
      });

      userId = userResult._id || userResult.id || userResult.data?._id;
      isNewUser = true;

      console.log('新用户创建成功:', userId);
    } else {
      // 3. 老用户，更新登录信息
      userId = userRes.data[0]._id;

      await db.collection('users').doc(userId).update({
        data: {
          nickname: event.nickname || userRes.data[0].nickname,
          avatar: event.avatar || userRes.data[0].avatar,
          loginCount: db.command.inc(1),
          lastLoginTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      });

      console.log('用户登录信息更新成功:', userId);
    }

    // 4. 查询用户是否已有家庭
    const familyRes = await db.collection('families').where({
      _openid: OPENID
    }).get();

    let familyId;

    if (familyRes.data.length === 0) {
      // 5. 新用户自动创建家庭
      const familyResult = await db.collection('families').add({
        data: {
          name: event.familyName || '我的家庭',
          ownerId: userId,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      });

      familyId = familyResult._id || familyResult.id || familyResult.data?._id;
      console.log('家庭创建成功:', familyId);
    } else {
      familyId = familyRes.data[0]._id;
      console.log('家庭已存在:', familyId);
    }

    // 6. 获取家庭中的孩子数量
    const childrenRes = await db.collection('children').where({
      familyId: familyId
    }).count();

    const childrenCount = childrenRes.total;

    // 7. 返回用户信息
    return {
      success: true,
      message: '登录成功',
      data: {
        userId: userId,
        openid: OPENID,
        unionid: UNIONID || null,
        isNewUser: isNewUser,
        familyId: familyId,
        hasFamily: true,
        childrenCount: childrenCount,
        loginTime: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('登录失败:', error);
    return {
      success: false,
      message: '登录失败',
      error: error.message
    };
  }
};
