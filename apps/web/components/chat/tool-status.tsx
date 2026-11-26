import { getToolOrDynamicToolName, type DynamicToolUIPart, type ToolUIPart } from 'ai';
import { Loader } from '@/components/ai-elements/loader';
import { toolStatusLabel } from './helpers/tool-status-label';

// "Шукаю фото: холодильник…" while the tool runs; nothing once its output is in.
export function ToolStatus({ part }: { part: DynamicToolUIPart | ToolUIPart }) {
  if (part.state !== 'input-streaming' && part.state !== 'input-available') return null;
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
      <Loader />
      {toolStatusLabel(getToolOrDynamicToolName(part), part.input)}
    </div>
  );
}
