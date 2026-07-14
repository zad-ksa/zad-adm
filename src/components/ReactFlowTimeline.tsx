"use client";

import { useMemo } from "react";
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap,
  Handle,
  Position,
  Edge,
  Node,
  MarkerType
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Infinity as InfinityIcon,
  CheckSquare,
  Square
} from "lucide-react";
import { formatDurationArabic } from "@/lib/dateUtils";

interface Step {
  id: string;
  name: string;
  isDone: boolean;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  order: number;
}

interface Stage {
  id: string;
  name: string;
  description?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  duration?: string | null;
  order: number;
  isCurrent: boolean;
  isContinuous: boolean;
  isActive: boolean;
  isDone: boolean;
  steps: Step[];
}

// Custom Node for a Stage
const StageNodeComponent = ({ data }: { data: any }) => {
  const isPast = data.isPast;
  const isCurrent = data.isCurrent;
  const isContinuous = data.isContinuous;
  const percentage = data.percentage;
  
  return (
    <div className={`p-4 rounded-2xl shadow-md border bg-white dark:bg-slate-800 text-right w-64 transition-all
      ${isCurrent 
        ? 'border-primary ring-2 ring-primary/20 dark:ring-primary/40' 
        : isPast 
          ? 'border-emerald-500/50' 
          : isContinuous
            ? 'border-amber-500/50'
            : 'border-slate-200 dark:border-slate-700'
      }`}
    >
      {/* Target/Source handles for sequential connection */}
      {!isContinuous && (
        <>
          <Handle type="target" position={Position.Right} style={{ background: '#cbd5e1' }} />
          <Handle type="source" position={Position.Left} style={{ background: '#cbd5e1' }} />
        </>
      )}
      
      {/* Source handle downwards for its child steps */}
      {data.stepsCount > 0 && (
        <Handle type="source" position={Position.Bottom} id="steps" style={{ background: '#6366f1' }} />
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full
            ${isPast 
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
              : isCurrent 
                ? 'bg-primary text-white' 
                : isContinuous
                  ? 'bg-amber-500/10 text-amber-600'
                  : 'bg-slate-100 dark:bg-slate-900/50 text-slate-500'}`}
          >
            {isPast ? 'مكتملة' : isCurrent ? 'المرحلة الحالية' : isContinuous ? 'نشاط مستمر' : 'قيد الانتظار'}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold">المرحلة {data.index + 1}</span>
        </div>

        <div className="flex items-start gap-2">
          {isContinuous ? (
            <InfinityIcon className="w-4 h-4 text-amber-500 mt-1 shrink-0" />
          ) : isPast ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-1 shrink-0" />
          ) : (
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center text-[8px] font-black mt-1 shrink-0
              ${isCurrent ? 'border-primary text-primary' : 'border-slate-300 text-slate-400'}`}
            >
              {data.index + 1}
            </div>
          )}
          <h4 className="font-bold text-[1rem] text-slate-800 dark:text-slate-100 line-clamp-1">{data.name}</h4>
        </div>

        {data.description && (
          <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {data.description}
          </p>
        )}

        {/* Date and duration info */}
        <div className="flex flex-wrap items-center gap-2 text-[9px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-50 dark:border-slate-700/50">
          {data.duration && (
            <span className="flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {data.duration}
            </span>
          )}
          {data.startDate && (
            <span className="flex items-center gap-0.5">
              <Calendar className="w-2.5 h-2.5" />
              {new Date(data.startDate).toLocaleDateString("ar-SA")}
            </span>
          )}
        </div>

        {/* Steps count summary and mini-progress */}
        {data.stepsCount > 0 && (
          <div className="pt-2 space-y-1">
            <div className="flex justify-between items-center text-[9px] text-slate-400 dark:text-slate-500 font-extrabold">
              <span>الخطوات</span>
              <span>{data.completedStepsCount} / {data.stepsCount} مكتملة</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-1 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${isPast ? 'bg-emerald-500' : 'bg-primary'}`}
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Custom Node for a Step
const StepNodeComponent = ({ data }: { data: any }) => {
  const isDone = data.isDone;
  
  return (
    <div className={`p-2.5 rounded-xl border bg-white dark:bg-slate-800/80 text-right w-48 shadow-sm flex items-start gap-2.5 transition-all
      ${isDone 
        ? 'border-emerald-500/20 bg-emerald-500/[0.01]' 
        : 'border-slate-150 dark:border-slate-800'}`}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#6366f1' }} />
      
      {isDone ? (
        <CheckSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
      ) : (
        <Square className="w-3.5 h-3.5 text-slate-350 dark:text-slate-600 shrink-0 mt-0.5" />
      )}
      
      <div className="space-y-0.5 min-w-0">
        <span className={`text-[1rem] font-bold block truncate ${isDone ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
          {data.name}
        </span>
        {data.startDate && (
          <span className="text-[8px] text-slate-400 flex items-center gap-0.5">
            <Calendar className="w-2.5 h-2.5" />
            البدء: {new Date(data.startDate).toLocaleDateString("ar-SA")}
          </span>
        )}
      </div>
    </div>
  );
};

// Map custom nodes to React Flow
const nodeTypes = {
  stage: StageNodeComponent,
  step: StepNodeComponent
};

export default function ReactFlowTimeline({ 
  stages 
}: { 
  stages: Stage[] 
}) {
  const sequentialStages = stages?.filter(s => !s.isContinuous && s.isActive !== false) || [];
  const continuousStages = stages?.filter(s => s.isContinuous) || [];

  // Generate nodes and edges dynamically based on stages and steps
  const { nodes, edges } = useMemo(() => {
    const generatedNodes: Node[] = [];
    const generatedEdges: Edge[] = [];

    // Lay out sequential stages horizontally from RIGHT to LEFT (as RTL is default)
    // In React Flow, X axis goes right, so right-to-left layout means we decrease X or start from positive and decrease it.
    // Let's lay them out: Stage 1 is at x = 1200, Stage 2 at x = 900, Stage 3 at x = 600, etc.
    const startX = 900;
    const stageWidthGap = 340;

    sequentialStages.forEach((stage, stageIdx) => {
      const isPast = stage.isDone || 
                     (sequentialStages.findIndex(s => s.isCurrent) > stageIdx) || 
                     (stage.steps?.length > 0 && stage.steps.every(s => s.isDone));
      const isCurrent = stage.isCurrent;
      
      const steps = stage.steps || [];
      const totalSteps = steps.length;
      const completedSteps = steps.filter(s => s.isDone).length;
      const percentage = isPast ? 100 : (totalSteps > 0 ? (completedSteps / totalSteps) * 100 : (isCurrent ? 50 : 0));
      const duration = formatDurationArabic(stage.startDate, stage.endDate) || stage.duration;

      const stageX = startX - (stageIdx * stageWidthGap);
      const stageY = 50;

      // Add Stage Node
      generatedNodes.push({
        id: `stage-${stage.id}`,
        type: "stage",
        position: { x: stageX, y: stageY },
        data: {
          index: stageIdx,
          name: stage.name,
          description: stage.description,
          startDate: stage.startDate,
          duration,
          isPast,
          isCurrent,
          isContinuous: false,
          stepsCount: totalSteps,
          completedStepsCount: completedSteps,
          percentage
        }
      });

      // Connect sequential stages
      if (stageIdx > 0) {
        const prevStage = sequentialStages[stageIdx - 1];
        generatedEdges.push({
          id: `edge-stage-${prevStage.id}-${stage.id}`,
          source: `stage-${prevStage.id}`,
          target: `stage-${stage.id}`,
          animated: prevStage.isCurrent || (isPast && !stage.isDone),
          style: { 
            stroke: prevStage.isDone ? '#10b981' : '#0f766e', 
            strokeWidth: 3 
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: prevStage.isDone ? '#10b981' : '#0f766e'
          }
        });
      }

      // Add Step Nodes vertically below their respective Stage
      steps.forEach((step, stepIdx) => {
        // Lay out steps vertically below the stage node
        const stepX = stageX + 32; // Offset a bit to align nicely under the Stage
        const stepY = stageY + 220 + (stepIdx * 75);

        generatedNodes.push({
          id: `step-${step.id}`,
          type: "step",
          position: { x: stepX, y: stepY },
          data: {
            name: step.name,
            isDone: step.isDone,
            startDate: step.startDate
          }
        });

        // Edge connecting Stage to its Step
        generatedEdges.push({
          id: `edge-stage-step-${stage.id}-${step.id}`,
          source: `stage-${stage.id}`,
          sourceHandle: "steps",
          target: `step-${step.id}`,
          style: { stroke: '#818cf8', strokeWidth: 1.5 },
          type: "smoothstep"
        });
      });
    });

    // Add continuous stages as floating cards on the far left or top
    continuousStages.forEach((stage, idx) => {
      const stageX = startX + 380;
      const stageY = 50 + (idx * 160);
      const duration = formatDurationArabic(stage.startDate, stage.endDate) || stage.duration;

      generatedNodes.push({
        id: `stage-${stage.id}`,
        type: "stage",
        position: { x: stageX, y: stageY },
        data: {
          index: idx,
          name: stage.name,
          description: stage.description,
          startDate: stage.startDate,
          duration,
          isPast: false,
          isCurrent: false,
          isContinuous: true,
          stepsCount: 0,
          completedStepsCount: 0,
          percentage: 0
        }
      });
    });

    return { nodes: generatedNodes, edges: generatedEdges };
  }, [sequentialStages, continuousStages]);

  return (
    <div className="h-[500px] w-full border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-900/50 overflow-hidden relative transition-colors">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={1.5}
        dir="ltr" // Flow coordinates are LTR, inside handles are absolute
      >
        <Background gap={16} size={1} />
        <Controls showInteractive={false} className="dark:bg-slate-800 dark:border-slate-700 [&_button]:dark:bg-slate-800 [&_button]:dark:border-slate-700 [&_svg]:dark:fill-slate-100" />
        <MiniMap zoomable pannable className="dark:bg-slate-800 dark:border-slate-700" nodeColor={() => '#0f766e'} />
      </ReactFlow>
    </div>
  );
}
