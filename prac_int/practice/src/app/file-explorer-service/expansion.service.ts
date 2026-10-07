import { Injectable, signal } from '@angular/core';
import { FSNode } from './fs-node';

/** Option 2: shared expansion state via a scoped service */
@Injectable()
export class ExpansionService {
  private readonly expandedIds = signal(new Set<string>());

  /** Readonly signal so templates/computeds stay reactive */
  readonly ids = this.expandedIds.asReadonly();

  toggle(id: string) {
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

  expand(id: string) {
    this.expandedIds.update((set) => {
      const next = new Set(set);
      next.add(id);
      return next;
    });
  }

  expandAll(roots: FSNode[]) {
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
    walk(roots);
    this.expandedIds.set(ids);
  }

  collapseAll() {
    this.expandedIds.set(new Set());
  }

  remove(id: string) {
    this.expandedIds.update((set) => {
      const next = new Set(set);
      next.delete(id);
      return next;
    });
  }
}
