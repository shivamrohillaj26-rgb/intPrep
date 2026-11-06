let p1 = new Promise((resolve , reject)=>{
    setTimeout(()=>resolve("P1 resolved") , 200);
})
let p2 = new Promise((resolve , reject)=>{
    setTimeout(()=>resolve("P2 resolved") , 400);
})
let p3 = new Promise((resolve , reject)=>{
    setTimeout(()=>resolve("P3 resolved") , 300);
})

Promise.all([p1 , p2 , p3]).then((res)=>{
    console.log(res);
})

Promise.myAll  = function(promises){
   return new Promise((resolve , reject)=>{
    let result = [];
    let count = 0;
    promises.forEach((p , index)=>{
        Promise.resolve(p).then((value)=>{
            result[index] = value;
            count++;
            if(count === promises.length){
                resolve(result);
            }
        }).catch((err)=>{
            reject(err);
        })
    })
   })
}
Promise.myAll([p1 , p2 , p3]).then((res)=>{
    console.log(res);
})