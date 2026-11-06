//Debounce and Throttle

function debounce(fn , time){
    let timer;

    return function(...args){
        clearTimeout(timer)
        timer = setTimeout(()=>{
            fn.apply(this , args)
        } , time)
    };
}

function search(text){
    console.log(text);
}

let debouncedSearch = debounce(search , 100);
debouncedSearch("a");
debouncedSearch("an");
debouncedSearch("ang");
debouncedSearch("angu");


function throttle(fn , delay){
    let lastused = 0;
    return function (...args){
        if(Date.now() - lastused > lastused){
            lastused = Date.now();
            fn.apply(this , args)
        }
    }
}
let throttledSearch = throttle(search , 100);

throttledSearch("angular");
throttledSearch("angul");
throttledSearch("ang");
throttledSearch("an");
throttledSearch("a");



