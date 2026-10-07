let str = "pwwkew";

let best =0;
let start = 0;
let end =1;
let seen = new Set()
seen.add(str[0]);
// seen.add(str[1]);

while(end < str.length){
  
  if(seen.has(str[end])){
    best = Math.max(best , end-start);
    seen = new Set();
    start = end;
    end  = start+1;
    seen.add(str[start])
  }
  else{
    seen.add(str[end]);
    end++;
    best = Math.max(best , end-start);
  }
}
console.log(best);