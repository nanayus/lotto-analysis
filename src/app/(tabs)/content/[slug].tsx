import { ArticleScreen } from '@/features/content/ArticleScreen';
import { ARTICLES } from '@/features/content/articles';

export function generateStaticParams() {
  return ARTICLES.map(({ slug }) => ({ slug }));
}

export default ArticleScreen;
