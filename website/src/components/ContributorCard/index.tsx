import {useState, type ReactNode} from 'react';

import type {ResolvedContributor} from '@site/src/lib/contibutors';

import styles from './styles.module.css';

export type ContributorCardProps = {
  contributor: ResolvedContributor;
};

function getInitials(name: string): string {
  const normalizedName = name.trim();
  return normalizedName.slice(0, 2).toUpperCase() || '?';
}

export default function ContributorCard({
  contributor,
}: ContributorCardProps): ReactNode {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = getInitials(contributor.name);

  return (
    <article className={styles.card}>
      <a
        className={styles.avatarLink}
        href={contributor.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`访问 ${contributor.name} 的 GitHub 主页`}>
        {imageFailed ? (
          <span className={styles.avatarFallback} aria-hidden="true">
            {initials}
          </span>
        ) : (
          <img
            className={styles.avatar}
            src={contributor.icon}
            alt={`${contributor.name}的头像`}
            width={64}
            height={64}
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
          />
        )}
      </a>

      <div className={styles.content}>
        <h3 className={styles.name}>{contributor.name}</h3>
        {contributor.describe && (
          <p className={styles.description}>{contributor.describe}</p>
        )}
        <a
          className={styles.githubLink}
          href={contributor.url}
          target="_blank"
          rel="noopener noreferrer">
          GitHub
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    </article>
  );
}
