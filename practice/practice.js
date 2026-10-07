// Reduce

// let arr = [1,2,3,4,5];
// let sum  = arr.reduce((acc , curr) => {
//     return acc + curr} , 0);

// Array.prototype.myReduce = function(callback , initialValue){

//     let acc = initialValue;
//     for(let i=0;i<this.length;i++){
//         acc  = callback(acc , this[i] , i , this);
//     }
//     return acc;
// }

// let sum2 = arr.myReduce((acc , curr) => {
//     return acc + curr} , 0);

// console.log(sum2);
// console.log(sum);


//Flat Polyfill

// let arr = [1 , 2 , [3,4,[5,6,7]] , 8 , [9,10]];

// let flatArray = arr.flat(2);
// console.log(flatArray);

// Array.prototype.myFlat = function(depth = 1){

//     let result = [];
//     for(let i=0;i<this.length;i++){
//         if(Array.isArray(this[i]) && depth >0){
//             result.push(...this[i].myFlat(depth-1));
//         }
//         else{
//             result.push(this[i]);
//         }
//     }
//     return result;
// }

// let flatArray2 = arr.myFlat(2);
// console.log(flatArray2);

// let a = {
//     name : "John",
//     age : 20,
//     city : "New York",
//     prinntName(){
//         console.log(this.name);
//     }
// }

// let b  = Object.create(a);

// console.log(a);
// console.log(b);

// // console.log(b.prototype);
// Object.prototype.myCreate = function(obj , objectProperties){

//     let result = new Object();
//     result.__proto__ = obj;

//     if(objectProperties){
//         Object.defineProperties(result , objectProperties);
//     }
//     return result;
// }

// let c = Object.myCreate(a);

// console.log(c.name);

// let a = {
//     name : "John",
//     age : 20,
//     city : "New York",
//     prinntName(){
//         console.log(this.name);
//     }
// };
// let c ={
//     status : "active",
//     printStatus(){
//         console.log(this.status);
//     }
// }
// let b =  Object.assign({},a , c);
// b.name = "Jane";
// console.log(b);
// console.log(a);
// console.log(b.status);


// Object.prototype.myAssign = function(target , ...sources){

//     for(let i=0;i<sources.length;i++){
//         let source = sources[i];

//         for(let key in source){
//             if(source.hasOwnProperty(key)){
//                 target[key] = source[key];
//             }
//         }
//     }
//     return target;
// }

// let d = Object.myAssign({},a , c);
// console.log(d);
// console.log(a);
// console.log(c);
// // console.log(d);

// let name = "Global";
// let a = {
//     name : "John",
//     age : 20,
//     city : "New York",
// };
// let b = {
//     name : "Jane",
//     age : 21,
//     city : "Los Angeles",
//     print : ()=>{
//         console.log(this.name + " " + this.age + " " + this.city);
//     }
// };

// function printName(){
//     console.log(this.name + " " + this.age + " " + this.city);
// }

// Function.prototype.myCall = function(context , ...args){

//     context.fn = this;
//     let result = context.fn(...args);
//     delete context.fn;
//     return result;
// }


// // printName.myCall(a);
// // printName.myCall(b);
// print = ()=>{
//     console.log(this.name + " " + this.age + " " + this.city);

// }

// print();
// b.print();

// printName.myCall(c);

// function multiply(a){

//     return function(b){
//         if(!b){
//             return a;
//         }
//         return multiply(a*b);
//     }
// }
// // multiply(2);
// console.log(multiply(2)(3)());
// console.log(multiply(2)(3)(4)(5)());


// Deep Clone

// function myDeepClone(obj , seen = new WeakMap()){
//     if(typeof obj !== 'object' || obj ===null){
//         return obj;
//     }
//     if(obj instanceof Date){
//         return new Date(obj.getTime());
//     }
//     if(seen.has(obj)){
//         return seen.get(obj);
//     }

//     const copy = Array.isArray(obj) ? [] : {};

//     seen.set(obj , copy);

//     for(let kye of Object.keys(obj)){
//         copy[key] = myDeepClone(obj[key] , seen);
//     }

//     return copy;



// }


// let a = {
//     name : "John",
//     age : 20,
// }
// let b  = Object.create(a);
// console.log(b.name);


// Debounce and Throttle

// function debounce(func , delay){

//     let timer;
//     return function(...args){

//         clearTimeout(timer);
//         timer = setTimeout(()=>{
//             return func.apply(this , args)
//         } , delay)
//     }
// }

// function throttle(func , delay){
//     let lastTime = 0;
//     return function(...args){
//         const now = Date.now();
//         if(now-lastTime < delay){
//             return;
//         }
//         lastTime = now;
//         return func.apply(this , args);
//     }
// }


// throttledResize = throttle(()=>console.log("Window resized") , 1000);
// debouncedSearch = debounce((text)=>console.log("Searching for : " , text) , 1000);

// document.getElementById("input").addEventListener("input" , (e)=>debouncedSearch(e.target.value))
// window.addEventListener("resize" , throttledResize)


// class LRUCache{

//     constructor(capacity){
//         this.capacity = capacity;
//         this.cache = new Map();
//     }

//     get(key){
//         if(!this.cache.has(key)){
//             return -1;
//         }

//         const value = this.cache.get(key);
//         this.cache.delete(key);
//         this.cache.set(key , value);
//         return value;
//     }

//     put(key , value){
//         if(this.cache.has(key)){
//             this.cache.delete(key);
//         }

//         this.cache.set(key , value);

//         if(this.cache.size > this.capacity){
//             const lruKey = this.cache.keys().next().value;
//             console.log("LRU Keys : " , this.cache.keys());
//             this.cache.delete(lruKey);
//             console.log("LRU Cache is full, removing least recently used item");
//         }
//     }

//     printCache(){
//         console.log(this.cache);
//     }
// }

// const lru = new LRUCache(3);
// lru.put(1 , "A");
// lru.put(2 , "B");
// lru.put(3 , "C");
// lru.printCache();
// lru.get(2);
// lru.printCache();
// lru.put(4 , "D");
// lru.printCache();


//Longest Substring Without Repeating Characters

// let str = "abbaabacavd";

// function longestSubstringWithoutRepeatingCharacters(str){
//     let map = new Map();
//     let best = 0;
//     let start =0;
//     let end =0;

//     while(end < str.length){
//         const char = str[end];
//         if(map.has(char)){
//          start = Math.max(start , map.get(char) + 1);
//         }
//         map.set(char , end);
//         best = Math.max(best , end-start+1);
//         end++; 
//     }
//     return best;
// };

// console.log(longestSubstringWithoutRepeatingCharacters(str));

//Valid Parentheses

// let str = '({{[]}})}'

// function isValid(str){
//     let stack = [];

//     let map = {
//         ')' :'(',
//         '}' :'{',
//         ']' :'[',
//     }

//     for(const element of str){
//         let char = element;
//         if('({['.includes(char)){
//             stack.push(char);
//         }
//         else{
//             if(stack.length ===0 || stack.pop() !== map[char]){
//                 return false
//             }
//         }
//     }
//     return stack.length === 0;
// }

// console.log(isValid(str));


// let arr = [1,2,3,-5,6,7,-8,9,10];

// function maxSubArraySum(arr){
//     let maxSum = 0;
//     let currentSum = 0;

//     for(let i of arr){
//         currentSum = Math.max(i , currentSum+i);
//         maxSum = Math.max(maxSum , currentSum);
//     }
//     return maxSum;
// }

// console.log(maxSubArraySum(arr));


// House Robber

let arr = [1,2,3,1];

// function houseRobber(arr){
// //    let dp = new Array(arr.length).fill(0);
// //    dp[0] = arr[0];
// //    dp[1] = Math.max(arr[0] , arr[1]);

// //    for(let i=2;i<arr.length;i++){
// //     dp[i] = Math.max(dp[i-1] , dp[i-2]+arr[i]);
// //    }
// //    return dp[arr.length-1];

//     let prev = 0;
//     let curr = 0;

//     for(let i=0;i<arr.length;i++){
//         let temp = Math.max(curr , prev+arr[i]);
//         prev = curr;
//         curr = temp;
//     }
//     return curr;
// }


// console.log(houseRobber(arr));


// Flatten object

// let obj  = {
//     user: {
//       id: 101,
//       name: 'Jane Doe',
//       isVerified: false,
//       nickname: '',
//       settings: { is_active: true, theme: null, data: {}, preferences: {} },
//       tags: [ 'admin', 'dev' ],
//       roles: [],
//       metadata: undefined
//     },
//     address: {
//       street: 'wood nagar',
//       town: 'chirala',
//       district: 'LA',
//       geo: { lat: 15.123, lng: 80.456 }
//     },
//     projects: [ { id: 1, name: 'AI Project' }, { id: 2, name: 'Web App' } ]
//   }

// isPlainObject = (obj)=>{
//     return (
//         obj !==null && typeof obj ==="object" && !Array.isArray(obj)
//     )
// }
// console.log(typeof [1,2,3,4,5])
// function flattenObject(obj){
//     let result = {};

//     function flatten(obj , prefix){

//         if(isPlainObject(obj) && Object.keys(obj).length === 0){
//             return;
//         }
//         if(!isPlainObject(obj) && prefix){
//             result[prefix] = obj;
//             return;
//         }

//         for(let key in obj){
//             let newPrefix = prefix ? prefix + "." + key : key;
//             flatten(obj[key] , newPrefix);
//         }

//         return;
//     }

//     flatten(obj , "");
//     return result;
// }

// let result = flattenObject(obj);
// console.log(result);

// function unflattenObject(obj){
    
//     let result = {}

//     function unflatten(obj){

//         for(let key in obj){
//             let keyArray = key.split(".");
//             let curr = result;
//             for(let i=0;i<keyArray.length-1;i++){
//                 if(typeof curr[keyArray[i]] !== "object"){
//                     curr[keyArray[i]] = {};
//                 }
//                 curr = curr[keyArray[i]];
//             }
//             curr[keyArray[keyArray.length-1]] = obj[key];
//         }
//         return result;
//     }

//     unflatten(obj);
//     return result;
// }
// console.log(unflattenObject(result));


// Event Emitter


// class EventEmitter{

//     constructor(){
//         this.events = new Map();
//     }

//     on(event , fn){
//         if(!this.events.has(event)){
//             this.events.set(event , new Set());
//         }
//         this.events.get(event).add(fn);
//         return () => this.off(event , fn);
//     }
//     off(event , fn){

//         if(this.events.has(event)){
//             let removed = this.events.get(event).delete(fn);
//             if(removed && this.events.get(event).size ===0){
//                 this.events.delete(event)
//             }
//             return removed;
//         }
//         return false;
//     }

//     emit(event , ...args){
//         let fns = this.events.get(event);

//         if(fns){
//             fns.forEach(fn => fn(...args))
//         }
//         return true;
//     }

//     once(event , fn){
//         const wrapper = (...args) =>{
//             fn(...args);
//             this.off(event , wrapper);
//         }
//         this.on(event , wrapper);
//     }
// }

// const emitter = new EventEmitter();


// const handleClick = () => console.log("Button clicked");
// const handleMouseOver = () => console.log("Mouse over");

// emitter.on('click' , handleClick);
// emitter.on('mouseover' , handleMouseOver);
// emitter.emit('click');
// emitter.emit('mouseover');

// emitter.on('click' , handleMouseOver);
// emitter.on('mouseover' , handleClick);

// emitter.emit('click');
// emitter.emit('mouseover');

// emitter.off('click' , handleClick);
// emitter.emit('click');

// emitter.once('click' , ()=>console.log("Button clicked once"));
// emitter.emit('click');
// emitter.emit('click');






