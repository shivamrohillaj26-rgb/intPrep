class Node{
    constructor(val , next = null){
      this.val = val;
      this.next = next;
    }
  }
  let head = new Node(1);
  let value=1;
  let temp = head;
  while(value<=5){
    let node = new Node(++value);
    temp.next = node;
    temp = node;
  }
  temp = head;
  while(temp != null){
    console.log(temp.val + " -> ");
    temp = temp.next
  }
  
  function reverse(head){
    let temp = head;
    let prev = null;
  
    while(temp !== null){
      let next = temp.next;
      temp.next = prev;
      prev = temp;
      temp = next;
    }
    return prev;
  }
  head =reverse(head);
  temp = head;
  while(temp != null){
    console.log(temp.val + " -> ");
    temp = temp.next
  }