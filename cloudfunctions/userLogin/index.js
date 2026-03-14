/**
 * 用户登录云函数
 * 功能：处理用户登录、注册，管理用户-家庭关系
 * 支持一个家庭加入多个用户的需求
 */
const cloud = require('wx-server-sdk');

// 初始化云环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 云函数主入口
 * @param {Object} event - 事件参数
 * @param {string} event.nickname - 用户昵称
 * @param {string} event.avatar - 用户头像
 * @param {string} event.familyName - 家庭名称（新用户创建家庭时使用）
 * @param {boolean} event.createFamily - 是否创建家庭（默认为true）
 * @param {Object} context - 上下文参数
 * @returns {Object} 登录结果
 */
exports.main = async (event, context) => {
  // 获取微信上下文信息
  const wxContext = cloud.getWXContext();
  const { OPENID, APPID, UNIONID } = wxContext;

  console.log('用户登录:', { OPENID, APPID, UNIONID });

  try {
    // 查询用户是否已存在
    const userRes = await db.collection('users').where({
      openid: OPENID
    }).get();

    let userId;
    let isNewUser = false;
    let userFamilyId = null;

    // 处理新用户注册
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
      // 处理老用户登录
      userId = userRes.data[0]._id;
      userFamilyId = userRes.data[0]?.familyId || null;

      const updateData = {
        loginCount: db.command.inc(1),
        lastLoginTime: db.serverDate(),
        updateTime: db.serverDate()
      };

      // 更新用户昵称和头像（如果有变化）
      if (event.nickname && event.nickname !== userRes.data[0].nickname) {
        updateData.nickname = event.nickname;
        updateData.avatar = event.avatar || userRes.data[0].avatar;
      }

      await db.collection('users').doc(userId).update({
        data: updateData
      });

      console.log('用户登录信息更新成功:', userId);
    }

    // 查询用户的家庭成员关系
    const familyMemberRes = await db.collection('family_members').where({
      userId: userId,
      status: 'active'
    }).get();

    let hasFamily = familyMemberRes.data.length > 0;
    // 优先使用用户当前选择的家庭（存储在users表的familyId字段中）
    let familyId = userFamilyId;
    
    // 如果用户没有选择家庭且有家庭关系，使用第一个家庭
    if (!familyId && hasFamily) {
      familyId = familyMemberRes.data[0].familyId;
    } else if (!familyId && event.createFamily !== false) {
      // 如果用户没有家庭且需要创建家庭，创建新家庭
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

      // 创建用户-家庭关系（owner角色）
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

      // 更新用户表的familyId字段
      await db.collection('users').doc(userId).update({
        data: {
          familyId: familyId,
          updateTime: db.serverDate()
        }
      });
      console.log('用户familyId更新成功:', userId, familyId);

      hasFamily = true;
    }

    // 查询家庭的孩子数量
    let childrenCount = 0;
    if (familyId) {
      const childrenRes = await db.collection('children').where({
        familyId: familyId
      }).count();
      childrenCount = childrenRes.total;
    }

    // 获取习惯模板（仅新用户返回）
    const templatesRes = await db.collection('habit_templates')
      .orderBy('order', 'asc')
      .get();

    // 构建用户家庭列表
    const userFamilies = [];
    if (hasFamily) {
      for (const member of familyMemberRes.data) {
        const familyInfoRes = await db.collection('families').doc(member.familyId).get();
        if (familyInfoRes.data) {
          userFamilies.push({
            familyId: member.familyId,
            familyName: familyInfoRes.data.name,
            role: member.role,
            isCurrent: member.familyId === familyId // 标记当前选择的家庭
          });
        }
      }
    }

    // 返回登录结果
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
