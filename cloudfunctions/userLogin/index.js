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
    const userRes = await db.collection('users').where({
      openid: OPENID
    }).get();

    let userId;
    let isNewUser = false;

    if (userRes.data.length === 0) {
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
      userId = userRes.data[0]._id;

      const updateData = {
        loginCount: db.command.inc(1),
        lastLoginTime: db.serverDate(),
        updateTime: db.serverDate()
      };

      if (event.nickname && event.nickname !== userRes.data[0].nickname) {
        updateData.nickname = event.nickname;
        updateData.avatar = event.avatar || userRes.data[0].avatar;
      }

      await db.collection('users').doc(userId).update({
        data: updateData
      });

      console.log('用户登录信息更新成功:', userId);
    }

    const familyMemberRes = await db.collection('family_members').where({
      userId: userId,
      status: 'active'
    }).get();

    let familyId = userRes.data[0]?.familyId || null;
    let hasFamily = familyMemberRes.data.length > 0;

    if (!hasFamily) {
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

      await db.collection('family_members').add({
        data: {
          familyId: familyId,
          userId: userId,
          role: 'owner',
          status: 'active',
          joinTime: db.serverDate(),
          invitedBy: null,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      });
      console.log('用户-家庭关系创建成功 (owner)');

      await db.collection('users').doc(userId).update({
        data: {
          familyId: familyId
        }
      });
      console.log('新用户 familyId 更新成功:', userId, familyId);

      hasFamily = true;
    } else {
      if (!familyId && familyMemberRes.data.length > 0) {
        familyId = familyMemberRes.data[0].familyId;
        await db.collection('users').doc(userId).update({
          data: {
            familyId: familyId
          }
        });
        console.log('用户 familyId 已同步:', familyId);
      }
      console.log('家庭已存在:', familyId);
    }

    const childrenRes = await db.collection('children').where({
      familyId: familyId
    }).count();

    const childrenCount = childrenRes.total;

    const templatesRes = await db.collection('habit_templates')
      .orderBy('order', 'asc')
      .get();

    const userFamilies = [];
    if (hasFamily) {
      for (const member of familyMemberRes.data) {
        const familyInfoRes = await db.collection('families').doc(member.familyId).get();
        if (familyInfoRes.data) {
          userFamilies.push({
            familyId: member.familyId,
            familyName: familyInfoRes.data.name,
            role: member.role,
            isCurrent: member.familyId === familyId
          });
        }
      }
    }

    return {
      success: true,
      message: '登录成功',
      data: {
        userId: userId,
        openid: OPENID,
        unionid: UNIONID || null,
        isNewUser: isNewUser,
        familyId: familyId,
        hasFamily: hasFamily,
        childrenCount: childrenCount,
        habitTemplates: isNewUser ? templatesRes.data : [],
        userFamilies: userFamilies,
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
