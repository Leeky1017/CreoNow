import { forwardRef, type HTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, Network, User, MapPin, CalendarDays, Package } from 'lucide-react';
import { ScrollArea, Input, Button, Badge } from '@/components/primitives';
import { useKnowledgeGraphStore } from '@/stores/business/knowledgeGraphStore';
import { cn } from '@/lib/cn';

type NodeTypeKey = 'character' | 'location' | 'event' | 'item';

const TYPE_MAP: Record<string, NodeTypeKey> = {
  '人物': 'character',
  '地点': 'location',
  '事件': 'event',
  '物品': 'item',
};

const typeIcons: Record<NodeTypeKey, typeof User> = {
  character: User,
  location: MapPin,
  event: CalendarDays,
  item: Package,
};

const typeBadgeVariant: Record<NodeTypeKey, 'accent' | 'default' | 'outline'> = {
  character: 'accent',
  location: 'default',
  event: 'outline',
  item: 'default',
};

export interface KnowledgeGraphFeatureProps extends HTMLAttributes<HTMLDivElement> {}

export const KnowledgeGraphFeature = forwardRef<HTMLDivElement, KnowledgeGraphFeatureProps>(
  ({ className, ...props }, ref) => {
    const { t } = useTranslation();
    const { nodes, connections, selectedNodeId, filter, setFilter, selectNode } =
      useKnowledgeGraphStore();

    const filteredNodes = filter
      ? nodes.filter(
          (n) =>
            n.label.toLowerCase().includes(filter.toLowerCase()) ||
            n.description.toLowerCase().includes(filter.toLowerCase()),
        )
      : nodes;

    const selectedNode = selectedNodeId
      ? nodes.find((n) => n.id === selectedNodeId)
      : null;

    const selectedConnections = selectedNodeId
      ? connections.filter(
          (c) => c.sourceId === selectedNodeId || c.targetId === selectedNodeId,
        ).length
      : 0;

    return (
      <div ref={ref} className={cn('flex h-full', className)} {...props}>
        {/* Main canvas area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <div className="relative flex-1 max-w-xs">
              <Search
                size={14}
                strokeWidth={1.5}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <Input
                placeholder={t('knowledgeGraph.searchPlaceholder')}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter size={14} strokeWidth={1.5} />
              {t('knowledgeGraph.filter')}
            </Button>
          </div>

          {/* Canvas placeholder */}
          <div className="flex-1 flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                <Network size={32} strokeWidth={1.5} className="text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium">{t('knowledgeGraph.canvasPlaceholder')}</p>
              <p className="text-xs">{t('knowledgeGraph.canvasHint')}</p>
            </div>
          </div>
        </div>

        {/* Node list sidebar */}
        <div className="w-64 border-l border-border bg-card flex flex-col">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-medium text-foreground">
              {t('knowledgeGraph.nodeList')}
            </h2>
          </div>
          <ScrollArea className="flex-1">
            <ul className="py-1">
              {filteredNodes.map((node) => {
                const typeKey = TYPE_MAP[node.type] ?? 'character';
                const Icon = typeIcons[typeKey];
                return (
                  <li
                    key={node.id}
                    onClick={() => selectNode(node.id === selectedNodeId ? null : node.id)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 cursor-pointer',
                      'hover:bg-muted/50 transition-colors duration-fast ease-out',
                      selectedNodeId === node.id && 'bg-muted/60',
                    )}
                  >
                    <Icon size={14} strokeWidth={1.5} className="text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground truncate flex-1">
                      {node.label}
                    </span>
                    <Badge variant={typeBadgeVariant[typeKey]}>
                      {t(`knowledgeGraph.nodeTypes.${typeKey}`)}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>

          {/* Selected node detail card */}
          {selectedNode && (
            <div className="border-t border-border p-4 space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                {selectedNode.label}
              </h3>
              <Badge variant={typeBadgeVariant[TYPE_MAP[selectedNode.type] ?? 'character']}>
                {t(`knowledgeGraph.nodeTypes.${TYPE_MAP[selectedNode.type] ?? 'character'}`)}
              </Badge>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {selectedNode.description}
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedConnections} connections
              </p>
            </div>
          )}
        </div>
      </div>
    );
  },
);

KnowledgeGraphFeature.displayName = 'KnowledgeGraphFeature';
