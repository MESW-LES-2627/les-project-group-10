import { apiDelete, apiGet, apiPost, apiPut, ApiError } from './client';

/** A free educational post owned by the signed-in mentor. */
export interface MentorPostRecord {
  id: string;
  title: string;
  body: string;
  publishedAt: string;
  updatedAt: string;
}

export interface MentorPostInput {
  title: string;
  body: string;
}

/** Public view of a single free educational post, readable without authentication or payment. */
export interface PublicMentorPost extends MentorPostRecord {
  mentorId: string;
  mentorName: string;
  mentorHeadline: string;
}

export function getMentorPosts(): Promise<{ posts: MentorPostRecord[] }> {
  return apiGet('/api/mentors/me/posts');
}

export function createMentorPost(input: MentorPostInput): Promise<{ post: MentorPostRecord }> {
  return apiPost('/api/mentors/me/posts', input);
}

export function updateMentorPost(
  id: string,
  input: MentorPostInput,
): Promise<{ post: MentorPostRecord }> {
  return apiPut(`/api/mentors/me/posts/${encodeURIComponent(id)}`, input);
}

export function deleteMentorPost(id: string): Promise<void> {
  return apiDelete(`/api/mentors/me/posts/${encodeURIComponent(id)}`);
}

export async function getPublicMentorPost(
  mentorId: string,
  postId: string,
): Promise<PublicMentorPost | null> {
  try {
    const { post } = await apiGet<{ post: PublicMentorPost }>(
      `/api/mentors/${encodeURIComponent(mentorId)}/posts/${encodeURIComponent(postId)}`,
    );
    return post;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}
