export interface FSNode {
  id: string;
  name: string;
  type: 'file' | 'directory';
  children?: FSNode[];
}
