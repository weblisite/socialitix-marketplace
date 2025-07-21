export interface ServiceDefinition {
  id: string;
  platform: string;
  type: string;
  name: string;
  buyerDescription: string;
  providerDescription: string;
  buyerPrice: number;
  providerPrice: number;
  deliveryTime: string;
  requirements: string[];
  icon: string;
  category: string;
}

export const PREDEFINED_SERVICES: ServiceDefinition[] = [
  // Instagram Services
  {
    id: 'instagram-followers',
    platform: 'instagram',
    type: 'followers',
    name: 'Follow Instagram Account',
    buyerDescription: 'Get real Instagram followers to boost your social media presence',
    providerDescription: 'Follow the specified Instagram account using your personal account',
    buyerPrice: 5.00,
    providerPrice: 2.00,
    deliveryTime: '24-48 hours',
    requirements: ['Valid Instagram account', 'Public profile'],
    icon: 'fab fa-instagram',
    category: 'growth'
  },
  {
    id: 'instagram-likes',
    platform: 'instagram',
    type: 'likes',
    name: 'Like Instagram Post',
    buyerDescription: 'Increase engagement on your Instagram posts with likes',
    providerDescription: 'Like the specified Instagram post using your personal account',
    buyerPrice: 5.00,
    providerPrice: 2.00,
    deliveryTime: '2-6 hours',
    requirements: ['Public Instagram post'],
    icon: 'fab fa-instagram',
    category: 'engagement'
  },
  {
    id: 'instagram-comments',
    platform: 'instagram',
    type: 'comments',
    name: 'Comment on Instagram Post',
    buyerDescription: 'Add authentic comments to your Instagram posts',
    providerDescription: 'Write and post a comment on the specified Instagram post',
    buyerPrice: 5.00,
    providerPrice: 2.00,
    deliveryTime: '4-12 hours',
    requirements: ['Public Instagram post', 'Comment text provided'],
    icon: 'fab fa-instagram',
    category: 'engagement'
  },
  {
    id: 'instagram-views',
    platform: 'instagram',
    type: 'views',
    name: 'Watch Instagram Reel',
    buyerDescription: 'Boost your Instagram Reel and video views',
    providerDescription: 'Watch the specified Instagram Reel or video completely',
    buyerPrice: 5.00,
    providerPrice: 2.00,
    deliveryTime: '1-3 hours',
    requirements: ['Public Instagram Reel'],
    icon: 'fab fa-instagram',
    category: 'reach'
  },

  // YouTube Services
  {
    id: 'youtube-subscribers',
    platform: 'youtube',
    type: 'subscribers',
    name: 'Subscribe to YouTube Channel',
    buyerDescription: 'Build your YouTube subscriber base',
    providerDescription: 'Subscribe to the specified YouTube channel using your personal account',
    buyerPrice: 5.00,
    providerPrice: 2.00,
    deliveryTime: '48-72 hours',
    requirements: ['Public YouTube channel'],
    icon: 'fab fa-youtube',
    category: 'growth'
  },
  {
    id: 'youtube-views',
    platform: 'youtube',
    type: 'views',
    name: 'Watch YouTube Video',
    buyerDescription: 'Boost your YouTube video views',
    providerDescription: 'Watch the specified YouTube video completely (minimum 30 seconds)',
    buyerPrice: 5.00,
    providerPrice: 2.00,
    deliveryTime: '24-48 hours',
    requirements: ['Public YouTube video'],
    icon: 'fab fa-youtube',
    category: 'reach'
  },
  {
    id: 'youtube-likes',
    platform: 'youtube',
    type: 'likes',
    name: 'Like YouTube Video',
    buyerDescription: 'Get more likes on your YouTube videos',
    providerDescription: 'Like the specified YouTube video using your personal account',
    buyerPrice: 5.00,
    providerPrice: 2.00,
    deliveryTime: '6-12 hours',
    requirements: ['Public YouTube video'],
    icon: 'fab fa-youtube',
    category: 'engagement'
  },
  {
    id: 'youtube-comments',
    platform: 'youtube',
    type: 'comments',
    name: 'Comment on YouTube Video',
    buyerDescription: 'Add engaging comments to your YouTube videos',
    providerDescription: 'Write and post a comment on the specified YouTube video',
    buyerPrice: 5.00,
    providerPrice: 2.00,
    deliveryTime: '12-24 hours',
    requirements: ['Public YouTube video', 'Comment text provided'],
    icon: 'fab fa-youtube',
    category: 'engagement'
  },

  // Twitter Services
  {
    id: 'twitter-followers',
    platform: 'twitter',
    type: 'followers',
    name: 'Follow X / Twitter Account',
    buyerDescription: 'Increase your X / Twitter following',
    providerDescription: 'Follow the specified X / Twitter account using your personal account',
    buyerPrice: 5.00,
    providerPrice: 2.00,
    deliveryTime: '24-48 hours',
    requirements: ['Public X / Twitter account'],
    icon: 'fab fa-twitter',
    category: 'growth'
  },
  {
    id: 'twitter-likes',
    platform: 'twitter',
    type: 'likes',
    name: 'Like X / Twitter Tweet',
    buyerDescription: 'Get more likes on your X / Twitter tweets',
    providerDescription: 'Like the specified X / Twitter tweet using your personal account',
    buyerPrice: 5.00,
    providerPrice: 2.00,
    deliveryTime: '2-6 hours',
    requirements: ['Public X / Twitter post'],
    icon: 'fab fa-twitter',
    category: 'engagement'
  },
  {
    id: 'twitter-retweets',
    platform: 'twitter',
    type: 'retweets',
    name: 'Retweet X / Twitter Post',
    buyerDescription: 'Increase retweets on your X / Twitter content',
    providerDescription: 'Retweet the specified X / Twitter post using your personal account',
    buyerPrice: 5.00,
    providerPrice: 2.00,
    deliveryTime: '4-12 hours',
    requirements: ['Public X / Twitter post'],
    icon: 'fab fa-twitter',
    category: 'reach'
  },

  // TikTok Services
  {
    id: 'tiktok-followers',
    platform: 'tiktok',
    type: 'followers',
    name: 'Follow TikTok Account',
    buyerDescription: 'Grow your TikTok following with real followers',
    providerDescription: 'Follow the specified TikTok account using your personal account',
    buyerPrice: 5.00,
    providerPrice: 2.00,
    deliveryTime: '24-48 hours',
    requirements: ['Public TikTok account'],
    icon: 'fab fa-tiktok',
    category: 'growth'
  },
  {
    id: 'tiktok-likes',
    platform: 'tiktok',
    type: 'likes',
    name: 'Like TikTok Video',
    buyerDescription: 'Get more likes on your TikTok videos',
    providerDescription: 'Like the specified TikTok video using your personal account',
    buyerPrice: 5.00,
    providerPrice: 2.00,
    deliveryTime: '2-6 hours',
    requirements: ['Public TikTok video'],
    icon: 'fab fa-tiktok',
    category: 'engagement'
  },
  {
    id: 'tiktok-views',
    platform: 'tiktok',
    type: 'views',
    name: 'Watch TikTok Video',
    buyerDescription: 'Increase views on your TikTok videos',
    providerDescription: 'Watch the specified TikTok video completely',
    buyerPrice: 5.00,
    providerPrice: 2.00,
    deliveryTime: '1-3 hours',
    requirements: ['Public TikTok video'],
    icon: 'fab fa-tiktok',
    category: 'reach'
  },

  // Facebook Services
  {
    id: 'facebook-likes',
    platform: 'facebook',
    type: 'likes',
    name: 'Like Facebook Page',
    buyerDescription: 'Increase likes on your Facebook page',
    providerDescription: 'Like the specified Facebook page using your personal account',
    buyerPrice: 5.00,
    providerPrice: 2.00,
    deliveryTime: '24-48 hours',
    requirements: ['Public Facebook page'],
    icon: 'fab fa-facebook',
    category: 'growth'
  },
  {
    id: 'facebook-post-likes',
    platform: 'facebook',
    type: 'post-likes',
    name: 'Like Facebook Post',
    buyerDescription: 'Get more likes on your Facebook posts',
    providerDescription: 'Like the specified Facebook post using your personal account',
    buyerPrice: 5.00,
    providerPrice: 2.00,
    deliveryTime: '2-6 hours',
    requirements: ['Public Facebook post'],
    icon: 'fab fa-facebook',
    category: 'engagement'
  },
  {
    id: 'facebook-shares',
    platform: 'facebook',
    type: 'shares',
    name: 'Share Facebook Post',
    buyerDescription: 'Increase shares on your Facebook content',
    providerDescription: 'Share the specified Facebook post using your personal account',
    buyerPrice: 5.00,
    providerPrice: 2.00,
    deliveryTime: '4-12 hours',
    requirements: ['Public Facebook post'],
    icon: 'fab fa-facebook',
    category: 'reach'
  },
  {
    id: 'facebook-comments',
    platform: 'facebook',
    type: 'comments',
    name: 'Comment on Facebook Post',
    buyerDescription: 'Add engaging comments to your Facebook posts',
    providerDescription: 'Write and post a comment on the specified Facebook post',
    buyerPrice: 5.00,
    providerPrice: 2.00,
    deliveryTime: '6-12 hours',
    requirements: ['Public Facebook post', 'Comment text provided'],
    icon: 'fab fa-facebook',
    category: 'engagement'
  }
];

export const getServiceById = (id: string): ServiceDefinition | undefined => {
  return PREDEFINED_SERVICES.find(service => service.id === id);
};

export const getServicesByPlatform = (platform: string): ServiceDefinition[] => {
  return PREDEFINED_SERVICES.filter(service => service.platform === platform);
};

export const getServicesByCategory = (category: string): ServiceDefinition[] => {
  return PREDEFINED_SERVICES.filter(service => service.category === category);
};

export const getAllServices = (): ServiceDefinition[] => {
  return PREDEFINED_SERVICES;
}; 