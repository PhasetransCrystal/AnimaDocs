import type {ReactNode} from 'react';

import type {ResolvedContributor} from '@site/src/lib/contibutors';
import ContributorCard from '@site/src/components/ContributorCard';

import styles from './styles.module.css';

export type ContributorCreditsProps = {
  authors: readonly ResolvedContributor[];
};

export default function ContributorCredits({
  authors,
}: ContributorCreditsProps): ReactNode {
  if (authors.length === 0) {
    return null;
  }

  return (
    <section className={styles.section} aria-labelledby="document-authors-title">
      <h2 className={styles.heading} id="document-authors-title">
        本文作者
      </h2>
      <div className={styles.list}>
        {authors.map((author) => (
          <ContributorCard key={author.id} contributor={author} />
        ))}
      </div>
    </section>
  );
}
