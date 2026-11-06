let arr = [5, 4, -1, 7, 8];

function maxSum(arr){
  let best = arr[0];
  let curr = arr[0];

  for(let i=1;i<arr.length;i++){
    curr = Math.max(arr[i] , curr+arr[i]);
    best = Math.max(best , curr);
  }

  return best;
}
console.log(maxSum(arr));