import { useState, useEffect } from 'react';
import repoManager from './repoManager';
import { SimpleGit } from './SimpleGit';

export function useCurrentRepo(): {
  git: SimpleGit;
  name: string;
  commits: readonly any[];
  allCommits: readonly any[];
  branches: ReadonlyMap<string, string>;
  currentBranch: string;
  commit: SimpleGit['commit'];
  branch: SimpleGit['branch'];
  checkout: SimpleGit['checkout'];
  merge: SimpleGit['merge'];
} | null {
  const [_, forceUpdate] = useState({});
  const [currentGit, setCurrentGit] = useState<SimpleGit | null>(repoManager.getCurrentRepo());

  // React to repo switches
  useEffect(() => {
    const unsubscribe = repoManager.subscribe(() => {
      const newGit = repoManager.getCurrentRepo();
      if (newGit !== currentGit) {
        setCurrentGit(newGit);
        forceUpdate({});
      }
    });
    return unsubscribe;
  }, [currentGit]);

  // Subscribe to current repo's internal changes
  useEffect(() => {
    if (!currentGit) return;
    const unsubscribe = currentGit.subscribe(() => forceUpdate({}));
    return unsubscribe;
  }, [currentGit]);

  if (!currentGit) return null;

  return {
    git: currentGit,
    name: currentGit.getName(),
    commits: currentGit.getCommits(),
    allCommits: currentGit.getAllCommits(),
    branches: currentGit.getBranches(),
    currentBranch: currentGit.getCurrentBranch(),
    commit: currentGit.commit.bind(currentGit),
    branch: currentGit.branch.bind(currentGit),
    checkout: currentGit.checkout.bind(currentGit),
    merge: currentGit.merge.bind(currentGit),
  };
}
