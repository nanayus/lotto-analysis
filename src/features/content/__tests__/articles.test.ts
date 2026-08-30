import { describe, expect, test } from '@jest/globals';

import { ARTICLES, getArticleBySlug, getPublishedArticles } from '../articles';

describe('content articles', () => {
  test('keeps article slugs unique and resolves a detail article', () => {
    const slugs = ARTICLES.map((article) => article.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
    expect(ARTICLES).toHaveLength(10);
    expect(getArticleBySlug('lotto-myths-and-reality')?.title).toContain('로또의 허와 실');
    expect(getArticleBySlug('missing-article')).toBeUndefined();
  });

  test('gives every article a structured introduction, body, and conclusion', () => {
    for (const article of ARTICLES) {
      expect(article.sections[0].label).toBe('서론');
      expect(article.sections.at(-1)?.label).toBe('결론');
      expect(article.sections.some((section) => section.label === '본론')).toBe(true);
      expect(article.sections.every((section) => section.paragraphs.length >= 2)).toBe(true);
    }
  });

  test('returns published articles in newest-first order', () => {
    const articles = getPublishedArticles();

    expect(articles).not.toBe(ARTICLES);
    expect(articles.map((article) => article.publishedAt)).toEqual(
      [...articles].map((article) => article.publishedAt).sort().reverse(),
    );
  });
});
