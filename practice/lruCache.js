class LRUCache{
    constructor(capacity){
        this.capacity = capacity;
        this.map = new Map();
    }

    get(key){
        if(!this.map.get(key)) return -1;

        let value  = this.map.get(key);
        this.map.delete(key);
        this.map.set(key , value);
        return value;
    }
    put(key , value){

        if(this.map.has(key)){
            this.map.delete(key);
        }

        this.map.set(key , value);

        if(this.map.size > this.capacity){
            let lruKey = this.map.keys().next().value;
            this.map.delete(lruKey);
        }
    }

}