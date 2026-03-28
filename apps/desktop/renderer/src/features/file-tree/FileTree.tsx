import { useState } from 'react';
import { ScrollArea } from '@/components/primitives';
import { FileNode } from '@/components/composites/FileNode';
import { FolderNode } from '@/components/composites/FolderNode';

interface TreeFile {
  type: 'file';
  name: string;
}

interface TreeFolder {
  type: 'folder';
  name: string;
  children: TreeItem[];
}

type TreeItem = TreeFile | TreeFolder;

const mockData: TreeItem[] = [
  {
    type: 'folder',
    name: '我的小说',
    children: [
      {
        type: 'folder',
        name: '第一卷',
        children: [
          { type: 'file', name: '第一章.md' },
          { type: 'file', name: '第二章.md' },
          { type: 'file', name: '第三章.md' },
        ],
      },
      {
        type: 'folder',
        name: '第二卷',
        children: [
          { type: 'file', name: '第四章.md' },
          { type: 'file', name: '第五章.md' },
        ],
      },
      { type: 'file', name: '大纲.md' },
      { type: 'file', name: '角色设定.md' },
    ],
  },
  {
    type: 'folder',
    name: '笔记',
    children: [
      { type: 'file', name: '灵感.md' },
      { type: 'file', name: '参考资料.md' },
    ],
  },
];

function TreeItemRenderer({
  item,
  selectedFile,
  onSelect,
}: {
  item: TreeItem;
  selectedFile: string | null;
  onSelect: (name: string) => void;
}) {
  if (item.type === 'file') {
    return (
      <FileNode
        name={item.name}
        selected={selectedFile === item.name}
        onClick={() => onSelect(item.name)}
      />
    );
  }

  return (
    <FolderNode name={item.name} defaultOpen>
      {item.children.map((child) => (
        <TreeItemRenderer
          key={child.name}
          item={child}
          selectedFile={selectedFile}
          onSelect={onSelect}
        />
      ))}
    </FolderNode>
  );
}

export function FileTree() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  return (
    <ScrollArea className="h-full">
      <div className="py-1">
        {mockData.map((item) => (
          <TreeItemRenderer
            key={item.name}
            item={item}
            selectedFile={selectedFile}
            onSelect={setSelectedFile}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
