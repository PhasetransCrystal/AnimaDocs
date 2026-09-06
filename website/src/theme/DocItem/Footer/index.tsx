import type {ReactNode} from 'react';

import {useDoc} from '@docusaurus/plugin-content-docs/client';
import OriginalDocItemFooter from '@theme-original/DocItem/Footer';
import ContributorCredits from '@site/src/components/ContributorCredits';
import {buildContributors} from '@site/src/lib/contibutors';

type ContributorFrontMatter = {
  authors?: unknown;
};

export default function DocItemFooter(): ReactNode {
  const {frontMatter, metadata} = useDoc();
  const authors = buildContributors(
    (frontMatter as ContributorFrontMatter).authors,
    metadata.id,
  );

  return (
    <>
      <ContributorCredits authors={authors} />
      <OriginalDocItemFooter />
    </>
  );
}
