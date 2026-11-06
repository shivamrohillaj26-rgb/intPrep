// Valid Parentheses

let str = "([{}])";

function check(str){
  let stack = [];
  let map = {
    '}':'{',
    ')':'(',
    ']':'['
  }

  for(let ch of str){
    if('{(['.includes(ch)){
      stack.push(ch);
    }
    else if(stack.pop() !== map[ch]){
      return false;
    }
  }
  return stack.length ? false : true; 
}

console.log(check(str));