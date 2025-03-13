const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

/**
 * 格式化相对时间
 * @param {any} timestamp - 任何表示时间的值
 * @return {string} 相对时间字符串
 */
function formatRelativeTime(timestamp) {
  // 阻止处理已格式化的字符串
  if (typeof timestamp === 'string' &&
      (timestamp.includes('小时前') ||
       timestamp.includes('分钟前') ||
       timestamp.includes('秒前') ||
       timestamp.includes('天前') ||
       timestamp.includes('月前') ||
       timestamp.includes('年前') ||
       timestamp === '刚刚发布')) {
    return timestamp; // 已经是格式化好的相对时间，直接返回
  }

  // 如果没有传入值，直接返回默认值
  if (!timestamp) {
    return '刚刚发布';
  }

  // 标准化日期对象
  let date;
  try {
    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string') {
      // 尝试解析日期字符串
      date = new Date(timestamp);
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      // 对象类型可能是云数据库的时间类型
      console.log('尝试解析复杂时间对象:', JSON.stringify(timestamp));
      if (timestamp.toDate) {
        date = timestamp.toDate(); // Firestore时间戳
      } else {
        console.error('未知时间格式:', timestamp);
        return '刚刚发布';
      }
    }
  } catch (err) {
    console.error('时间格式化错误:', err, timestamp);
    return '刚刚发布'; // 出错时使用默认值
  }

  // 检查日期是否有效
  if (isNaN(date.getTime())) {
    console.error('无效日期:', timestamp);
    return '刚刚发布';
  }

  const now = new Date();
  const diff = now.getTime() - date.getTime(); // 毫秒差

  // 计算时间差
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  // 返回相对时间
  if (seconds < 0) {
    return '刚刚发布'; // 未来时间
  } else if (seconds < 60) {
    return seconds < 15 ? '刚刚发布' : `${seconds}秒前`;
  } else if (minutes < 60) {
    return `${minutes}分钟前`;
  } else if (hours < 24) {
    return `${hours}小时前`;
  } else if (days < 30) {
    return `${days}天前`;
  } else if (months < 12) {
    return `${months}个月前`;
  } else {
    return `${years}年前`;
  }
}

module.exports = {
  formatTime,
  formatRelativeTime
}
