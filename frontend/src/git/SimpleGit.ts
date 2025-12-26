type CommitID = string;

export interface Commit {
  readonly id: CommitID;
  readonly message: string;
  readonly parents: readonly CommitID[];
  readonly files: ReadonlyMap<string, string>;
  readonly author: string;
  readonly timestamp: number;
}

export class SimpleGit {
  private commits = new Map<CommitID, Commit>();
  private branches = new Map<string, CommitID>();
  private head = 'main';
  private nextId = 0;
  private listeners = new Set<() => void>();
  private name: string;

  constructor(name: string) {
    this.name = name;
    this.commit('Initial commit', new Map());
  }

  private generateId(): CommitID {
    return `${this.name}-c${this.nextId++}`;
  }

  private notify() {
    this.listeners.forEach(cb => cb());
  }

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  commit(message: string, files: Map<string, string>) {
    const currentId = this.branches.get(this.head);
    const parents = currentId ? [currentId] : [];
    const newId = this.generateId();

    const newCommit: Commit = {
      id: newId,
      message,
      parents,
      files: new Map(files),
      author: 'user',
      timestamp: Date.now(),
    };

    this.commits.set(newId, newCommit);
    this.branches.set(this.head, newId);
    this.notify();
  }

  branch(name: string) {
    const current = this.branches.get(this.head);
    if (current) {
      this.branches.set(name, current);
      this.notify();
    }
  }

  checkout(branch: string) {
    if (this.branches.has(branch)) {
      this.head = branch;
      this.notify();
    }
  }

  merge(branch: string) {
    const other = this.branches.get(branch);
    const base = this.branches.get(this.head);
    if (!other || !base || base === other) return;

    const newId = this.generateId();
    const newCommit: Commit = {
      id: newId,
      message: `Merge branch '${branch}' into ${this.head}`,
      parents: [base, other],
      files: this.commits.get(base)?.files ?? new Map(),
      author: 'user',
      timestamp: Date.now(),
    };

    this.commits.set(newId, newCommit);
    this.branches.set(this.head, newId);
    this.notify();
  }

  getName(): string {
    return this.name;
  }

  getCommits(): readonly Commit[] {
    const result: Commit[] = [];
    let current = this.commits.get(this.branches.get(this.head) ?? '');
    while (current) {
      result.push(current);
      if (current.parents.length === 0) break;
      current = this.commits.get(current.parents[0]) ?? undefined;
    }
    return result;
  }

  getAllCommits(): readonly Commit[] {
    return Array.from(this.commits.values());
  }

  getBranches(): ReadonlyMap<string, CommitID> {
    return new Map(this.branches);
  }

  getCurrentBranch(): string {
    return this.head;
  }
}
