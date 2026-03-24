import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  mapPost,
  mapStory,
  mapSuggestedUser,
  mapUser,
  relativeTime,
} from "../../src/lib/apiMappers";

describe("apiMappers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-23T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("mapUser strips @ from username and computes initials", () => {
    const user = mapUser({
      id: "u1",
      username: "@john",
      displayName: "john wick",
      isFollowing: true,
    });

    expect(user.username).toBe("john");
    expect(user.avatarInitial).toBe("J");
    expect(user.isFollowing).toBe(true);
    expect(user.avatarGradient).toMatch(/from-/);
  });

  it("mapSuggestedUser applies defaults", () => {
    const user = mapSuggestedUser({
      id: "u2",
      username: "alice",
      displayName: "Alice",
    });

    expect(user.reason).toBe("Suggested for you");
    expect(user.isFollowing).toBe(false);
    expect(user.isFollowedBy).toBe(false);
  });

  it("mapStory maps media and createdAt", () => {
    const story = mapStory({
      id: "s1",
      mediaType: "VIDEO",
      blobUrl: "https://example.com/video.mp4",
      createdAt: new Date("2026-03-23T10:00:00.000Z"),
      authorId: "u1",
      author: {
        username: "john",
        avatarBlobUrl: "https://example.com/avatar.jpg",
      },
    });

    expect(story.mediaType).toBe("video");
    expect(story.thumbnailUrl).toBe("https://example.com/video.mp4");
    expect(story.createdAt).toBe("2026-03-23T10:00:00.000Z");
  });

  it("mapPost maps tags, counters, and relative time", () => {
    const post = mapPost({
      id: "p1",
      mediaType: "IMAGE",
      blobUrl: "https://example.com/image.jpg",
      caption: "hello #one #Two",
      location: "Colombo",
      createdAt: new Date("2026-03-23T11:30:00.000Z"),
      author: {
        id: "u1",
        username: "@john",
        displayName: "John",
        isFollowing: true,
        avatarBlobUrl: null,
      },
      _count: {
        likes: 7,
        comments: 3,
      },
      isLiked: true,
      isSaved: false,
    });

    expect(post.mediaType).toBe("image");
    expect(post.tags).toEqual(["#one", "#Two"]);
    expect(post.likes).toBe(7);
    expect(post.comments).toBe(3);
    expect(post.createdAt).toBe("30m");
    expect(post.user.isFollowing).toBe(true);
  });

  it("relativeTime returns date label for older dates", () => {
    const value = relativeTime(new Date("2026-03-10T12:00:00.000Z"));
    expect(value).toBe("Mar 10");
  });
});
