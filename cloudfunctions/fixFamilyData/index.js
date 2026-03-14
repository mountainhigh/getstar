const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

const MAX_LIMIT = 100;

async function getAllFamilies() {
  const allFamilies = [];
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const res = await db.collection('families')
      .skip(skip)
      .limit(MAX_LIMIT)
      .get();

    allFamilies.push(...res.data);

    if (res.data.length < MAX_LIMIT) {
      hasMore = false;
    } else {
      skip += MAX_LIMIT;
    }
  }

  return allFamilies;
}

async function getUsersByFamilyId(familyId) {
  const allUsers = [];
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const res = await db.collection('users')
      .where({
        familyId: familyId
      })
      .skip(skip)
      .limit(MAX_LIMIT)
      .get();

    allUsers.push(...res.data);

    if (res.data.length < MAX_LIMIT) {
      hasMore = false;
    } else {
      skip += MAX_LIMIT;
    }
  }

  return allUsers;
}

exports.main = async (event, context) => {
  const results = {
    success: true,
    message: '数据迁移完成',
    data: {
      familyMembersCreated: 0,
      familiesProcessed: 0,
      usersProcessed: 0,
      skipped: 0,
      errors: []
    }
  };

  try {
    console.log('开始迁移用户-家庭关系数据...');

    const families = await getAllFamilies();
    results.data.familiesProcessed = families.length;
    console.log(`找到 ${families.length} 个家庭`);

    for (const family of families) {
      try {
        const familyId = family._id;
        const ownerId = family.ownerId;

        const existingOwnerRes = await db.collection('family_members').where({
          familyId: familyId,
          userId: ownerId
        }).get();

        if (existingOwnerRes.data.length === 0) {
          await db.collection('family_members').add({
            data: {
              familyId: familyId,
              userId: ownerId,
              role: 'owner',
              status: 'active',
              joinTime: family.createTime || db.serverDate(),
              invitedBy: null,
              createTime: db.serverDate(),
              updateTime: db.serverDate()
            }
          });
          results.data.familyMembersCreated++;
          console.log(`家庭 ${familyId} 的 owner 关系已创建`);
        } else {
          console.log(`家庭 ${familyId} 的 owner 关系已存在，跳过`);
        }

        const users = await getUsersByFamilyId(familyId);

        for (const user of users) {
          results.data.usersProcessed++;

          if (user._id === ownerId) {
            continue;
          }

          const existingMemberRes = await db.collection('family_members').where({
            familyId: familyId,
            userId: user._id
          }).get();

          if (existingMemberRes.data.length === 0) {
            await db.collection('family_members').add({
              data: {
                familyId: familyId,
                userId: user._id,
                role: 'member',
                status: 'active',
                joinTime: user.createTime || db.serverDate(),
                invitedBy: ownerId,
                createTime: db.serverDate(),
                updateTime: db.serverDate()
              }
            });
            results.data.familyMembersCreated++;
            console.log(`用户 ${user._id} 加入家庭 ${familyId} 的关系已创建`);
          } else {
            results.data.skipped++;
            console.log(`用户 ${user._id} 与家庭 ${familyId} 的关系已存在，跳过`);
          }
        }
      } catch (familyError) {
        console.error(`处理家庭 ${family._id} 时出错:`, familyError);
        results.data.errors.push({
          familyId: family._id,
          error: familyError.message
        });
      }
    }

    console.log('数据迁移完成:', results);
    return results;

  } catch (error) {
    console.error('数据迁移失败:', error);
    return {
      success: false,
      message: '数据迁移失败',
      error: error.message,
      data: results.data
    };
  }
};
