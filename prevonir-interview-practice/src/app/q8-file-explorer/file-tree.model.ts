export type NodeType = 'file' | 'folder';

export interface FsNode {
  id: string;
  name: string;
  type: NodeType;
  children?: FsNode[]; // only folders
}

/** Sample tree — same shape interviews use */
export const FILE_TREE: FsNode[] = [
  {
    id: 'src',
    name: 'src',
    type: 'folder',
    children: [
      {
        id: 'src-app',
        name: 'app',
        type: 'folder',
        children: [
          { id: 'app-ts', name: 'app.ts', type: 'file' },
          { id: 'app-html', name: 'app.html', type: 'file' },
          {
            id: 'src-home',
            name: 'home',
            type: 'folder',
            children: [
              { id: 'home-ts', name: 'home.ts', type: 'file' },
              { id: 'home-html', name: 'home.html', type: 'file' },
            ],
          },
        ],
      },
      { id: 'main-ts', name: 'main.ts', type: 'file' },
      { id: 'styles-css', name: 'styles.css', type: 'file' },
    ],
  },
  {
    id: 'public',
    name: 'public',
    type: 'folder',
    children: [{ id: 'favicon', name: 'favicon.ico', type: 'file' }],
  },
  { id: 'package', name: 'package.json', type: 'file' },
  { id: 'readme', name: 'README.md', type: 'file' },
];
