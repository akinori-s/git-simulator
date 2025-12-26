import { useState, useEffect } from 'react';
import repoManager from './repoManager';

export function useRepoList() {
  const [_, forceUpdate] = useState({});

  useEffect(() => {
    const unsubscribe = repoManager.subscribe(() => forceUpdate({}));
    return unsubscribe;
  }, []);

  const currentRepo = repoManager.getCurrentRepo();

  return {
    repos: repoManager.getAllRepos(),
    currentRepoId: repoManager.getCurrentRepoId(),
    currentRepoName: currentRepo?.getName() ?? 'none',
    createRepo: repoManager.createRepo.bind(repoManager),
    switchTo: repoManager.switchTo.bind(repoManager),
    deleteRepo: repoManager.deleteRepo.bind(repoManager),
  };
}
