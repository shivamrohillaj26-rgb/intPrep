import { Component, signal } from '@angular/core';
import { FILE_TREE, FsNode, NodeType } from './file-tree.model';
import { TreeNode } from './tree-node';

/**
 * Interview-simple file explorer.
 *
 * Must-have: recursive tree + expand/collapse + indent.
 * Follow-up: add (+F/+D) / delete (×) with immutable tree updates.
 *
 * Expand state lives ON each TreeNode (local signal) — same pattern
 * most React interview blogs use (useState per folder). Easier to code
 * under time pressure than a lifted Set + event re-emit chain.
 */
@Component({
  selector: 'app-file-explorer',
  imports: [TreeNode],
  templateUrl: './file-explorer.html',
  styleUrl: './file-explorer.css',
})
export class FileExplorer {
  tree = signal<FsNode[]>(structuredClone(FILE_TREE));

  addChild(parentId: string, type: NodeType) {
    const name = prompt(`New ${type} name:`)?.trim();
    if (!name) return;

    const child: FsNode = {
      id: `${parentId}-${type}-${Date.now()}`,
      name,
      type,
      ...(type === 'folder' ? { children: [] } : {}),
    };

    this.tree.update((nodes) => insertChild(nodes, parentId, child));
  }

  deleteNode(id: string) {
    if (!confirm('Delete this item?')) return;
    this.tree.update((nodes) => removeNode(nodes, id));
  }
}

/** Append child under folder id — immutable walk */
function insertChild(nodes: FsNode[], parentId: string, child: FsNode): FsNode[] {
  return nodes.map((n) => {
    if (n.id === parentId && n.type === 'folder') {
      return { ...n, children: [...(n.children ?? []), child] };
    }
    if (n.children?.length) {
      return { ...n, children: insertChild(n.children, parentId, child) };
    }
    return n;
  });
}

/** Remove node by id (and its subtree) — immutable walk */
function removeNode(nodes: FsNode[], id: string): FsNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) =>
      n.children?.length ? { ...n, children: removeNode(n.children, id) } : n,
    );
}
