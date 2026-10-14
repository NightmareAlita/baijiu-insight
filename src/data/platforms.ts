import type { PlatformInfo } from '../types';

// 平台配置：每个平台的标识、名称、图标、主题色
export const PLATFORMS: PlatformInfo[] = [
  {
    id: 'weibo',
    name: '微博',
    icon: '微',
    color: '#E6162D',
    description: '公开社交内容',
  },
  {
    id: 'baidu',
    name: '百度',
    icon: '百',
    color: '#2932E1',
    description: '公开搜索内容',
  },
  {
    id: 'douyin',
    name: '抖音',
    icon: '抖',
    color: '#000000',
    description: '公开短视频内容',
  },
  {
    id: 'xiaohongshu',
    name: '小红书',
    icon: '红',
    color: '#FF2442',
    description: '公开笔记内容',
  },
  {
    id: 'zhihu',
    name: '知乎',
    icon: '知',
    color: '#0084FF',
    description: '深度讨论与问答',
  },
  {
    id: 'news',
    name: '新闻媒体',
    icon: '闻',
    color: '#8c4e24',
    description: '行业报道与舆情',
  },
];

export const getPlatform = (id: string): PlatformInfo | undefined =>
  PLATFORMS.find((p) => p.id === id);
