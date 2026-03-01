/**
 * 数据库初始化脚本
 * 在CloudBase控制台的数据库中执行以下操作创建集合
 */

// ========== 集合创建 ==========

/**
 * 1. families (家庭表)
 */
/*
{
  _id: string,
  name: string,        // 家庭名称
  createTime: Date
}
*/

/**
 * 2. children (孩子表)
 */
/*
{
  _id: string,
  familyId: string,    // 家庭ID
  name: string,        // 孩子姓名
  avatar: string,      // 头像URL
  points: number,      // 总积分
  coins: number,       // 金币
  level: number,       // 等级
  createTime: Date,
  updateTime: Date
}
*/

/**
 * 3. habits (习惯表)
 */
/*
{
  _id: string,
  childId: string,     // 孩子ID
  familyId: string,    // 家庭ID
  name: string,        // 习惯名称
  icon: string,        // 图标
  category: string,    // 分类
  categoryColor: string, // 分类颜色
  points: number,      // 积分
  order: number,       // 排序
  isActive: boolean,   // 是否激活
  createTime: Date
}
*/

/**
 * 4. check_ins (打卡记录表)
 */
/*
{
  _id: string,
  childId: string,     // 孩子ID
  habitId: string,     // 习惯ID
  date: string,        // 日期 YYYY-MM-DD
  points: number,      // 获得积分(实际)
  habitPoints: number, // 习惯设置的积分值
  coins: number,      // 获得金币
  photos: Array,       // 照片URL数组
  remark: string,      // 备注
  createTime: Date
}
*/

/**
 * 5. habit_templates (习惯模板表)
 */
// 见下方习惯模板数据

/**
 * 6. daily_records (每日记录表)
 */
/*
{
  _id: string,
  childId: string,     // 孩子ID
  date: string,        // 日期 YYYY-MM-DD
  totalPoints: number, // 当日总积分
  checkInCount: number, // 打卡次数
  createTime: Date
}
*/

// ========== 习惯模板初始数据 ==========

const habitTemplates = [
  // 学习类
  { id: 'study_1', name: '完成作业', icon: '📚', category: 'study', categoryName: '学习', color: '#FF6B6B', points: 5 },
  { id: 'study_2', name: '阅读30分钟', icon: '📖', category: 'study', categoryName: '学习', color: '#FF6B6B', points: 3 },
  { id: 'study_3', name: '背诵单词', icon: '📝', category: 'study', categoryName: '学习', color: '#FF6B6B', points: 3 },
  { id: 'study_4', name: '练字20分钟', icon: '✍️', category: 'study', categoryName: '学习', color: '#FF6B6B', points: 3 },
  { id: 'study_5', name: '预习功课', icon: '📕', category: 'study', categoryName: '学习', color: '#FF6B6B', points: 4 },
  
  // 生活类
  { id: 'life_1', name: '自己穿衣服', icon: '👕', category: 'life', categoryName: '生活', color: '#4ECDC4', points: 2 },
  { id: 'life_2', name: '整理书包', icon: '🎒', category: 'life', categoryName: '生活', color: '#4ECDC4', points: 2 },
  { id: 'life_3', name: '整理房间', icon: '🧹', category: 'life', categoryName: '生活', color: '#4ECDC4', points: 3 },
  { id: 'life_4', name: '自己吃饭', icon: '🍽️', category: 'life', categoryName: '生活', color: '#4ECDC4', points: 2 },
  { id: 'life_5', name: '按时睡觉', icon: '😴', category: 'life', categoryName: '生活', color: '#4ECDC4', points: 3 },
  { id: 'life_6', name: '按时起床', icon: '⏰', category: 'life', categoryName: '生活', color: '#4ECDC4', points: 3 },
  { id: 'life_7', name: '自己洗澡', icon: '🚿', category: 'life', categoryName: '生活', color: '#4ECDC4', points: 2 },
  
  // 运动类
  { id: 'exercise_1', name: '运动30分钟', icon: '🏃', category: 'exercise', categoryName: '运动', color: '#FFE66D', points: 4 },
  { id: 'exercise_2', name: '跑步', icon: '🏃‍♂️', category: 'exercise', categoryName: '运动', color: '#FFE66D', points: 4 },
  { id: 'exercise_3', name: '跳绳100个', icon: '🪢', category: 'exercise', categoryName: '运动', color: '#FFE66D', points: 3 },
  { id: 'exercise_4', name: '做眼保健操', icon: '👀', category: 'exercise', categoryName: '运动', color: '#FFE66D', points: 2 },
  { id: 'exercise_5', name: '拉伸运动', icon: '🤸', category: 'exercise', categoryName: '运动', color: '#FFE66D', points: 2 },
  
  // 习惯类
  { id: 'habit_1', name: '刷牙', icon: '🦷', category: 'habit', categoryName: '习惯', color: '#A8E6CF', points: 2 },
  { id: 'habit_2', name: '洗脸', icon: '🧼', category: 'habit', categoryName: '习惯', color: '#A8E6CF', points: 1 },
  { id: 'habit_3', name: '剪指甲', icon: '💅', category: 'habit', categoryName: '习惯', color: '#A8E6CF', points: 2 },
  { id: 'habit_4', name: '整理玩具', icon: '🧸', category: 'habit', categoryName: '习惯', color: '#A8E6CF', points: 2 },
  { id: 'habit_5', name: '不挑食', icon: '🥗', category: 'habit', categoryName: '习惯', color: '#A8E6CF', points: 3 },
  { id: 'habit_6', name: '不玩手机', icon: '📵', category: 'habit', categoryName: '习惯', color: '#A8E6CF', points: 3 },
  
  // 社交类
  { id: 'social_1', name: '主动打招呼', icon: '👋', category: 'social', categoryName: '社交', color: '#DDA0DD', points: 2 },
  { id: 'social_2', name: '帮助别人', icon: '🤝', category: 'social', categoryName: '社交', color: '#DDA0DD', points: 3 },
  { id: 'social_3', name: '说谢谢', icon: '🙏', category: 'social', categoryName: '社交', color: '#DDA0DD', points: 2 },
  { id: 'social_4', name: '分享玩具', icon: '🎁', category: 'social', categoryName: '社交', color: '#DDA0DD', points: 3 },
  { id: 'social_5', name: '关心家人', icon: '❤️', category: 'social', categoryName: '社交', color: '#DDA0DD', points: 3 }
];

module.exports = { habitTemplates };
