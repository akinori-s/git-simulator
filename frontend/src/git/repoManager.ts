import { SimpleGit } from './SimpleGit';

type RepoID = string;

class RepoManager {
  private repos = new Map<RepoID, SimpleGit>();
  private currentRepoId: RepoID | null = null;
  private listeners = new Set<() => void>();

  private notify() {
    this.listeners.forEach(cb => cb());
  }

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  createRepo(name: string): RepoID {
    const id = `repo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const git = new SimpleGit(name);
    this.repos.set(id, git);

    if (this.currentRepoId === null) {
      this.currentRepoId = id;
    }

    this.notify();
    return id;
  }

  switchTo(id: RepoID) {
    if (this.repos.has(id) && this.currentRepoId !== id) {
      this.currentRepoId = id;
      this.notify();
    }
  }

  deleteRepo(id: RepoID) {
    if (this.repos.size <= 1) return;

    this.repos.delete(id);

    if (this.currentRepoId === id) {
      this.currentRepoId = Array.from(this.repos.keys())[0] ?? null;
    }

    this.notify();
  }

  getCurrentRepo(): SimpleGit | null {
    return this.currentRepoId ? this.repos.get(this.currentRepoId) ?? null : null;
  }

  getAllRepos(): ReadonlyMap<RepoID, SimpleGit> {
    return new Map(this.repos);
  }

  getCurrentRepoId(): RepoID | null {
    return this.currentRepoId;
  }
}

export const repoManager = new RepoManager();
repoManager.createRepo('my-project'); // initial repo

export default repoManager;
