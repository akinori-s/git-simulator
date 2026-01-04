import { useMemo } from 'react';
import type { Commit, CommitID } from './git/SimpleGit';
import { useRepoList } from './git/useRepoList';
import { useCurrentRepo } from './git/useCurrentRepo';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarSeparator,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  File,
  Folder,
  GitCompareArrows,
  Trash2,
  ChevronRight,
} from 'lucide-react'
import '@xyflow/react/dist/style.css'
import {
  ReactFlow,
  Background,
  Controls,
  // MiniMap,
  // addEdge,
  // applyNodeChanges,
  // applyEdgeChanges,
  Position,
  type Node,
  type Edge,
  type FitViewOptions,
  // type OnConnect,
  // type OnNodesChange,
  // type OnEdgesChange,
  type OnNodeDrag,
  type DefaultEdgeOptions,
} from '@xyflow/react';
import { Button } from './components/ui/button';

const fitViewOptions: FitViewOptions = {
  padding: 0.2,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  animated: false,
};

const onNodeDrag: OnNodeDrag = (_, node) => {
  console.log('drag event', node.data);
};

function App() {
  const {
    repos,
    currentRepoId,
    createRepo,
    switchTo,
    deleteRepo
  } = useRepoList();

  const repo = useCurrentRepo(); // Hoist this to top level

  const { nodes, edges } = useMemo(() => {
    if (!repo) return { nodes: [], edges: [] };

    const allCommits = repo.allCommits; // All commits, including those on other branches
    const branches = repo.branches;     // Map<branchName, commitId>
    const currentBranch = repo.currentBranch;

    // Assign each branch a Y-lane (row)
    const branchOrder = Array.from<string>(branches.keys());
    const laneHeight = 70; // Vertical spacing between branch lanes
    const branchY = new Map<string, number>();
    branchOrder.forEach((branch, index) => {
      branchY.set(branch, index * laneHeight);
    });

    // Determine which lane a commit belongs to (primary branch)
    const commitLane = new Map<string, string>();

    // Walk from each branch tip down to root, claiming commits for that lane
    for (const branch of branchOrder) {
      let commitId = branches.get(branch);
      while (commitId && !commitLane.has(commitId)) {
        commitLane.set(commitId, branch);

        const commit = allCommits.find((c: Commit) => c.id === commitId);
        if (!commit || commit.parents.length === 0) break;

        // For merges: only follow first parent (Git convention)
        commitId = commit.parents[0];
      }
    }

    const visited = new Set<string>();
    const stack: string[] = [];
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const NODE_WIDTH = 120;
    const NODE_X_SPACING = NODE_WIDTH + 45;

    // Start from all branch tips
    branches.forEach((commitId: CommitID) => {
      if (!visited.has(commitId)) stack.push(commitId);
    });

    while (stack.length > 0) {
      const commitId = stack.pop()!;
      if (visited.has(commitId)) continue;
      visited.add(commitId);

      const commit = allCommits.find((c: Commit) => c.id === commitId);
      if (!commit) continue;

      const primaryBranch = commitLane.get(commit.id) || 'unknown';

      nodes.push({
        id: commit.id,
        data: {
          label: (
            <div className="text-xs text-center">
              <div className="font-bold">{commit.message}</div>
              <div className="text-gray-500">{primaryBranch}</div>
              <div className="text-gray-500">#{commit.seq_id}</div>
            </div>
          ),
        },
        position: {
          x: commit.seq_id * NODE_X_SPACING || 0,
          y: branchY.get(primaryBranch) || 0,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        style: {
          background: commit.id === branches.get(currentBranch) ? '#e7f3ff' : '#fff',
          border: commit.id === branches.get(currentBranch) ? '1px solid #007acc' : '1px solid #999',
          borderRadius: '8px',
          padding: '5px',
          width: NODE_WIDTH,
        },
      });

      commit.parents.forEach((parentId: CommitID, index: number) => {
        const isMergeSecondParent = index > 0;
        edges.push({
          id: `e-${parentId}-${commit.id}${isMergeSecondParent ? '-merge' : ''}`,
          source: parentId,
          target: commit.id,
          type: 'straight',
          markerEnd: { type: 'arrowclosed' },
          style: { stroke: isMergeSecondParent ? '#ff6b6b' : '#999', strokeWidth: 2 },
          animated: isMergeSecondParent,
        });
      });

      // Push parents (in reverse order to preserve left-to-right)
      commit.parents.slice().reverse().forEach((parentId: CommitID) => {
        if (!visited.has(parentId)) {
          stack.push(parentId);
        }
      });
    }

    return { nodes, edges };
  }, [repo]); // Depend on repo (or [currentRepoId] to optimize if appropriate)

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Repositories</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => createRepo(prompt('Repo name') || 'new-repo')}>
                    <GitCompareArrows />
                    New Repository
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {Array.from(repos.entries()).map(([id, git]) => (
                  <SidebarMenuItem key={id}>
                    <SidebarMenuButton onClick={() => switchTo(id)} isActive={id === currentRepoId}>
                      <File />
                      {git.getName()}
                    </SidebarMenuButton>
                    {repos.size > 1 && (
                      <SidebarMenuAction showOnHover>
                        <Trash2 onClick={() => deleteRepo(id)}/>
                      </SidebarMenuAction>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarGroupLabel>Commits</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <Button onClick={() => repo?.commit(prompt('Commit message') || 'commit', new Map<string, string>([
                      ["mode", "development"],
                      ["version", "2.1.4"],
                      ["env", "staging"]
                    ]))} className=''>
                      git commit
                  </Button>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Button onClick={() => repo?.branch(prompt('Branch name') || 'new-branch')} className=''>
                      git branch
                  </Button>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <Collapsible
                  className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
                  defaultOpen={true}
                >
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton>
                      <ChevronRight className="transition-transform" />
                      <Folder />
                      Branches
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {
                        repo &&
                        [...repo?.branches.keys()].map((branchName, idx) => (
                          <SidebarMenuButton key={idx} onClick={() => repo?.checkout(branchName)} isActive={repo?.currentBranch === branchName}>
                            {branchName}
                          </SidebarMenuButton>
                        ))
                      }
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <SidebarTrigger className='absolute'/>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeDrag={onNodeDrag}
          // onNodeDoubleClick={onNodeDoubleClick}
          zoomOnDoubleClick={false}
          nodesDraggable={false}
          // fitView
          fitViewOptions={fitViewOptions}
          defaultEdgeOptions={defaultEdgeOptions}
        >
          <Background />
          <Controls />
          {/* <MiniMap /> */}
        </ReactFlow>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default App
