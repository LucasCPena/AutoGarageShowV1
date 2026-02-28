import { describe, it, expect } from 'vitest';
import { listingImageAlt, newsImageAlt, eventImageAlt } from '../image-alt';

describe('image-alt util', () => {
  it('returns listing alt with fallback and suffix', () => {
    expect(listingImageAlt('Fusca', 1)).toContain('Fusca');
    expect(listingImageAlt('', 2)).toContain('(foto 2)');
  });

  it('news and event alts have proper prefixes', () => {
    expect(newsImageAlt('Titulo', 1)).toContain('Noticia:');
    expect(eventImageAlt(undefined)).toContain('Evento:');
  });
});
