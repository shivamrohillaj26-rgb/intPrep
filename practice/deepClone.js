//Deep clone

function deepClone(obj , map = new WeakMap()){
    if(obj==null || typeof obj !== "object"){
        return obj
    }
    if(obj instanceof Date){
        return new Date(obj.getTime());
    }
    if(map.has(obj)){
        return map.get(obj);
    }



    let clone = Array.isArray(obj)?[]:{};
    map.set(obj , clone)
    for(let key of Object.keys(obj)){
        clone[key] = deepClone(obj[key]);
    }
    return clone;
}
const original = {
  name: 'Shivam',
  skills: ['js', 'angular'],
  meta: { active: true }
};

const clone = deepClone(original);
console.log(clone);
clone.skills.push('rxjs');
clone.meta.active = false;

console.log(original.skills);     // ['js', 'angular']
console.log(original.meta.active);


