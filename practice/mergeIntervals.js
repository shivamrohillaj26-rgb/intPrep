let arr = [[1,3],[2,6],[8,10],[15,18]];
let sorted = [...arr].sort((a,b)=>a[0]-b[0]);
let out = [[...sorted[0]]]
// console.log(out)
for(let i=1;i<arr.length;i++){
  let [start , end] = sorted[i];
  let last = out[out.length-1];

  if(last[1]>start){
    last[1] = Math.max(last[1] , end);
  }
  else{
    out.push([start,end])
  }
}
console.log(out);