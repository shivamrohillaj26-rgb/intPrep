import { Component } from '@angular/core';
import { Node } from './node/node';

export interface FSNode{
  id: string,
  name: string,
  type: 'file' | 'directory',
  children?: FSNode[],
}

@Component({
  selector: 'app-file-explorer',
  imports: [Node],
  templateUrl: './file-explorer.html',
  styleUrl: './file-explorer.css',
})
export class FileExplorer {
  deleteNode(id: string){
    this.data = this.data.filter(node => node.id !== id);
  }
  data: FSNode[] = [
    {
      id: "src",
      name: "src",
      type: "directory",
      children: [
        {
          id: "app",
          name: "app",
          type: "directory",
          children: [
            {
              id: "app.component.ts",
              name: "app.component.ts",
              type: "file",
            },  
            {
              id: "app.component.html",
              name: "app.component.html",
              type: "file",
            },
            {
              id: "app.component.scss",
              name: "app.component.scss",
              type: "file",
            }
          ]
        }
      ]
    },
    {
      id: "public",
      name: "public",
      type: "directory",
      children: [
        {
          id: "index.html",
          name: "index.html",
          type: "file",
        },
        {
          id: "style.css",
          name: "style.css",
          type: "file",
        },
      ]
    }
  ]
}
