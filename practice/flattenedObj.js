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
  
  
  function flatten(obj){
  
      let result = {};
  
     
  
      function traverse(current , path){
  
          if(current !== null && typeof current==='object' && !Array.isArray(current) && Object.keys(current).length !==0){
  
              for(let key of Object.keys(current)){
                  let newPath = path ? (path+'.'+key):key;
                  traverse(current[key] , newPath)
              }
              return;
          }
  
          if(path){
              result[path] = current;
          }
  
      }
      traverse(obj);
      return result;
  }
  
  let flattenedObj = flatten(obj);
  console.log(obj);
  console.log(flattenedObj);
  
  function deFlatten(obj){
  
      let keys = Object.keys(obj);
      let result = {};
  
      for(let key of keys){
          let curr = result;
          let parts = key.split('.');
          let len = parts.length
  
          for(let i =0;i<len-1;i++){
              const p = parts[i];
              if(!curr[p]){
                  curr[p] = {};
              }
              curr = curr[p];
          }
          curr[parts[len-1]] = obj[key];
      }
      return result;
  }
  
  let unflattenedObj = deFlatten(flattenedObj);
  console.log(unflattenedObj);
  
  