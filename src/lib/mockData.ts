import type { Post, Comment, SuggestedUser, User, Story } from "@/types";

export const currentUser: User = {
  id: "you",
  username: "dilshan",
  displayName: "Dilshan",
  avatarInitial: "D",
  avatarGradient: "from-zinc-500 to-zinc-700",
  avatarUrl: "https://i.pravatar.cc/200?img=12",
  isVerified: true,
  followers: 2841,
  following: 391,
  posts: 47,
  bio: "Photographer and visual storyteller. Capturing clean, timeless frames.",
};

const basePosts: Post[] = [
  {
    id: "1",
    user: {
      id: "u1",
      username: "maya_k",
      displayName: "Maya Krishnan",
      avatarInitial: "M",
      avatarGradient: "from-zinc-600 to-zinc-800",
      avatarUrl: "https://i.pravatar.cc/200?img=32",
      isVerified: true,
    },
    mediaUrl: "https://picsum.photos/id/1015/1400/1400",
    mediaLabel: "Shot on Fujifilm X-T5",
    mediaType: "image",
    aspectRatio: "square",
    caption:
      "Golden hour never hits the same twice. Worth every step of the climb.",
    tags: ["#landscape", "#goldenhour", "#fujifilm"],
    likes: 2418,
    comments: 148,
    isLiked: true,
    isSaved: false,
    location: "Ridge Trail, Ooty",
    createdAt: "2h",
  },
  {
    id: "2",
    user: {
      id: "u2",
      username: "devraj",
      displayName: "Dev Raj",
      avatarInitial: "D",
      avatarGradient: "from-zinc-500 to-neutral-700",
      avatarUrl: "https://i.pravatar.cc/200?img=15",
      isVerified: false,
    },
    mediaUrl: "https://samplelib.com/lib/preview/mp4/sample-10s.mp4",
    thumbnailUrl: "https://picsum.photos/id/1033/1400/900",
    mediaLabel: "Live at Echo Lounge · 4K",
    mediaType: "video",
    aspectRatio: "landscape",
    caption:
      "Opening night at Echo Lounge — the energy in that room was electric.",
    tags: ["#music", "#livemusic", "#indie"],
    likes: 892,
    comments: 64,
    isLiked: false,
    isSaved: true,
    location: "Echo Lounge, Bangalore",
    createdAt: "5h",
  },
  {
    id: "3",
    user: {
      id: "u3",
      username: "laila.v",
      displayName: "Laila Verma",
      avatarInitial: "L",
      avatarGradient: "from-zinc-500 to-zinc-700",
      avatarUrl: "https://i.pravatar.cc/200?img=47",
      isVerified: true,
    },
    mediaUrl: "https://picsum.photos/id/1025/1400/1400",
    mediaLabel: "Morning light study",
    mediaType: "image",
    aspectRatio: "square",
    caption:
      "Finding stillness in Sunday light. A quiet corner and a cup of tea.",
    tags: ["#calm", "#slowliving", "#interior"],
    likes: 1102,
    comments: 93,
    isLiked: false,
    isSaved: false,
    location: "Home studio",
    createdAt: "1d",
  },
];

const mockPostUsers: User[] = [
  {
    id: "u1",
    username: "maya_k",
    displayName: "Maya Krishnan",
    avatarInitial: "M",
    avatarGradient: "from-zinc-600 to-zinc-800",
    avatarUrl: "https://i.pravatar.cc/200?img=32",
    isVerified: true,
  },
  {
    id: "u2",
    username: "devraj",
    displayName: "Dev Raj",
    avatarInitial: "D",
    avatarGradient: "from-zinc-500 to-neutral-700",
    avatarUrl: "https://i.pravatar.cc/200?img=15",
    isVerified: false,
  },
  {
    id: "u3",
    username: "laila.v",
    displayName: "Laila Verma",
    avatarInitial: "L",
    avatarGradient: "from-zinc-500 to-zinc-700",
    avatarUrl: "https://i.pravatar.cc/200?img=47",
    isVerified: true,
  },
  {
    id: "u4",
    username: "artxneo",
    displayName: "Art x Neo",
    avatarInitial: "A",
    avatarGradient: "from-zinc-500 to-stone-700",
    avatarUrl: "https://i.pravatar.cc/200?img=58",
    isVerified: false,
  },
  {
    id: "u5",
    username: "sora",
    displayName: "Sora",
    avatarInitial: "S",
    avatarGradient: "from-zinc-600 to-zinc-800",
    avatarUrl: "https://i.pravatar.cc/200?img=5",
    isVerified: false,
  },
  {
    id: "u6",
    username: "priya_s",
    displayName: "Priya S.",
    avatarInitial: "P",
    avatarGradient: "from-zinc-500 to-zinc-700",
    avatarUrl: "https://i.pravatar.cc/200?img=23",
    isVerified: false,
  },
  {
    id: "u7",
    username: "kai.film",
    displayName: "Kai Film",
    avatarInitial: "K",
    avatarGradient: "from-zinc-600 to-zinc-900",
    avatarUrl: "https://i.pravatar.cc/200?img=41",
    isVerified: true,
  },
  {
    id: "u8",
    username: "neo_wave",
    displayName: "Neo Wave",
    avatarInitial: "N",
    avatarGradient: "from-zinc-500 to-neutral-700",
    avatarUrl: "https://i.pravatar.cc/200?img=61",
    isVerified: false,
  },
];

const imageIds = [
  1003, 1004, 1010, 1012, 1019, 1020, 1024, 1031, 1035, 1038, 1040, 1041, 1042,
  1050, 1052, 1055, 1057, 1062, 1066, 1070, 1080, 1081, 1082, 1084, 1085, 1089,
];

const videoPool = [
  {
    mediaUrl: "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
    thumbnailUrl: "https://picsum.photos/id/1060/1400/900",
    label: "Street reel clip",
  },
  {
    mediaUrl: "https://samplelib.com/lib/preview/mp4/sample-10s.mp4",
    thumbnailUrl: "https://picsum.photos/id/1033/1400/900",
    label: "Short film test",
  },
  {
    mediaUrl: "https://samplelib.com/lib/preview/mp4/sample-15s.mp4",
    thumbnailUrl: "https://picsum.photos/id/1037/1400/900",
    label: "Cinematic cut",
  },
];

const captions = [
  "Morning frames with soft light and quiet streets.",
  "Tested a new color grade and loved this output.",
  "Keeping edits minimal for a cleaner look.",
  "A quick capture from today’s walk.",
  "Simple composition, strong mood.",
  "One take, no filters, just natural contrast.",
];

const locations = [
  "Colombo",
  "Kandy",
  "Galle",
  "Ella",
  "Bangalore",
  "Chennai",
  "Home studio",
  "City center",
];

const generatedPosts: Post[] = Array.from({ length: 47 }, (_, index) => {
  const i = index + 4;
  const user = mockPostUsers[index % mockPostUsers.length];
  const isVideo = index % 6 === 2 || index % 6 === 5;
  const aspectRatio = isVideo
    ? (index % 2 === 0 ? "landscape" : "portrait")
    : (index % 3 === 0 ? "portrait" : "square");

  if (isVideo) {
    const video = videoPool[index % videoPool.length];
    return {
      id: `${i}`,
      user,
      mediaUrl: video.mediaUrl,
      thumbnailUrl: video.thumbnailUrl,
      mediaLabel: video.label,
      mediaType: "video",
      aspectRatio,
      caption: captions[index % captions.length],
      tags: ["#reel", "#visuals", "#daily"],
      likes: 240 + index * 17,
      comments: 12 + (index % 18),
      isLiked: index % 5 === 0,
      isSaved: index % 7 === 0,
      location: locations[index % locations.length],
      createdAt: index < 20 ? `${(index % 23) + 1}h` : `${Math.floor(index / 6) + 1}d`,
    };
  }

  const imageId = imageIds[index % imageIds.length];
  return {
    id: `${i}`,
    user,
    mediaUrl: `https://picsum.photos/id/${imageId}/1400/1400`,
    mediaLabel: "Editorial still",
    mediaType: "image",
    aspectRatio,
    caption: captions[index % captions.length],
    tags: ["#photo", "#minimal", "#street"],
    likes: 310 + index * 21,
    comments: 10 + (index % 24),
    isLiked: index % 4 === 0,
    isSaved: index % 6 === 0,
    location: locations[(index + 2) % locations.length],
    createdAt: index < 20 ? `${(index % 23) + 1}h` : `${Math.floor(index / 6) + 1}d`,
  };
});

export const mockPosts: Post[] = [...basePosts, ...generatedPosts];

export const mockComments: Comment[] = [
  {
    id: "c1",
    user: {
      id: "u2",
      username: "devraj",
      displayName: "Dev Raj",
      avatarInitial: "D",
      avatarGradient: "from-zinc-500 to-neutral-700",
      avatarUrl: "https://i.pravatar.cc/200?img=15",
    },
    text: "This color palette is unreal. The way the light hits the ridge is perfect.",
    createdAt: "1h",
    likes: 24,
    isLiked: false,
    replies: [
      {
        id: "c1r1",
        user: {
          id: "u1",
          username: "maya_k",
          displayName: "Maya Krishnan",
          avatarInitial: "M",
          avatarGradient: "from-zinc-600 to-zinc-800",
          avatarUrl: "https://i.pravatar.cc/200?img=32",
        },
        text: "Thank you so much. Nature just does its thing.",
        createdAt: "58m",
        likes: 8,
        isLiked: false,
      },
      {
        id: "c1r2",
        user: {
          id: "u4",
          username: "artxneo",
          displayName: "Art x Neo",
          avatarInitial: "A",
          avatarGradient: "from-zinc-500 to-stone-700",
          avatarUrl: "https://i.pravatar.cc/200?img=58",
        },
        text: "Film simulation? This looks like Velvia.",
        createdAt: "45m",
        likes: 5,
        isLiked: false,
      },
      {
        id: "c1r3",
        user: {
          id: "u1",
          username: "maya_k",
          displayName: "Maya Krishnan",
          avatarInitial: "M",
          avatarGradient: "from-zinc-600 to-zinc-800",
          avatarUrl: "https://i.pravatar.cc/200?img=32",
        },
        text: "@artxneo Exactly. Classic Velvia 100.",
        createdAt: "40m",
        likes: 11,
        isLiked: false,
      },
    ],
  },
  {
    id: "c2",
    user: {
      id: "u3",
      username: "laila.v",
      displayName: "Laila Verma",
      avatarInitial: "L",
      avatarGradient: "from-zinc-500 to-zinc-700",
      avatarUrl: "https://i.pravatar.cc/200?img=47",
    },
    text: "Which trail is this? I need coordinates immediately.",
    createdAt: "45m",
    likes: 17,
    isLiked: true,
    replies: [],
  },
  {
    id: "c3",
    user: {
      id: "u5",
      username: "sora",
      displayName: "Sora",
      avatarInitial: "S",
      avatarGradient: "from-zinc-600 to-zinc-800",
      avatarUrl: "https://i.pravatar.cc/200?img=5",
    },
    text: "You make me want to quit my desk job and become a nature photographer.",
    createdAt: "30m",
    likes: 41,
    isLiked: false,
    replies: [],
  },
];

export const suggestedUsers: SuggestedUser[] = [
  {
    id: "su1",
    username: "sora",
    displayName: "Sora",
    avatarInitial: "S",
    avatarGradient: "from-zinc-600 to-zinc-800",
    avatarUrl: "https://i.pravatar.cc/200?img=5",
    reason: "Followed by devraj",
    mutualFriends: 2,
  },
  {
    id: "su2",
    username: "artxneo",
    displayName: "Art x Neo",
    avatarInitial: "A",
    avatarGradient: "from-zinc-500 to-stone-700",
    avatarUrl: "https://i.pravatar.cc/200?img=58",
    reason: "New to Lumora",
  },
  {
    id: "su3",
    username: "priya_s",
    displayName: "Priya S.",
    avatarInitial: "P",
    avatarGradient: "from-zinc-500 to-zinc-700",
    avatarUrl: "https://i.pravatar.cc/200?img=23",
    reason: "3 mutual friends",
    mutualFriends: 3,
  },
  {
    id: "su4",
    username: "kai.film",
    displayName: "Kai Film",
    avatarInitial: "K",
    avatarGradient: "from-zinc-600 to-zinc-900",
    avatarUrl: "https://i.pravatar.cc/200?img=41",
    reason: "Popular in your area",
  },
  {
    id: "su5",
    username: "neo_wave",
    displayName: "Neo Wave",
    avatarInitial: "N",
    avatarGradient: "from-zinc-500 to-neutral-700",
    avatarUrl: "https://i.pravatar.cc/200?img=61",
    reason: "New to Lumora",
  },
];

export const mockStories: Story[] = [
  {
    id: "s1",
    username: "maya_k",
    mediaType: "image",
    mediaUrl: "https://picsum.photos/id/1011/900/1600",
    seen: false,
  },
  {
    id: "s2",
    username: "devraj",
    mediaType: "video",
    mediaUrl: "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
    thumbnailUrl: "https://picsum.photos/id/1060/900/1600",
    seen: false,
  },
  {
    id: "s3",
    username: "sora",
    mediaType: "image",
    mediaUrl: "https://picsum.photos/id/1018/900/1600",
    seen: true,
  },
  {
    id: "s4",
    username: "laila.v",
    mediaType: "image",
    mediaUrl: "https://picsum.photos/id/1027/900/1600",
    seen: false,
  },
  {
    id: "s5",
    username: "artxneo",
    mediaType: "video",
    mediaUrl: "https://samplelib.com/lib/preview/mp4/sample-15s.mp4",
    thumbnailUrl: "https://picsum.photos/id/1037/900/1600",
    seen: true,
  },
  {
    id: "s6",
    username: "priya_s",
    mediaType: "image",
    mediaUrl: "https://picsum.photos/id/1048/900/1600",
    seen: false,
  },
  {
    id: "s7",
    username: "Dilshan_x01",
    mediaType: "video",
    mediaUrl: "https://samplelib.com/lib/preview/mp4/sample-15s.mp4",
    thumbnailUrl: "https://picsum.photos/id/1037/900/1600",
    seen: false,
  },
];
