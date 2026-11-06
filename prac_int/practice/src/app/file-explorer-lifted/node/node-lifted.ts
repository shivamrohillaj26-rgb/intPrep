import { Component, computed, input, output } from '@angular/core';
import { FSNode } from '../file-explorer-lifted';

@Component({
  selector: 'app-node-lifted',
  imports: [NodeLifted],
  templateUrl: './node-lifted.html',
  styleUrl: './node-lifted.css',
})
export class NodeLifted {
  nodes = input<FSNode | null>(null);
  expandedIds = input<Set<string>>(new Set());

  toggleExpand = output<string>();
  ensureExpanded = output<string>();
  onDeleteNode = output<string>();

  isExpanded = computed(() => {
    const id = this.nodes()?.id;
    return id ? this.expandedIds().has(id) : false;
  });

  addDirectory = () => {
    const name = prompt('Enter the name of the directory');
    const node = this.nodes();
    if (name && node) {
      node.children ??= [];
      node.children.push({ id: name, name, type: 'directory' });
      this.ensureExpanded.emit(node.id);
    }
  };

  addFile = () => {
    const name = prompt('Enter the name of the file');
    const node = this.nodes();
    if (name && node) {
      node.children ??= [];
      node.children.push({ id: name, name, type: 'file' });
      this.ensureExpanded.emit(node.id);
    }
  };

  deleteChild(id: string) {
    const node = this.nodes();
    if (node?.children) {
      node.children = node.children.filter((child) => child.id !== id);
    }
  }
}
