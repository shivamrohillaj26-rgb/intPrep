import { Component, computed, inject, input, output } from '@angular/core';
import { ExpansionService } from '../expansion.service';
import { FSNode } from '../fs-node';

@Component({
  selector: 'app-node-service',
  imports: [NodeService],
  templateUrl: './node-service.html',
  styleUrl: './node-service.css',
})
export class NodeService {
  private readonly expansion = inject(ExpansionService);

  nodes = input<FSNode | null>(null);
  onDeleteNode = output<string>();

  isExpanded = computed(() => {
    const id = this.nodes()?.id;
    return id ? this.expansion.ids().has(id) : false;
  });

  toggle() {
    const id = this.nodes()?.id;
    if (id) {
      this.expansion.toggle(id);
    }
  }

  addDirectory = () => {
    const name = prompt('Enter the name of the directory');
    const node = this.nodes();
    if (name && node) {
      node.children ??= [];
      node.children.push({ id: name, name, type: 'directory' });
      this.expansion.expand(node.id);
    }
  };

  addFile = () => {
    const name = prompt('Enter the name of the file');
    const node = this.nodes();
    if (name && node) {
      node.children ??= [];
      node.children.push({ id: name, name, type: 'file' });
      this.expansion.expand(node.id);
    }
  };

  deleteChild(id: string) {
    const node = this.nodes();
    if (node?.children) {
      node.children = node.children.filter((child) => child.id !== id);
    }
    this.expansion.remove(id);
  }
}
