import { describe, it, expect } from 'vitest';
import { extractYouTubeVideoId, toYouTubeEmbedUrl, normalizeYouTubeUrl } from '../youtube';

describe('youtube util', () => {
  it('extracts video id from url and id', () => {
    expect(extractYouTubeVideoId('5qap5aO4i9A')).toBe('5qap5aO4i9A');
    expect(extractYouTubeVideoId('https://youtu.be/5qap5aO4i9A')).toBe('5qap5aO4i9A');
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=5qap5aO4i9A')).toBe('5qap5aO4i9A');
  });

  it('normalizes to watch url and embed url', () => {
    expect(normalizeYouTubeUrl('https://youtu.be/5qap5aO4i9A')).toBe('https://www.youtube.com/watch?v=5qap5aO4i9A');
    expect(toYouTubeEmbedUrl('https://www.youtube.com/watch?v=5qap5aO4i9A')).toBe('https://www.youtube.com/embed/5qap5aO4i9A');
  });
});
