export const cacheKeys = {
  feed: (userId: string) => `feed:${userId}`,
  profile: (username: string) => `profile:${username.toLowerCase()}`,
  profileMe: (userId: string) => `profile:me:${userId}`,
  storiesActive: () => "stories:active",
  comments: (postId: string) => `comments:${postId}`,
};
