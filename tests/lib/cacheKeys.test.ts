import { describe, expect, it } from "vitest";
import { cacheKeys } from "../../src/lib/cacheKeys";

describe("cacheKeys", () => {
  it("generates feed key", () => {
    expect(cacheKeys.feed("user_1")).toBe("feed:user_1");
  });

  it("normalizes profile username to lowercase", () => {
    expect(cacheKeys.profile("JohnDoe")).toBe("profile:johndoe");
  });

  it("generates profileMe key", () => {
    expect(cacheKeys.profileMe("abc")).toBe("profile:me:abc");
  });

  it("generates stories key", () => {
    expect(cacheKeys.storiesActive()).toBe("stories:active");
  });

  it("generates comments key", () => {
    expect(cacheKeys.comments("post-99")).toBe("comments:post-99");
  });
});
