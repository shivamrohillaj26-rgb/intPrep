import { Component, EventEmitter, input, Output, signal } from '@angular/core';
import { FSNode } from '../file-explorer';

@Component({
  selector: 'app-node',
  imports: [],
  templateUrl: './node.html',
  styleUrl: './node.css',
})
export class Node {
  @Output() onDeleteNode = new EventEmitter<string>()
  nodes = input<FSNode | null>(null);
  isExpanded  = signal(false)
  addDirectory = () => {
    let name  = prompt('Enter the name of the directory');
    if (name) {
      this.nodes()?.children?.push({ id: name, name: name, type: 'directory' });
    }
    this.isExpanded.set(true);
    console.log('addDirectory' + name);
  }
  addFile = () => {
    let name  = prompt('Enter the name of the file');
    if (name) {
      this.nodes()?.children?.push({ id: name, name: name, type: 'file' });
    }
    this.isExpanded.set(true);
    console.log('addFile');
  }
  deleteNode(id: string){
    const node = this.nodes();
    if (node?.children) {
      node.children = node.children.filter(child => child.id !== id);
    }
  }

  

}
