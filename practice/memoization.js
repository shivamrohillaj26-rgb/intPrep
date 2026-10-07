//Memoization
function memoize(fn){
    let map = new Map();
    return function (...args){
        let key = JSON.stringify(args);
        if(map.has(key)){
            console.log("From Cached");
            return map.get(key);
        }
        map.set(key , fn(...args));
        return map.get(key);

    }
}
function sum(a , b , c){
    return a + b + c;
}
let memoized  = memoize(sum);
console.log(memoized(1,2,3));