import { Component, signal } from '@angular/core';
import { NodeLifted } from './node/node-lifted';

export interface FSNode {
  id: string;
  name: string;
  type: 'file' | 'directory';
  children?: FSNode[];
}

@Component({
  selector: 'app-file-explorer-lifted',
  imports: [NodeLifted],
  templateUrl: './file-explorer-lifted.html',
  styleUrl: './file-explorer-lifted.css',
})
export class FileExplorerLifted {
  /** Option 1: expansion state lives in the parent */
  expandedIds = signal(new Set<string>());

  data: FSNode[] = [
    {
      id: 'src',
      name: 'src',
      type: 'directory',
      children: [
        {
          id: 'app',
          name: 'app',
          type: 'directory',
          children: [
            { id: 'app.component.ts', name: 'app.component.ts', type: 'file' },
            { id: 'app.component.html', name: 'app.component.html', type: 'file' },
            { id: 'app.component.scss', name: 'app.component.scss', type: 'file' },
          ],
        },
      ],
    },
    {
      id: 'public',
      name: 'public',
      type: 'directory',
      children: [
        { id: 'index.html', name: 'index.html', type: 'file' },
        { id: 'style.css', name: 'style.css', type: 'file' },
      ],
    },
  ];

  isExpanded(id: string): boolean {
    return this.expandedIds().has(id);
  }

  toggleExpand(id: string) {
    this.expandedIds.update((set) => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  ensureExpanded(id: string) {
    this.expandedIds.update((set) => {
      const next = new Set(set);
      next.add(id);
      return next;
    });
  }

  expandAll() {
    const ids = new Set<string>();
    const walk = (nodes: FSNode[]) => {
      for (const node of nodes) {
        if (node.type === 'directory') {
          ids.add(node.id);
          if (node.children) {
            walk(node.children);
          }
        }
      }
    };
    walk(this.data);
    this.expandedIds.set(ids);
  }

  collapseAll() {
    this.expandedIds.set(new Set());
  }

  deleteNode(id: string) {
    this.data = this.data.filter((node) => node.id !== id);
    this.expandedIds.update((set) => {
      const next = new Set(set);
      next.delete(id);
      return next;
    });
  }
}
