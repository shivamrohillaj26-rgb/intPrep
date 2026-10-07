// Singly linked list — build, print, reverse
// node practice/linkedList.js

class ListNode {
  constructor(val, next = null) {
    this.val = val;
    this.next = next;
  }
}

function listFromArray(arr) {
  const dummy = new ListNode(0);
  let tail = dummy;
  for (const val of arr) {
    tail.next = new ListNode(val);
    tail = tail.next;
  }
  return dummy.next;
}

function listToArray(head) {
  const out = [];
  let cur = head;
  while (cur) {
    out.push(cur.val);
    cur = cur.next;
  }
  return out;
}

function reverseList(head) {
  let prev = null;
  let cur = head;
  while (cur) {
    const next = cur.next;
    cur.next = prev;
    prev = cur;
    cur = next;
  }
  return prev;
}

const head = listFromArray([1, 2, 3]);
console.log('built  ', listToArray(head)); // [1, 2, 3]

const reversed = reverseList(head);
console.log('reverse', listToArray(reversed)); // [3, 2, 1]
