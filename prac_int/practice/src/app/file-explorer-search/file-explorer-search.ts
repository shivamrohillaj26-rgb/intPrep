import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NodeSearch } from './node/node-search';

export interface FSNode {
  id: string;
  name: string;
  type: 'file' | 'directory';
  children?: FSNode[];
}

@Component({
  selector: 'app-file-explorer-search',
  imports: [NodeSearch, FormsModule],
  templateUrl: './file-explorer-search.html',
  styleUrl: './file-explorer-search.css',
})
export class FileExplorerSearch {
  searchQuery = signal('');

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
            { id: 'app.config.ts', name: 'app.config.ts', type: 'file' },
            { id: 'app.routes.ts', name: 'app.routes.ts', type: 'file' },
          ],
        },
        {
          id: 'assets',
          name: 'assets',
          type: 'directory',
          children: [
            { id: 'logo.svg', name: 'logo.svg', type: 'file' },
            { id: 'styles.css', name: 'styles.css', type: 'file' },
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
        { id: 'favicon.ico', name: 'favicon.ico', type: 'file' },
        { id: 'style.css', name: 'style.css', type: 'file' },
      ],
    },
    {
      id: 'docs',
      name: 'docs',
      type: 'directory',
      children: [
        { id: 'readme.md', name: 'readme.md', type: 'file' },
        { id: 'api.md', name: 'api.md', type: 'file' },
      ],
    },
  ];

  /** Filtered tree for the current query (keeps ancestors of matches). */
  filteredData = computed(() => this.filterTree(this.data, this.searchQuery()));

  /** While searching, force directories open so matches are visible. */
  searchActive = computed(() => this.searchQuery().trim().length > 0);

  deleteNode(id: string) {
    this.data = this.data.filter((node) => node.id !== id);
  }

  /**
   * Keep a node if its name matches OR any descendant matches.
   * That way `app.component.ts` still shows under `src` → `app`.
   */
  private filterTree(nodes: FSNode[], query: string): FSNode[] {
    const q = query.trim().toLowerCase();
    if (!q) {
      return nodes;
    }

    const result: FSNode[] = [];

    for (const node of nodes) {
      const selfMatch = node.name.toLowerCase().includes(q);
      const filteredChildren = node.children ? this.filterTree(node.children, query) : [];

      if (selfMatch || filteredChildren.length > 0) {
        result.push({
          ...node,
          // Folder name matched but no child matched → show all children.
          // Otherwise show only the matching branch.
          children: node.children
            ? selfMatch && filteredChildren.length === 0
              ? node.children
              : filteredChildren
            : undefined,
        });
      }
    }

    return result;
  }
}
