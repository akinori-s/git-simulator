import './App.css'
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button'
import '@xyflow/react/dist/style.css'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Position,
  type Node,
  type Edge,
  type FitViewOptions,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  type OnNodeDrag,
  type DefaultEdgeOptions,
} from '@xyflow/react';

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
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes],
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges],
  );
  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Button >
        Add Node
      </Button>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDrag={onNodeDrag}
        nodesDraggable={false}
        fitView
        fitViewOptions={fitViewOptions}
        defaultEdgeOptions={defaultEdgeOptions}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}

export default App
