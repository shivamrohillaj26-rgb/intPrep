let obj = {
  user: {
    id: 101,
    name: 'Jane Doe',
    isVerified: false,
    nickname: '',
    settings: {
      is_active: true,
      theme: null,
      data: {},
      preferences: {},
    },
    tags: ['admin', 'dev'],
    roles: [],
    metadata: undefined,
  },
  address: {
    street: 'wood nagar',
    town: 'chirala',
    district: 'LA',
    geo: { lat: 15.123, lng: 80.456 },
  },
  projects: [
    { id: 1, name: 'AI Project' },
    { id: 2, name: 'Web App' },
  ],
};
console.log(obj);
let flattened = {};
function makeFlat(obj , path){

    if(typeof obj === "object" && obj !== null && !Array.isArray(obj) && Object.keys(obj).length !== 0){

        if(Object.keys(obj).length === 0){
            return;
        }

        for(let key of Object.keys(obj)){
            let currpath = path ? path + "." + key : key
            makeFlat(obj[key] , currpath)
        }
        return;
    }
    
    if(path){
        flattened[path] = obj;
    }
}
makeFlat(obj , "");
console.log(flattened);

let deFlattend = {}
function makeDeflatten(obj){

    let keys = Object.keys(obj);
    let curr = deFlattend;
    for(let key of keys){
        let parts  = key.split('.');
        curr = deFlattend;
       
            for(let i =0;i<parts.length-1;i++){
                if(!Object.hasOwn(curr , parts[i])){
                    curr[parts[i]] = {}
                }
                curr = curr[parts[i]]
            }
            curr[parts[parts.length-1]] = obj[key];
    }
}
makeDeflatten(flattened);
console.log(deFlattend);



