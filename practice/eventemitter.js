class EventEmitter{
    constructor(){
        this.events = new Map(); 
    }

    on(event , listener){
        if(!this.events.has(event)){
            this.events.set(event , new Set());
        }
        this.events.get(event).add(listener);
    }

    off(event , listener){
        const listeners = this.events.get(event);
        let removed = listeners.delete(listener);
        return removed;
    }

    emit(event , ...args){
        const listeners = this.events.get(event);
        listeners.forEach((listener)=>{
            listener(...args);
        })
        return true;
    }
}
const emitter = new EventEmitter();

function onLogin(user) {
  console.log('Welcome', user.name);
}

emitter.on('login', onLogin);

emitter.emit('login', { name: 'Shivam' });
// Welcome Shivam

emitter.off('login', onLogin);

emitter.emit('login', { name: 'Shivam' });