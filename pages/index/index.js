// index.js
const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

let isLiking = false  // 添加在 Page 外部
let isFavoriting = false;  // 防止重复点击收藏按钮

// 在文件顶部引入工具函数
const util = require('../../utils/util');

Page({
  data: {
    motto: 'Hello World',
    userInfo: {
      avatarUrl: defaultAvatarUrl,
      nickName: '',
    },
    hasUserInfo: false,
    canIUseGetUserProfile: wx.canIUse('getUserProfile'),
    canIUseNicknameComp: wx.canIUse('input.type.nickname'),
    posts: [],
    page: 1,
    pageSize: 10,
    loading: false,
    hasMore: true,
    currentCommentPostId: null,
    currentCommentPostIndex: null,
    showCommentInput: false,
    commentText: '',
    commentImages: [],
    showExpandedEditor: false
  },
  bindViewTap() {
    wx.navigateTo({
      url: '../logs/logs'
    })
  },
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    const { nickName } = this.data.userInfo
    this.setData({
      "userInfo.avatarUrl": avatarUrl,
      hasUserInfo: nickName && avatarUrl && avatarUrl !== defaultAvatarUrl,
    })
  },
  onInputChange(e) {
    const nickName = e.detail.value
    const { avatarUrl } = this.data.userInfo
    this.setData({
      "userInfo.nickName": nickName,
      hasUserInfo: nickName && avatarUrl && avatarUrl !== defaultAvatarUrl,
    })
  },
  getUserProfile(e) {
    // 推荐使用wx.getUserProfile获取用户信息，开发者每次通过该接口获取用户个人信息均需用户确认，开发者妥善保管用户快速填写的头像昵称，避免重复弹窗
    wx.getUserProfile({
      desc: '展示用户信息', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
      success: (res) => {
        console.log(res)
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
      }
    })
  },
  onLoad() {
    console.log('页面加载')
    this.loadPosts()
    this.setData({
      currentPostId: '',  // 初始化为空字符串
      currentPostIndex: -1
    })
  },
  onShow() {
    console.log('页面显示')
  },
  // 下拉刷新
  onPullDownRefresh() {
    console.log('触发下拉刷新')

    // 维持页面位置，只刷新数据
    this.loadPosts(true).then(() => {
      wx.stopPullDownRefresh()
    }).catch(() => {
      wx.stopPullDownRefresh()
    })
  },
  // 加载帖子 - 返回Promise以便链式调用
  async loadPosts(refresh = false) {
    if (this.data.loading || (!refresh && !this.data.hasMore)) return Promise.resolve()

    try {
      this.setData({ loading: true })

      // 获取用户OPENID，用于确定点赞状态
      let OPENID = ''
      try {
        const wxContext = await wx.cloud.callFunction({
          name: 'login'
        })
        OPENID = wxContext.result.openid || wxContext.result.data?.openid || ''
        console.log('首页获取到的OPENID:', OPENID)
      } catch (err) {
        console.error('获取用户OPENID失败：', err)
      }

      // 查询帖子数据
      const db = wx.cloud.database()
      const result = await db.collection('posts')
        .orderBy('createTime', 'desc')
        .skip((refresh ? 0 : (this.data.page - 1) * this.data.pageSize))
        .limit(this.data.pageSize)
        .get()

      const posts = result.data
      console.log('获取到的帖子数量:', posts.length, '刷新模式:', refresh)

      // 添加更多日志来查看问题
      if (posts.length === 0) {
        console.log('没有获取到帖子，检查是否有数据')
      } else {
        console.log('第一条帖子的ID:', posts[0]._id)
      }

      // 在处理帖子数据前添加简单的检查函数
      function ensureString(value) {
        if (value === undefined || value === null) return '';
        if (typeof value === 'string') return value;
        try {
          return String(value);
        } catch (e) {
          return '';
        }
      }

      // 获取本地存储的点赞状态
      const likedPosts = wx.getStorageSync('likedPosts') || {}

      // 收集所有不重复的作者ID
      const authorIds = [...new Set(posts.map(post => post.authorId))];
      console.log("收集到的作者ID数量:", authorIds.length);

      // 查询这些作者的最新信息 - 关键修改：使用_id字段匹配authorId
      let users = [];
      try {
        // 限制查询数量，避免超出限制
        const maxQuery = authorIds.slice(0, 20); // 限制查询数量

        // 使用in操作符一次性查询所有用户
        const userResult = await db.collection('users').where({
          _id: db.command.in(maxQuery)
        }).get();

        users = userResult.data;
        console.log("成功查询到用户数量:", users.length);
      } catch (err) {
        console.error("查询用户信息失败:", err);
      }

      // 构建用户映射表 - 使用_id作为键
      const userMap = {};
      users.forEach(user => {
        userMap[user._id] = user;
      });

      // 处理帖子数据，添加评论处理
      const processedPosts = posts.map(post => {
        // 1. 基础信息处理
        const processedPost = {
          ...post,
          likes: post.likes || 0,
          favoriteCounts: post.favoriteUsers.length || 0,
          comments: post.comments || [],
          commentCount: post.comments ? post.comments.length : 0,
          authorName: post.authorName || '用户',
          authorAvatar: post.authorAvatar || '/assets/icons/default-avatar.png',
          createTime: this.formatTimeDisplay(post.createTime),
          isLiked: OPENID ? (post.likedUsers || []).includes(OPENID) : false,
          isFavorited: OPENID ? (post.favoriteUsers || []).includes(OPENID) : false
        };

        // 2. 评论预览处理 - 新增部分
        if (post.comments && post.comments.length > 0) {
          // 最多显示3条，从最新的开始
          const recentComments = post.comments.slice(-3).reverse();

          // 处理每条评论，标记有图片的评论
          processedPost.commentPreview = recentComments.map(comment => {
            // 检查评论是否包含图片
            const hasImage = comment.images && comment.images.length > 0;

        return {
              ...comment,
              hasImage,
              // 确保评论内容是字符串
              content: typeof comment.content === 'string' ? comment.content : ''
            };
          });
        } else {
          processedPost.commentPreview = [];
        }

        // 3. 内容安全处理 - 关键部分
        try {
          // 先将原始内容存储为原始格式
          processedPost.originalContent = post.content;

          // 处理完全不存在的情况
          if (post.content === undefined || post.content === null) {
            processedPost.content = '';
            processedPost.displayContent = '暂无内容';
            processedPost.hasMore = false;
            return processedPost;
          }

          // 如果是字符串，进行正常处理
          if (typeof post.content === 'string') {
            processedPost.content = post.content;

            // 预计算截断后的显示内容
            if (post.content.length > 150) {
              processedPost.displayContent = post.content.substring(0, 150) + '...';
              processedPost.hasMore = true;
            } else {
              processedPost.displayContent = post.content;
              processedPost.hasMore = false;
            }

            return processedPost;
          }

          // 如果是其他类型，尝试转换
          let contentStr = '';
          try {
            contentStr = String(post.content);
          } catch (e) {
            contentStr = '';
          }

          processedPost.content = contentStr;

          // 预计算截断后的显示内容
          if (contentStr.length > 150) {
            processedPost.displayContent = contentStr.substring(0, 150) + '...';
            processedPost.hasMore = true;
          } else {
            processedPost.displayContent = contentStr;
            processedPost.hasMore = false;
          }

          return processedPost;
        } catch (err) {
          // 异常情况处理
          console.error(`处理帖子内容出错: ${post._id}`, err);
          processedPost.content = '';
          processedPost.displayContent = '内容无法显示';
          processedPost.hasMore = false;
          return processedPost;
        }
      });

      // 最后检查 - 确保所有帖子的显示内容都是字符串
      processedPosts.forEach((post, index) => {
        if (typeof post.displayContent !== 'string') {
          console.error(`帖子 ${post._id} 显示内容非字符串，强制修复`);
          processedPosts[index].displayContent = '内容格式错误';
        }
      });

      // 处理每篇帖子的相对时间
      for (let i = 0; i < processedPosts.length; i++) {
        if (!processedPosts[i].relativeTime && processedPosts[i].createTime) {
          processedPosts[i].relativeTime = util.formatRelativeTime(processedPosts[i].createTime);
        } else if (!processedPosts[i].relativeTime) {
          processedPosts[i].relativeTime = '刚刚发布';
        }
      }

      // 更新帖子作者信息
      processedPosts.forEach(post => {
        // 尝试获取作者最新信息
        const author = userMap[post.authorId];
        if (author) {
          // 更新作者信息为最新
          post.authorName = author.nickName || post.authorName;
          post.authorAvatar = author.avatarUrl || post.authorAvatar;
          console.log(`更新帖子${post._id}的作者信息:`, post.authorName);
        } else {
          console.log(`未找到帖子${post._id}作者(ID:${post.authorId})的信息`);
        }
      });

      // 添加收藏状态判断
      processedPosts.forEach(post => {
        post.isFavorited = OPENID ? (post.favoriteUsers || []).includes(OPENID) : false;
      });

      // 如果是刷新模式，重置帖子列表
      if (refresh) {
        this.setData({
          posts: processedPosts,
          page: 1,
          hasMore: processedPosts.length === this.data.pageSize,
          loading: false
        })
      } else {
        // 加载更多模式
      this.setData({
          posts: [...this.data.posts, ...processedPosts],
        page: this.data.page + 1,
        hasMore: processedPosts.length === this.data.pageSize,
        loading: false
      })
      }

      // 添加调试日志
      console.log('处理后的帖子总数:', this.data.posts.length);

      return Promise.resolve()
    } catch (err) {
      console.log('加载帖子失败：', err)
      this.setData({ loading: false })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
      return Promise.reject(err)
    }
  },
  // 添加图片预览功能
  previewImage(e) {
    const { urls, current } = e.currentTarget.dataset
    wx.previewImage({
      urls,
      current
    })
  },
  // 格式化时间显示
  formatTimeDisplay(dateStr) {
    if (!dateStr) return ''

    try {
      const date = new Date(dateStr)
      const now = new Date()
      const diff = now - date
      const minutes = Math.floor(diff / 1000 / 60)
      const hours = Math.floor(minutes / 60)
      const days = Math.floor(hours / 24)

      if (minutes < 60) return `${minutes}分钟前`
      if (hours < 24) return `${hours}小时前`
      if (days < 30) return `${days}天前`

      return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
    } catch (e) {
      console.error('时间格式化错误：', e)
      return ''
    }
  },
  // 跳转到发帖页面
  goToPost() {
    wx.navigateTo({
      url: '/pages/post/post'
    })
  },
  // 跳转到帖子详情
  goToDetail(e) {
    const { postId } = e.currentTarget.dataset;

    if (!postId) {
      console.error('未找到帖子ID');
      return;
    }

    wx.navigateTo({
      url: `/pages/post/detail/detail?id=${postId}`,
      fail: (err) => {
        console.error('跳转失败:', err);
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        });
      }
    });
  },
  // 修改点赞处理函数
  async handleLike(e) {
    const { id, index } = e.currentTarget.dataset

    // 防止重复点击
    if (isLiking) return
    isLiking = true

    try {
      // 获取当前帖子状态
      const currentPost = this.data.posts[index]
      if (!currentPost) {
        throw new Error('帖子不存在')
      }

      // 立即更新UI状态，提供即时反馈
      const newIsLiked = !currentPost.isLiked
      const newLikes = currentPost.likes + (newIsLiked ? 1 : -1)

      this.setData({
        [`posts[${index}].isLiked`]: newIsLiked,
        [`posts[${index}].likes`]: newLikes
      })

      // 调用云函数并添加详细日志
      console.log('调用点赞云函数:', {
        postId: id,
        当前点赞状态: currentPost.isLiked,
        新点赞状态: newIsLiked
      })

      const res = await wx.cloud.callFunction({
        name: 'likes',
        data: {
          type: 'toggleLike',
          postId: id
        }
      })

      console.log('点赞云函数返回结果:', res.result)

      if (!res.result || !res.result.success) {
        // 如果失败，回滚UI状态
        this.setData({
          [`posts[${index}].isLiked`]: currentPost.isLiked,
          [`posts[${index}].likes`]: currentPost.likes
        })
        throw new Error(res.result?.message || '操作失败')
      }

      // 成功时将openid保存到本地，确保刷新后状态一致
      try {
        // 在本地存储中记录点赞状态
        const likedPosts = wx.getStorageSync('likedPosts') || {}
        if (newIsLiked) {
          likedPosts[id] = true
        } else {
          delete likedPosts[id]
        }
        wx.setStorageSync('likedPosts', likedPosts)
      } catch (err) {
        console.error('保存点赞状态失败:', err)
      }

      // 轻量级提示
      wx.showToast({
        title: newIsLiked ? '已点赞' : '已取消',
        icon: 'none',
        duration: 1000
      })

    } catch (err) {
      console.error('点赞失败:', err)
      wx.showToast({
        title: err.message || '操作失败',
        icon: 'none'
      })
    } finally {
      // 无论成功失败，重置操作状态
      isLiking = false
    }
  },
  onAvatarError(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      [`posts[${index}].authorAvatar`]: '/assets/icons/default-avatar.png'
    });
    console.log(`头像 ${index} 加载失败，已替换为默认头像`);
  },
  // 显示评论输入框
  showCommentInput(e) {
    const { id, index } = e.currentTarget.dataset;

    console.log("显示评论框，帖子ID:", id, "索引:", index);

    if (!id) {
      wx.showToast({
        title: '无法识别帖子',
        icon: 'none'
      });
      return;
    }

    this.setData({
      showCommentInput: true,
      currentPostId: id,  // 确保这里正确存储了帖子ID
      currentPostIndex: index,
      commentText: '',
      commentImages: []
    });
  },
  // 隐藏评论框
  hideCommentInput() {
    this.setData({
      showCommentInput: false,
      currentPostId: '',  // 重置帖子ID
      currentPostIndex: -1,
      commentText: '',
      commentImages: []
    });
  },
  // 评论输入监听
  onCommentInput(e) {
    this.setData({
      commentText: e.detail.value
    });
  },
  // 选择评论图片
  chooseCommentImage() {
    const that = this;
    wx.chooseImage({
      count: 9,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        const tempFilePaths = res.tempFilePaths;
        const tempFiles = res.tempFiles;

        const currentImages = that.data.commentImages || [];
        const newImages = tempFilePaths.map((path, index) => ({
          tempUrl: path,
          size: tempFiles[index].size
        }));

        // 确保总数不超过9张
        const totalImages = [...currentImages, ...newImages].slice(0, 9);

        that.setData({
          commentImages: totalImages
        });
      }
    });
  },
  // 移除已选择的评论图片
  removeCommentImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.commentImages;
    images.splice(index, 1);
    this.setData({
      commentImages: images
    });
  },
  // 提交评论
  async submitComment() {
    const postId = this.data.currentPostId;
    console.log("准备提交评论，帖子ID:", postId);

    if (!postId) {
      wx.showToast({
        title: '未找到帖子ID',
        icon: 'none'
      });
      return;
    }

    const content = this.data.commentText.trim();
    const hasImages = this.data.commentImages && this.data.commentImages.length > 0;

    if (!content && !hasImages) {
      wx.showToast({ title: '评论内容不能为空', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '发送中...' });

    try {
      // 从本地获取用户信息
      const userInfo = wx.getStorageSync('userInfo') || {};
      const userName = userInfo.nickName || '用户';
      const userAvatar = userInfo.avatarUrl || '/assets/icons/default-avatar.png';

      // 先上传图片(如果有)
      let imageUrls = [];
      if (hasImages) {
        console.log("开始上传评论图片...");
        const uploadTasks = this.data.commentImages.map(img => this.uploadImage(img.tempUrl));
        imageUrls = await Promise.all(uploadTasks);
        console.log("图片上传成功:", imageUrls);
      }

      // 调用云函数
      console.log("调用云函数添加评论...");
      const res = await wx.cloud.callFunction({
        name: 'addComment',
        data: {
          postId: postId,
          content: content,
          images: imageUrls,
          // 直接传递用户信息
          authorName: userName,
          authorAvatar: userAvatar
        }
      });

      console.log("评论云函数返回结果:", res);

      if (res.result && res.result.success) {
        console.log("新添加的评论:", res.result.comment);
        console.log("对比用户信息 - 本地:", userName, "评论中:", res.result.comment.authorName);

        // 更新本地数据
        let posts = this.data.posts;
        if (!posts[this.data.currentPostIndex].comments) {
          posts[this.data.currentPostIndex].comments = [];
        }

        // 添加新评论
        posts[this.data.currentPostIndex].comments.push(res.result.comment);

        // 更新评论计数
        if (!posts[this.data.currentPostIndex].commentCount) {
          posts[this.data.currentPostIndex].commentCount = 0;
        }
        posts[this.data.currentPostIndex].commentCount += 1;

        // 更新评论预览
        if (!posts[this.data.currentPostIndex].commentPreview) {
          posts[this.data.currentPostIndex].commentPreview = [];
        }

        // 添加到评论预览（保持最新3条）
        const newComment = {
          ...res.result.comment,
          hasImage: imageUrls.length > 0
        };

        posts[this.data.currentPostIndex].commentPreview.unshift(newComment);
        if (posts[this.data.currentPostIndex].commentPreview.length > 3) {
          posts[this.data.currentPostIndex].commentPreview = posts[this.data.currentPostIndex].commentPreview.slice(0, 3);
        }

        this.setData({
          posts: posts,
          commentText: '',
          commentImages: [],
          showCommentInput: false
        });

        console.log("评论已添加到本地数据，帖子现在的评论数:", posts[this.data.currentPostIndex].comments.length);

        wx.hideLoading();
        wx.showToast({ title: '评论成功', icon: 'success' });
      } else {
        throw new Error(res.result?.message || '评论提交失败');
      }
    } catch (err) {
      console.error("评论提交出错:", err);
      wx.hideLoading();
      wx.showToast({
        title: '评论失败: ' + (err.message || '未知错误'),
        icon: 'none',
        duration: 2000
      });
    }
  },
  // 上传图片到云存储
  async uploadImage(tempFilePath) {
    return new Promise((resolve, reject) => {
      const ext = tempFilePath.split('.').pop();
      const cloudPath = `comments/${Date.now()}_${Math.random().toString(36).substr(2, 8)}.${ext}`;

      wx.cloud.uploadFile({
        cloudPath,
        filePath: tempFilePath,
        success: res => resolve(res.fileID),
        fail: err => reject(err)
      });
    });
  },
  // 获取用户信息
  async getUserInfo() {
    try {
      // 从本地存储获取
      const userInfo = wx.getStorageSync('userInfo');

      // 如果有缓存数据，返回缓存的用户信息
      if (userInfo && userInfo._id) {
        console.log("从缓存获取到用户信息:", userInfo.nickName);
        return userInfo;
      }

      console.log("缓存中无用户信息，从数据库查询");

      // 尝试获取openid
      let openid = wx.getStorageSync('openid');

      // 如果没有缓存的openid，调用login云函数获取
      if (!openid) {
        try {
          const wxContext = await wx.cloud.callFunction({
            name: 'login'
          });
          openid = wxContext.result.openid || wxContext.result.data?.openid;
          if (openid) {
            wx.setStorageSync('openid', openid);
          }
        } catch (err) {
          console.error("获取openid失败:", err);
        }
      }

      if (!openid) {
        console.error("无法获取openid");
        return {};
      }

      // 从数据库查询用户
      const db = wx.cloud.database();
      const userRes = await db.collection('users').where({
        openid: openid
      }).get();

      if (userRes.data.length > 0) {
        console.log("数据库查询到用户:", userRes.data[0].nickName);

        // 更新缓存
        wx.setStorageSync('userInfo', userRes.data[0]);
        return userRes.data[0];
      }

      // 尝试使用_openid查询
      const userRes2 = await db.collection('users').where({
        _openid: openid
      }).get();

      if (userRes2.data.length > 0) {
        console.log("通过_openid查询到用户:", userRes2.data[0].nickName);

        // 更新缓存
        wx.setStorageSync('userInfo', userRes2.data[0]);
        return userRes2.data[0];
      }

      console.log("未查询到用户信息");
      return {};
    } catch (err) {
      console.error('获取用户信息失败:', err);
      return {};
    }
  },
  // 添加查看全部评论跳转功能
  viewPostDetail(e) {
    const postId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/post/detail/detail?id=${postId}`
    });
  },
  // 显示扩展编辑区
  showExpandedEditor() {
    this.setData({
      showExpandedEditor: true
    });
  },
  // 隐藏扩展编辑区
  hideExpandedEditor() {
    this.setData({
      showExpandedEditor: false
    });
  },
  // 确认评论内容
  confirmComment() {
    // 隐藏扩展编辑区并提交评论
    this.setData({
      showExpandedEditor: false
    });
    this.submitComment();
  },

  // 添加收藏处理函数
  async handleFavorite(e) {
    const { id, index } = e.currentTarget.dataset

    // 防止重复点击
    if (this.data.isFavoriting) return
    this.setData({ isFavoriting: true })

    try {
      // 获取当前帖子状态
      const currentPost = this.data.posts[index]
      if (!currentPost) {
        throw new Error('帖子不存在')
      }

      // 立即更新UI状态
      const newIsFavorited = !currentPost.isFavorited
      const newFavouriteCounts = currentPost.favoriteCounts + (newIsFavorited ? 1 : -1);

      this.setData({
        [`posts[${index}].isFavorited`]: newIsFavorited,
        [`posts[${index}].favoriteCounts`]: newFavouriteCounts
      });

      // 调用云函数
      console.log('调用收藏云函数:', {
        postId: id,
        当前收藏状态: currentPost.isFavorited,
        当前收藏数量: currentPost.favoriteCounts
      });

      const res = await wx.cloud.callFunction({
        name: 'favorite',
        data: {
          postId: id
        }
      })

      console.log('收藏云函数返回结果:', res.result)

      if (!res.result || !res.result.success) {
        // 如果失败，回滚UI状态
        this.setData({
          [`posts[${index}].isFavorited`]: currentPost.isFavorited,
          [`posts[${index}].favoriteCounts`]: currentPost.favoriteCounts
        })
        throw new Error(res.result?.message || '操作失败')
      }

      // 成功时将状态保存到本地
      const favoritePosts = wx.getStorageSync('favoritePosts') || {}

      if (newIsFavorited) {
        favoritePosts[id] = true
      } else {
        delete favoritePosts[id]
      }
      wx.setStorageSync('favoritePosts', favoritePosts)

      // 轻量级提示
      wx.showToast({
        title: newIsFavorited ? '已收藏' : '已取消收藏',
        icon: 'none',
        duration: 1000
      })

    } catch (err) {
      console.error('收藏操作失败:', err)
      wx.showToast({
        title: err.message || '操作失败',
        icon: 'none'
      })
    } finally {
      // 解除标志
      this.setData({ isFavoriting: false })
    }
  }
})
