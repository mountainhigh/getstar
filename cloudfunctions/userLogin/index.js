const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { OPENID, APPID, UNIONID } = wxContext;

  console.log('用户登录:', { OPENID, APPID, UNIONID });

  try {
    // 1. 查询用户是否已存在（使用 openid 字段）
    const userRes = await db.collection('users').where({
      openid: OPENID
    }).get();

    let userId;
    let isNewUser = false;

    if (userRes.data.length === 0) {
      // 2. 新用户，创建用户记录（使用微信昵称）
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
      // 3. 老用户，更新登录信息（如果传入了微信昵称则更新）
      userId = userRes.data[0]._id;

      const updateData = {
        loginCount: db.command.inc(1),
        lastLoginTime: db.serverDate(),
        updateTime: db.serverDate()
      };

      // 如果传入了微信昵称且与当前不一致，则更新昵称和头像
      if (event.nickname && event.nickname !== userRes.data[0].nickname) {
        updateData.nickname = event.nickname;
        updateData.avatar = event.avatar || userRes.data[0].avatar;
      }

      await db.collection('users').doc(userId).update({
        data: updateData
      });

      console.log('用户登录信息更新成功:', userId);
    }

    // 4. 查询用户是否已有家庭（通过 ownerId 关联）
    const familyRes = await db.collection('families').where({
      ownerId: userId
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

    // 7. 获取习惯模板
    const templatesRes = await db.collection('habit_templates')
      .orderBy('order', 'asc')
      .get();

    // 8. 返回用户信息（首次登录返回模板）
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
        habitTemplates: isNewUser ? templatesRes.data : [],
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


