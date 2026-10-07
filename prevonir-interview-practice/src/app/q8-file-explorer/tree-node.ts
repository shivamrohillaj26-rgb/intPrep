import { Component, input, output, signal } from '@angular/core';
import { FsNode, NodeType } from './file-tree.model';

/**
 * One row. Folders recurse into themselves when open.
 * isOpen is LOCAL — no parent Set, no toggle event bubbling.
 */
@Component({
  selector: 'tree-node',
  imports: [TreeNode],
  templateUrl: './tree-node.html',
  styleUrl: './tree-node.css',
})
export class TreeNode {
  node = input.required<FsNode>();
  depth = input(0);

  /** follow-up only — parent owns the tree data */
  add = output<{ parentId: string; type: NodeType }>();
  remove = output<string>();

  /** local expand — like React useState(false) per folder */
  isOpen = signal(false);

  get isFolder() {
    return this.node().type === 'folder';
  }

  onRowClick() {
    if (this.isFolder) this.isOpen.update((open) => !open);
  }

  onAdd(type: NodeType, event: Event) {
    event.stopPropagation();
    this.isOpen.set(true); // show new child
    this.add.emit({ parentId: this.node().id, type });
  }

  onDelete(event: Event) {
    event.stopPropagation();
    this.remove.emit(this.node().id);
  }
}
