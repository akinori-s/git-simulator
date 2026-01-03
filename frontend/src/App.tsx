import { useState, useCallback, useMemo } from 'react';
import type { Commit, CommitID } from './git/SimpleGit';
import { useRepoList } from './git/useRepoList';
import { useCurrentRepo } from './git/useCurrentRepo';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar'
import {
  Home,
  LayoutDashboard,
  MessageCircle,
  Settings,
  GitBranch,
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

const nodeDefaults = {
  sourcePosition: Position.Right,
  targetPosition: Position.Left,
};

const initialNodes: Node[] = [
  { id: '1', data: { label: 'Node 1' }, position: { x: 0  , y: 0   }, ...nodeDefaults },
  { id: '2', data: { label: 'Node 2' }, position: { x: 200, y: 0   }, ...nodeDefaults },
  { id: '3', data: { label: 'Node 3' }, position: { x: 200, y: 100 }, ...nodeDefaults },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', type: 'bezier', markerEnd: { type: 'arrowclosed'} },
  { id: 'e1-3', source: '1', target: '3', type: 'bezier', markerEnd: { type: 'arrowclosed'} },
];

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
  const [currentHead, setCurrentHead] = useState('2');
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
    const laneHeight = 120; // Vertical spacing between branch lanes
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
    const NODE_X_SPACING = 200;

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
              <div className="text-gray-500">{commit.id.slice(0, 7)}</div>
              <div className="text-gray-500">{primaryBranch}</div>
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
          padding: '10px',
          width: 140,
        },
      });

      commit.parents.forEach((parentId: CommitID, index: number) => {
        const isMergeSecondParent = index > 0;
        edges.push({
          id: `e-${parentId}-${commit.id}${isMergeSecondParent ? '-merge' : ''}`,
          source: parentId,
          target: commit.id,
          type: 'smoothstep',
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

    // Create nodes
    // allCommits.map((commit: Commit) => {
    //   const primaryBranch = commitLane.get(commit.id) || 'unknown';
    //   const baseY = branchY.get(primaryBranch) || 0;

    //   // Stagger vertically within lane to avoid perfect alignment
    //   const staggerOffset = (parseInt(commit.id.split('-').pop() || '0', 10) % 7) * 15 - 45;

    //   return {
    //     id: commit.id,
    //     data: {
    //       label: (
    //         <div className="text-xs text-center">
    //           <div className="font-bold">{commit.message}</div>
    //           <div className="text-gray-500">{commit.id.slice(0, 7)}</div>
    //         </div>
    //       ),
    //     },
    //     position: {
    //       x: commitX.get(commit.id) || 0,
    //       y: baseY + staggerOffset,
    //     },
    //     sourcePosition: Position.Right,
    //     targetPosition: Position.Left,
    //     style: {
    //       background: commit.id === branches.get(currentBranch) ? '#e7f3ff' : '#fff',
    //       border: commit.id === branches.get(currentBranch) ? '3px solid #007acc' : '1px solid #999',
    //       borderRadius: '8px',
    //       padding: '10px',
    //       width: 140,
    //     },
    //   };
    // });

    // allCommits.forEach((commit: Commit) => {
    //   commit.parents.forEach((parentId: CommitID, index: number) => {
    //     const isMergeSecondParent = index > 0;
    //     edges.push({
    //       id: `e-${parentId}-${commit.id}${isMergeSecondParent ? '-merge' : ''}`,
    //       source: parentId,
    //       target: commit.id,
    //       type: 'bezier',
    //       markerEnd: { type: 'arrowclosed' },
    //       style: { stroke: isMergeSecondParent ? '#ff6b6b' : '#999', strokeWidth: 2 },
    //       animated: isMergeSecondParent,
    //     });
    //   });
    // });





    // Create nodes
    // const nodes: Node[] = allCommits.map((commit: Commit) => {
    //   const primaryBranch = commitLane.get(commit.id) || 'unknown';
    //   const baseY = branchY.get(primaryBranch) || 0;

    //   // Stagger vertically within lane to avoid perfect alignment
    //   const staggerOffset = (parseInt(commit.id.split('-').pop() || '0', 10) % 7) * 15 - 45;

    //   return {
    //     id: commit.id,
    //     data: {
    //       label: (
    //         <div className="text-xs text-center">
    //           <div className="font-bold">{commit.message}</div>
    //           <div className="text-gray-500">{commit.id.slice(0, 7)}</div>
    //         </div>
    //       ),
    //     },
    //     position: {
    //       x: commitX.get(commit.id) || 0,
    //       y: baseY + staggerOffset,
    //     },
    //     sourcePosition: Position.Right,
    //     targetPosition: Position.Left,
    //     style: {
    //       background: commit.id === branches.get(currentBranch) ? '#e7f3ff' : '#fff',
    //       border: commit.id === branches.get(currentBranch) ? '3px solid #007acc' : '1px solid #999',
    //       borderRadius: '8px',
    //       padding: '10px',
    //       width: 140,
    //     },
    //   };
    // });

    // Create edges
    // const edges: Edge[] = [];
    // allCommits.forEach((commit: Commit) => {
    //   commit.parents.forEach((parentId: CommitID, index: number) => {
    //     const isMergeSecondParent = index > 0;
    //     edges.push({
    //       id: `e-${parentId}-${commit.id}${isMergeSecondParent ? '-merge' : ''}`,
    //       source: parentId,
    //       target: commit.id,
    //       type: 'bezier',
    //       markerEnd: { type: 'arrowclosed' },
    //       style: { stroke: isMergeSecondParent ? '#ff6b6b' : '#999', strokeWidth: 2 },
    //       animated: isMergeSecondParent,
    //     });
    //   });
    // });

    console.log("nodes", nodes);
    console.log("edges", edges);
    return { nodes, edges };
  }, [repo]); // Depend on repo (or [currentRepoId] to optimize if appropriate)

  const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    console.log(`git checkout ${node.id}`);
    setCurrentHead(node.id);
  }, [setCurrentHead]);

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuButton>
                <Home />
                <span>Dashboard</span>
              </SidebarMenuButton>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuButton>
                <LayoutDashboard />
                <span>Graph</span>
              </SidebarMenuButton>
              <SidebarMenuItem>
                <GitBranch />
                <span>Projects</span>
                <br/>
                <button onClick={() => createRepo(prompt('Repo name') || 'new-repo')}>
                  + New Repo
                </button>
                <ul>
                  {Array.from(repos.entries()).map(([id, git]) => (
                    <li key={id}>
                      <strong
                        style={{ cursor: 'pointer', color: id === currentRepoId ? 'blue' : 'black' }}
                        onClick={() => switchTo(id)}
                      >
                        {git.getName()}
                      </strong>
                      {repos.size > 1 && (
                        <button onClick={() => deleteRepo(id)} style={{ marginLeft: '8px', fontSize: '10px' }}>
                          X
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <MessageCircle />
                <span>Commits</span>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Button onClick={() => repo?.commit("asdfasdf", new Map<string, string>([
                    ["mode", "development"],
                    ["version", "2.1.4"],
                    ["env", "staging"]
                  ]))} className=''>
                    git commit
                </Button>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Button onClick={() => repo?.branch(prompt('Repo name') || 'new-branch')} className=''>
                    git branch
                </Button>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <MessageCircle />
                <span>Branches</span>
              </SidebarMenuItem>
              {
                repo ?
                [...repo?.branches.keys()].map((branchName, idx) => (
                  <SidebarMenuItem key={idx}>
                    <Button onClick={() => repo?.checkout(branchName)} className=''>
                        {branchName}
                    </Button>
                  </SidebarMenuItem>
                ))
                : <></>
              }
            </SidebarMenu>
          </SidebarGroup>
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuButton>
                  <Settings />
                  <span>Add Node</span>
              </SidebarMenuButton>
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
          onNodeDoubleClick={onNodeDoubleClick}
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
