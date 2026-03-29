import { useTranslation } from 'react-i18next';
import { Search, Filter, User, MapPin, CalendarDays, Package, Network } from 'lucide-react';
import { ScrollArea, Input, Button, Badge } from '@/components/primitives';
import { cn } from '@/lib/cn';

type NodeType = 'character' | 'location' | 'event' | 'item';

interface MockNode {
  id: string;
  name: string;
  type: NodeType;
  connections: number;
}

const MOCK_NODES: MockNode[] = [
  { id: '1', name: '林夏', type: 'character', connections: 5 },
  { id: '2', name: '陈烨', type: 'character', connections: 3 },
  { id: '3', name: '古城遗址', type: 'location', connections: 4 },
  { id: '4', name: '密室发现', type: 'event', connections: 6 },
  { id: '5', name: '青铜面具', type: 'item', connections: 2 },
  { id: '6', name: '魏无忌', type: 'character', connections: 3 },
];

const typeIcons: Record<NodeType, typeof User> = {
  character: User,
  location: MapPin,
  event: CalendarDays,
  item: Package,
};

const typeBadgeVariant: Record<NodeType, 'accent' | 'default' | 'destructive' | 'outline'> = {
  character: 'accent',
  location: 'default',
  event: 'outline',
  item: 'default',
};

export function KnowledgeGraphPage() {
  const { t } = useTranslation();

  return (
    <div className="flex h-full">
      {/* Main Area */}
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
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter size={14} strokeWidth={1.5} />
            {t('knowledgeGraph.filter')}
          </Button>
        </div>

        {/* Canvas Placeholder */}
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

      {/* Node List Sidebar */}
      <div className="w-64 border-l border-border bg-card flex flex-col">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">
            {t('knowledgeGraph.nodeList')}
          </h2>
        </div>
        <ScrollArea className="flex-1">
          <ul className="py-1">
            {MOCK_NODES.map((node) => {
              const Icon = typeIcons[node.type];
              return (
                <li
                  key={node.id}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2',
                    'hover:bg-muted/50 transition-colors duration-fast ease-out cursor-pointer',
                  )}
                >
                  <Icon size={14} strokeWidth={1.5} className="text-muted-foreground shrink-0" />
                  <span className="text-sm text-foreground truncate flex-1">
                    {node.name}
                  </span>
                  <Badge variant={typeBadgeVariant[node.type]}>
                    {t(`knowledgeGraph.nodeTypes.${node.type}`)}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </div>
    </div>
  );
}
