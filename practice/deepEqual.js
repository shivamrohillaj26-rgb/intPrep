let a = [1, 2];
let b =  { 0: 1, 1: 2 };

function deepEqual(a , b){

    if(Object.is(a,b)){
        return true;
    }

    if(typeof a !== "object" || typeof b !== "object" || a === null || b === null){
        return false;
    }

    if(Array.isArray(a) !== Array.isArray(b)){
        return false;
    }

    let keysA = Object.keys(a);
    let keysB = Object.keys(b);

    if(keysA.length !== keysB.length){
        return false;
    }
    for(let key of keysA){
        if(!Object.hasOwn(b,key)){
            return false;
        }
        if(!deepEqual(a[key] , b[key])){
            return false;
        }
    }
    return true;
}
console.log(deepEqual(a , b))