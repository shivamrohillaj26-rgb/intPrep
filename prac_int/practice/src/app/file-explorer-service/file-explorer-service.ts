import { Component, inject } from '@angular/core';
import { ExpansionService } from './expansion.service';
import { FSNode } from './fs-node';
import { NodeService } from './node/node-service';

export type { FSNode };

@Component({
  selector: 'app-file-explorer-service',
  imports: [NodeService],
  providers: [ExpansionService],
  templateUrl: './file-explorer-service.html',
  styleUrl: './file-explorer-service.css',
})
export class FileExplorerService {
  private readonly expansion = inject(ExpansionService);

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

  expandAll() {
    this.expansion.expandAll(this.data);
  }

  collapseAll() {
    this.expansion.collapseAll();
  }

  deleteNode(id: string) {
    this.data = this.data.filter((node) => node.id !== id);
    this.expansion.remove(id);
  }
}
