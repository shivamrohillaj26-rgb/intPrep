type Suggestion = {
  word: string;
  frequency: number;
};

class TrieNode {
  readonly children = new Map<string, TrieNode>();
  word = '';
  frequency = 0;
}

export class AutocompleteTrie {
  private readonly root = new TrieNode();

  insert(word: string): void {
    const normalized = word.trim().toLowerCase();
    if (!normalized) {
      return;
    }

    let node = this.root;

    for (const char of normalized) {
      let child = node.children.get(char);
      if (!child) {
        child = new TrieNode();
        node.children.set(char, child);
      }
      node = child;
    }

    node.word = normalized;
    node.frequency += 1;
  }

  search(prefix: string, limit: number): string[] {
    let node = this.root;

    for (const char of prefix.trim().toLowerCase()) {
      const child = node.children.get(char);
      if (!child) {
        return [];
      }
      node = child;
    }

    const suggestions: Suggestion[] = [];
    this.collect(node, suggestions);

    return suggestions
      .sort((a, b) => b.frequency - a.frequency || a.word.localeCompare(b.word))
      .slice(0, limit)
      .map((suggestion) => suggestion.word);
  }

  private collect(node: TrieNode, suggestions: Suggestion[]): void {
    if (node.word) {
      suggestions.push({ word: node.word, frequency: node.frequency });
    }

    for (const child of node.children.values()) {
      this.collect(child, suggestions);
    }
  }
}
