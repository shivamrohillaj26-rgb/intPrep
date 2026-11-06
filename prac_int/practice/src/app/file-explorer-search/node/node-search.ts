import { Component, effect, input, output, signal } from '@angular/core';
import { FSNode } from '../file-explorer-search';

@Component({
  selector: 'app-node-search',
  imports: [NodeSearch],
  templateUrl: './node-search.html',
  styleUrl: './node-search.css',
})
export class NodeSearch {
  nodes = input<FSNode | null>(null);
  searchQuery = input('');
  searchActive = input(false);
  onDeleteNode = output<string>();

  isExpanded = signal(false);

  constructor() {
    // Interview tip: when search is active, auto-expand so matches aren't hidden.
    effect(() => {
      if (this.searchActive()) {
        this.isExpanded.set(true);
      }
    });
  }

  toggleExpand() {
    this.isExpanded.update((v) => !v);
  }

  /** Split name so the matching part can be highlighted. */
  highlightParts(name: string): { text: string; match: boolean }[] {
    const q = this.searchQuery().trim();
    if (!q) {
      return [{ text: name, match: false }];
    }

    const lowerName = name.toLowerCase();
    const lowerQ = q.toLowerCase();
    const index = lowerName.indexOf(lowerQ);

    if (index === -1) {
      return [{ text: name, match: false }];
    }

    return [
      { text: name.slice(0, index), match: false },
      { text: name.slice(index, index + q.length), match: true },
      { text: name.slice(index + q.length), match: false },
    ].filter((part) => part.text.length > 0);
  }

  addDirectory = () => {
    const name = prompt('Enter the name of the directory');
    const node = this.nodes();
    if (name && node) {
      node.children ??= [];
      node.children.push({ id: name, name, type: 'directory' });
      this.isExpanded.set(true);
    }
  };

  addFile = () => {
    const name = prompt('Enter the name of the file');
    const node = this.nodes();
    if (name && node) {
      node.children ??= [];
      node.children.push({ id: name, name, type: 'file' });
      this.isExpanded.set(true);
    }
  };

  deleteChild(id: string) {
    const node = this.nodes();
    if (node?.children) {
      node.children = node.children.filter((child) => child.id !== id);
    }
  }
}
