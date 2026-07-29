# Prototype Chaining — Interview Ready Guide

---

## 1. What Is A Prototype?

In JavaScript, every object has an internal link to another object called its **prototype**.

If you ask for a property and it is not on the object, JS looks at the prototype, then that prototype’s prototype, until `null`.

This lookup path is the **prototype chain**.

Interview one-liner:

> Prototype chaining is how JavaScript implements inheritance: property lookup walks from an object up through its linked prototypes until the property is found or the chain ends at null.

---

## 2. Why Prototypes Exist

Without prototypes, every object would need its own copy of every method.

```js
function User(name) {
  this.name = name;
  this.sayHi = function () {
    console.log(this.name);
  }; // new function for every instance (memory heavy)
}
```

Better:

```js
function User(name) {
  this.name = name;
}

User.prototype.sayHi = function () {
  console.log(this.name);
}; // shared by all instances
```

---

## 3. Visual Model

```text
const u = new User('A')

u
├─ own: name = 'A'
└─ [[Prototype]] → User.prototype
                    ├─ sayHi()
                    └─ [[Prototype]] → Object.prototype
                                        ├─ toString()
                                        ├─ hasOwnProperty()
                                        └─ [[Prototype]] → null
```

---

## 4. `__proto__` vs `prototype` (Most Confused Topic)

| Term | On what? | Meaning |
|---|---|---|
| `Fn.prototype` | functions | object that becomes prototype of instances created by `new Fn()` |
| `obj.__proto__` | objects (legacy) | link to that object’s prototype |
| `Object.getPrototypeOf(obj)` | recommended | modern way to read prototype |

```js
function Person(name) {
  this.name = name;
}

const p = new Person('Shivam');

console.log(p.__proto__ === Person.prototype); // true
console.log(Object.getPrototypeOf(p) === Person.prototype); // true
console.log(Person.prototype.constructor === Person); // true
```

Do not say “every object has `.prototype`”.

- Functions have `.prototype`
- Objects have `[[Prototype]]`

---

## 5. Property Lookup Algorithm

When you access `obj.key`:

1. Is `key` an own property of `obj`? Use it.
2. Else check `obj.[[Prototype]]`
3. Else check next prototype
4. Continue until found or `null` → `undefined`

```js
const animal = { eats: true };
const rabbit = Object.create(animal);
rabbit.jumps = true;

console.log(rabbit.jumps); // own
console.log(rabbit.eats);  // inherited
console.log(rabbit.swims); // undefined
```

---

## 6. Own vs Inherited Properties

```js
const animal = { eats: true };
const dog = Object.create(animal);
dog.barks = true;

console.log(dog.hasOwnProperty('barks')); // true
console.log(dog.hasOwnProperty('eats'));  // false
console.log('eats' in dog);               // true (own or inherited)

console.log(Object.keys(dog)); // ['barks'] own enumerable only
```

Modern:

```js
Object.hasOwn(dog, 'barks'); // true
```

---

## 7. Creating Prototype Links

### Method 1: `Object.create`

```js
const parent = {
  greet() {
    console.log('hello');
  }
};

const child = Object.create(parent);
child.greet(); // hello
```

### Method 2: Constructor + `new`

```js
function Animal(name) {
  this.name = name;
}

Animal.prototype.eat = function () {
  console.log(this.name + ' eats');
};

const a = new Animal('Cat');
a.eat();
```

### Method 3: `class` / `extends` (sugar)

```js
class Animal {
  constructor(name) {
    this.name = name;
  }
  eat() {
    console.log(this.name + ' eats');
  }
}

class Dog extends Animal {
  bark() {
    console.log(this.name + ' barks');
  }
}

const d = new Dog('Tommy');
d.eat();
d.bark();
```

Under the hood still prototype chain.

---

## 8. What `new` Does (Tied To Prototypes)

```js
const p = new Person('A');
```

Steps:

1. Create `{}`
2. Set `[[Prototype]]` to `Person.prototype`
3. Run constructor with `this =` that object
4. Return the object (unless constructor returns another object)

Interviewers often ask this with prototype questions.

---

## 9. Shadowing (Overriding Prototypes)

```js
function Person() {}
Person.prototype.age = 20;

const p1 = new Person();
const p2 = new Person();

p1.age = 30; // creates OWN property on p1

console.log(p1.age); // 30 (own)
console.log(p2.age); // 20 (prototype)
console.log(p1.hasOwnProperty('age')); // true
console.log(p2.hasOwnProperty('age')); // false
```

Own property hides prototype property with same key.

---

## 10. Changing Prototype Affects Instances

```js
function User() {}
const u = new User();

User.prototype.sayHi = function () {
  console.log('hi');
};

u.sayHi(); // works, lookup finds new method
```

But replacing whole prototype after instances exist can break links for old instances if done carelessly.

```js
function User() {}
const u = new User();

User.prototype = {
  sayHi() {
    console.log('hi');
  }
};

// u still points to OLD prototype object
u.sayHi(); // Error / undefined behavior depending access
```

Prefer adding methods to existing prototype object.

---

## 11. Prototype Chain With Inheritance Example

```js
function Animal(name) {
  this.name = name;
}

Animal.prototype.eat = function () {
  console.log(this.name + ' eats');
};

function Dog(name, breed) {
  Animal.call(this, name); // inherit own props
  this.breed = breed;
}

Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.constructor = Dog;

Dog.prototype.bark = function () {
  console.log(this.name + ' barks');
};

const d = new Dog('Rex', 'Lab');
d.eat();
d.bark();
```

Chain:

```text
d -> Dog.prototype -> Animal.prototype -> Object.prototype -> null
```

---

## 12. `Object.prototype` Is Usually The Root

Most objects eventually inherit from `Object.prototype`.

```js
const obj = {};
console.log(Object.getPrototypeOf(obj) === Object.prototype); // true
console.log(Object.getPrototypeOf(Object.prototype)); // null
```

Except:

```js
const clean = Object.create(null); // no prototype
```

Used sometimes as safe dictionaries.

---

## 13. Interview Output Questions

### Q1

```js
function A() {}
A.prototype.x = 10;

const a = new A();
console.log(a.x);

a.x = 20;
console.log(a.x);
delete a.x;
console.log(a.x);
```

Output:

```text
10
20
10
```

### Q2

```js
const obj = {
  a: 1,
  __proto__: {
    b: 2,
    __proto__: {
      c: 3
    }
  }
};

console.log(obj.a, obj.b, obj.c); // 1 2 3
```

### Q3

```js
function Foo() {
  this.x = 1;
}
Foo.prototype.y = 2;

const f = new Foo();
console.log(f.hasOwnProperty('x')); // true
console.log(f.hasOwnProperty('y')); // false
```

---

## 14. Common Interview Questions

**Q: What is prototype chaining?**  
A: The linked lookup path of prototypes used to resolve properties/methods.

**Q: Difference between `__proto__` and `prototype`?**  
A: `prototype` is on constructors; `__proto__`/[[Prototype]] is the instance link.

**Q: Why put methods on prototype?**  
A: Memory efficiency — one shared function for all instances.

**Q: Is class inheritance different from prototype inheritance?**  
A: Syntax differs; mechanism is still prototypes.

**Q: How to check own property?**  
A: `Object.hasOwn(obj, key)` or `obj.hasOwnProperty(key)`.

---

## 15. Spoken Answer (45 sec)

> Every object in JavaScript has a prototype link. When we access a property, JavaScript first checks the object itself, then walks up the prototype chain until it finds the property or reaches null. Constructor functions and classes set up this chain so instances can share methods through `Constructor.prototype`. That is how inheritance works in JavaScript.

---

## 16. Cheat Sheet

```text
property lookup: own -> proto -> proto -> null
Fn.prototype: blueprint methods for new Fn()
obj.[[Prototype]]: instance link
Object.create(proto): make object with given proto
own property shadows prototype property
class extends = prototype linking sugar
```

---

## 17. Practice Checklist

- [ ] Draw chain for `new Person()`
- [ ] Explain `__proto__` vs `prototype`
- [ ] Create inheritance with `Object.create`
- [ ] Show own vs inherited with `hasOwnProperty`
- [ ] Predict shadowing output question

---

## Interview drill — “Property not on object, but JS finds it?”

> Lookup order: own properties → `[[Prototype]]` chain → `null`. Methods like `toString` live on `Object.prototype`, so `{}` still finds them even though they’re not own properties (`hasOwnProperty('toString') === false`).

See also: `TRICKY_10_FRONTEND_QUESTIONS.md` Q7.
