# JavaScript Objects & OOP — Complete Interview Guide

This guide assumes **zero prior knowledge**.

By the end, you should be able to answer:

- What is an object in JavaScript?
- How does OOP work in JS?
- What is the prototype chain?
- What is `this`?
- Difference between class and constructor function?
- Common object interview questions

---

## 0. Start Here: The Big Picture

JavaScript is not class-based OOP like Java/C++ first.

JavaScript is primarily:

> **Prototype-based** object-oriented language

That means:

- Almost everything useful is an object (or behaves like one)
- Objects can inherit from other objects through a **prototype chain**
- `class` syntax is mostly sugar over prototypes

Interview one-liner:

> In JavaScript, objects are key-value collections, and OOP is mainly done through prototypes. ES6 classes make that syntax cleaner, but underneath it is still prototypes.

---

## 1. What Is An Object?

An object stores related data and behavior together.

Think of a real object:

```text
Person
- name
- age
- walk()
- talk()
```

In JavaScript:

```js
const person = {
  name: 'Shivam',
  age: 25,
  walk() {
    console.log(this.name + ' is walking');
  }
};

person.walk(); // Shivam is walking
```

### Object = properties + methods

| Term | Meaning | Example |
|---|---|---|
| Property | data stored on object | `name`, `age` |
| Method | function stored on object | `walk()` |
| Key | property name | `"name"` |
| Value | data or function | `"Shivam"` / function |

### Keys are usually strings (or Symbols)

```js
const user = {
  name: 'A',
  'home city': 'Delhi' // multi-word key needs quotes
};

console.log(user.name);         // A
console.log(user['home city']); // Delhi
```

Use:

- `obj.key` when key is a valid identifier
- `obj['key']` when key is dynamic or has spaces

```js
const key = 'age';
const user2 = { age: 20 };
console.log(user2[key]); // 20
```

---

## 2. Why Objects Matter In Interviews

Objects are the foundation for:

- OOP
- Prototypes
- `this`
- Closures with methods
- React/Angular component state concepts
- API response handling
- Deep clone / Object.assign / destructuring questions

If objects are weak, OOP questions become hard.

---

## 3. Ways To Create Objects

### 3.1 Object literal (most common)

```js
const car = {
  brand: 'Tesla',
  start() {
    console.log('Started');
  }
};
```

Best for: one simple object.

---

### 3.2 `new Object()`

```js
const obj = new Object();
obj.a = 1;
```

Works, but object literal is preferred.

---

### 3.3 Constructor function (old OOP style)

```js
function Person(name, age) {
  this.name = name;
  this.age = age;
}

Person.prototype.sayHi = function () {
  console.log('Hi, I am ' + this.name);
};

const p1 = new Person('Shivam', 25);
p1.sayHi(); // Hi, I am Shivam
```

Important:

- Constructor name starts with Capital letter by convention
- Called with `new`
- Methods are usually put on `prototype` to share memory

---

### 3.4 ES6 `class` (modern OOP style)

```js
class Person {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }

  sayHi() {
    console.log('Hi, I am ' + this.name);
  }
}

const p1 = new Person('Shivam', 25);
p1.sayHi();
```

Under the hood, this still uses prototypes.

---

### 3.5 `Object.create(proto)`

Creates an object with a chosen prototype.

```js
const animal = {
  eats: true,
  walk() {
    console.log('Animal walks');
  }
};

const rabbit = Object.create(animal);
rabbit.jumps = true;

console.log(rabbit.eats); // true (from prototype)
rabbit.walk();            // Animal walks
```

Very important for prototype interviews.

---

## 4. Object Internals You Must Know

### 4.1 Objects are reference types

```js
const a = { x: 1 };
const b = a;

b.x = 100;
console.log(a.x); // 100
```

Why? `a` and `b` point to the **same memory object**.

Compare with primitives:

```js
let x = 10;
let y = x;
y = 20;
console.log(x); // 10
```

Interview trap:

```js
const obj1 = { name: 'A' };
const obj2 = { name: 'A' };
console.log(obj1 === obj2); // false (different references)
```

---

### 4.2 Shallow copy vs deep copy

#### Shallow copy

Copies only top level.

```js
const original = {
  name: 'Shivam',
  address: { city: 'Delhi' }
};

const copy = { ...original }; // or Object.assign({}, original)
copy.name = 'Rohit';
copy.address.city = 'Mumbai';

console.log(original.name);         // Shivam (top-level copied)
console.log(original.address.city); // Mumbai (nested still shared)
```

#### Deep copy

Copies nested objects too.

```js
const deep = structuredClone(original);
// or JSON.parse(JSON.stringify(original)) // limited
// or custom recursive deepClone
```

Interview tip:

- `Object.assign` / spread = shallow
- nested objects remain shared unless deep cloned

---

### 4.3 Property descriptors (advanced but asked)

Every property has metadata:

```js
const user = { name: 'A' };
console.log(Object.getOwnPropertyDescriptor(user, 'name'));
```

Typical output shape:

```js
{
  value: 'A',
  writable: true,
  enumerable: true,
  configurable: true
}
```

Meaning:

- `writable`: can change value?
- `enumerable`: shows in loops / keys?
- `configurable`: can delete/reconfigure?

```js
Object.defineProperty(user, 'id', {
  value: 101,
  writable: false,
  enumerable: false,
  configurable: false
});

user.id = 999;
console.log(user.id); // 101
```

---

## 5. Accessing / Checking Object Properties

```js
const user = { name: 'Shivam', age: 25 };

console.log(user.name);        // Shivam
console.log(user['age']);      // 25
console.log('name' in user);   // true (own or inherited)
console.log(user.hasOwnProperty('name')); // true (own only)
console.log(Object.hasOwn(user, 'name')); // modern own-only check
```

### Optional chaining (very useful)

```js
const data = { user: { profile: { city: 'Delhi' } } };

console.log(data.user?.profile?.city); // Delhi
console.log(data.user?.address?.city); // undefined (no crash)
```

### Nullish coalescing

```js
const count = 0;
console.log(count ?? 10); // 0
console.log(null ?? 10);  // 10
```

`??` only falls back for `null` or `undefined`, not for `0` / `''`.

---

## 6. Looping Over Objects

```js
const user = { name: 'A', age: 20 };

for (const key in user) {
  console.log(key, user[key]);
}

Object.keys(user);   // ['name', 'age']
Object.values(user); // ['A', 20]
Object.entries(user); // [['name','A'], ['age',20]]

for (const [key, value] of Object.entries(user)) {
  console.log(key, value);
}
```

Interview note:

- `for...in` can include inherited enumerable props
- `Object.keys` gives own enumerable string keys

---

## 7. `this` Keyword (Critical For OOP)

`this` means:

> the object that is calling the function (in most normal method calls)

### Example 1 — method call

```js
const user = {
  name: 'Shivam',
  greet() {
    console.log(this.name);
  }
};

user.greet(); // Shivam
```

Here `this` = `user`.

### Example 2 — lose `this`

```js
const greet = user.greet;
greet(); // undefined in strict mode / weird in non-strict
```

Why? Function is no longer called as `user.greet()`.

### Example 3 — arrow function does not bind its own `this`

```js
const obj = {
  name: 'A',
  regular() {
    console.log(this.name);
  },
  arrow: () => {
    console.log(this.name);
  }
};

obj.regular(); // A
obj.arrow();   // undefined (in modules/strict), takes outer this
```

Rule:

- Normal function: `this` depends on **how it is called**
- Arrow function: `this` depends on **where it was defined** (lexical)

### Fix lost `this` with bind

```js
const bound = user.greet.bind(user);
bound(); // Shivam
```

Or:

```js
user.greet.call(user);
user.greet.apply(user);
```

---

## 8. OOP In JavaScript (From Absolute Zero)

### What is OOP?

**Object Oriented Programming** is a way to design code using objects.

Main goals:

- Group data + behavior
- Reuse code
- Hide internal details
- Make large apps easier to manage

### Four pillars of OOP

1. Encapsulation
2. Abstraction
3. Inheritance
4. Polymorphism

JavaScript supports all four, but in a JS style (prototypes/classes/closures).

---

## 9. Pillar 1 — Encapsulation

Encapsulation = keep data + methods together, and protect internal details.

### Simple encapsulation with object

```js
const bank = {
  balance: 1000,
  deposit(amount) {
    this.balance += amount;
  },
  getBalance() {
    return this.balance;
  }
};
```

### Better encapsulation with closure (private data)

```js
function createBank(initial) {
  let balance = initial; // private

  return {
    deposit(amount) {
      balance += amount;
    },
    getBalance() {
      return balance;
    }
  };
}

const acc = createBank(1000);
acc.deposit(500);
console.log(acc.getBalance()); // 1500
console.log(acc.balance);      // undefined (private)
```

### Modern private fields in class

```js
class Bank {
  #balance;

  constructor(amount) {
    this.#balance = amount;
  }

  deposit(amount) {
    this.#balance += amount;
  }

  getBalance() {
    return this.#balance;
  }
}

const acc2 = new Bank(1000);
console.log(acc2.getBalance()); // 1000
// console.log(acc2.#balance); // SyntaxError
```

Interview line:

> Encapsulation means bundling data with methods and restricting direct access to internal state.

---

## 10. Pillar 2 — Abstraction

Abstraction = show only what is needed, hide complex internals.

```js
class CoffeeMachine {
  #boilWater() {
    console.log('Boiling water...');
  }

  #brew() {
    console.log('Brewing coffee...');
  }

  makeCoffee() {
    this.#boilWater();
    this.#brew();
    console.log('Coffee ready');
  }
}

const machine = new CoffeeMachine();
machine.makeCoffee();
// user only calls makeCoffee(), internals are hidden
```

Interview line:

> Abstraction hides implementation details and exposes a simple interface.

---

## 11. Pillar 3 — Inheritance

Inheritance = one object/class reuses another’s properties and methods.

### Prototype inheritance

```js
const animal = {
  eat() {
    console.log('Eating');
  }
};

const dog = Object.create(animal);
dog.bark = function () {
  console.log('Woof');
};

dog.eat();  // inherited
dog.bark(); // own
```

### Class inheritance

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
d.eat();  // Tommy eats
d.bark(); // Tommy barks
```

### `super`

```js
class Dog extends Animal {
  constructor(name, breed) {
    super(name); // call parent constructor
    this.breed = breed;
  }

  eat() {
    super.eat(); // reuse parent method
    console.log('Dog food');
  }
}
```

Interview line:

> Inheritance lets a child reuse and extend parent behavior through prototypes/`extends`.

---

## 12. Pillar 4 — Polymorphism

Polymorphism = same method name, different behavior.

```js
class Shape {
  area() {
    return 0;
  }
}

class Circle extends Shape {
  constructor(r) {
    super();
    this.r = r;
  }

  area() {
    return Math.PI * this.r * this.r;
  }
}

class Square extends Shape {
  constructor(s) {
    super();
    this.s = s;
  }

  area() {
    return this.s * this.s;
  }
}

const shapes = [new Circle(2), new Square(3)];

shapes.forEach((shape) => {
  console.log(shape.area());
});
```

Same call: `shape.area()`, different results.

Interview line:

> Polymorphism lets different objects respond differently to the same method call.

---

## 13. Prototype & Prototype Chain (Most Important Interview Topic)

### The core idea

Every object in JS has an internal link to another object called its **prototype**.

If property is not found on object, JS looks at its prototype, then that prototype’s prototype, until `null`.

```text
obj
 └─ obj.[[Prototype]]
      └─ Object.prototype
           └─ null
```

### Visual example

```js
function Person(name) {
  this.name = name;
}

Person.prototype.sayHi = function () {
  console.log('Hi ' + this.name);
};

const p = new Person('Shivam');
p.sayHi();
```

Chain:

```text
p
 └─ Person.prototype   (has sayHi)
      └─ Object.prototype (has toString, hasOwnProperty, ...)
           └─ null
```

### Proof in code

```js
console.log(Object.getPrototypeOf(p) === Person.prototype); // true
console.log(Person.prototype.constructor === Person);       // true
console.log(p.hasOwnProperty('name')); // true
console.log(p.hasOwnProperty('sayHi')); // false (on prototype)
```

### Why put methods on prototype?

```js
function User(name) {
  this.name = name;
  this.sayHi = function () {}; // new function created for EVERY object (bad for memory)
}

function User2(name) {
  this.name = name;
}
User2.prototype.sayHi = function () {}; // shared by all instances (good)
```

Interview line:

> Own data stays on the instance; shared methods usually go on the prototype.

---

## 14. `__proto__` vs `prototype` (Common Confusion)

| Term | Exists on | Meaning |
|---|---|---|
| `obj.__proto__` | objects (legacy accessor) | points to object’s prototype |
| `Object.getPrototypeOf(obj)` | recommended API | same meaning, modern |
| `Fn.prototype` | functions | prototype used when `new Fn()` is called |

```js
function A() {}
const a = new A();

console.log(a.__proto__ === A.prototype); // true
console.log(Object.getPrototypeOf(a) === A.prototype); // true
```

Do not say “everything has `.prototype`”.

- Functions have `.prototype`
- Objects have `[[Prototype]]` / `__proto__`

---

## 15. Constructor Functions Deep Dive

```js
function Person(name) {
  this.name = name;
}

const p1 = new Person('A');
```

### What `new` does (memorize)

When you write `new Person('A')`:

1. Create empty object `{}`
2. Link that object’s prototype to `Person.prototype`
3. Call constructor with `this` set to that new object
4. Return the object (unless constructor returns another object)

Pseudo-code:

```js
function myNew(Constructor, ...args) {
  const obj = Object.create(Constructor.prototype);
  const result = Constructor.apply(obj, args);
  return result && (typeof result === 'object' || typeof result === 'function')
    ? result
    : obj;
}
```

Interviewers love asking: “Explain what `new` does.”

---

## 16. ES6 Classes Deep Dive

```js
class Person {
  constructor(name) {
    this.name = name;
  }

  sayHi() {
    console.log(this.name);
  }

  static species() {
    return 'Homo sapiens';
  }
}
```

### Important truths

1. `class` is syntactic sugar over prototypes
2. Methods are on `Person.prototype`
3. Static methods are on the constructor itself
4. Classes are not hoisted like function declarations usable before init
5. Code inside class body is strict mode

```js
const p = new Person('A');
console.log(Object.getPrototypeOf(p) === Person.prototype); // true
console.log(Person.species()); // static call
```

### Getters / setters

```js
class User {
  constructor(name) {
    this._name = name;
  }

  get name() {
    return this._name.toUpperCase();
  }

  set name(value) {
    if (!value) throw new Error('Name required');
    this._name = value;
  }
}

const u = new User('shivam');
console.log(u.name); // SHIVAM
u.name = 'rohit';
```

---

## 17. Class vs Constructor Function vs Object Literal

| Feature | Object literal | Constructor fn | Class |
|---|---|---|---|
| Best for | one object | reusable type | reusable type (modern) |
| Inheritance | via Object.create | via prototype | via extends |
| Syntax | simplest | older OOP | clean modern OOP |
| Under the hood | object | prototype | prototype |

Interview answer:

> I use object literals for simple single objects, and classes for reusable types. I understand classes compile down to constructor + prototype patterns.

---

## 18. Composition vs Inheritance

Modern JS advice:

> Prefer composition over deep inheritance when possible.

Inheritance:

```js
class Dog extends Animal {}
```

Composition:

```js
function createDog(name) {
  const animal = {
    eat() {
      console.log(name + ' eats');
    }
  };

  return {
    ...animal,
    bark() {
      console.log(name + ' barks');
    }
  };
}
```

Why composition is often better:

- Avoids deep fragile hierarchies
- More flexible reuse
- Easier testing

Still know inheritance well for interviews.

---

## 19. Important Built-in Object Tools

### `Object.assign`

```js
const target = { a: 1 };
Object.assign(target, { b: 2 }, { a: 3 });
// { a: 3, b: 2 }
```

Shallow copy / merge.

### Spread

```js
const copy = { ...original, age: 30 };
```

### `Object.freeze`

```js
const config = Object.freeze({ theme: 'dark' });
config.theme = 'light'; // ignored in non-strict, error in strict
```

Shallow freeze only.

### `Object.seal`

- Can update existing props
- Cannot add/remove props

### `Object.keys / values / entries`

Already covered; used constantly in interviews and real apps.

---

## 20. Destructuring Objects

```js
const user = {
  name: 'Shivam',
  age: 25,
  address: { city: 'Delhi' }
};

const { name, age } = user;
const { address: { city } } = user;

function printUser({ name, age }) {
  console.log(name, age);
}

printUser(user);
```

Default values:

```js
const { role = 'user' } = user;
```

Rename:

```js
const { name: fullName } = user;
```

---

## 21. Interview Output Questions (Objects + OOP + `this`)

### Q1

```js
const obj = {
  name: 'A',
  getName() {
    return this.name;
  }
};

const fn = obj.getName;
console.log(obj.getName());
console.log(fn());
```

**Output (strict / modules):**

```text
A
undefined
```

Why: method call keeps `this`, detached function loses it.

---

### Q2

```js
function Person(name) {
  this.name = name;
}

Person.prototype.age = 20;

const p1 = new Person('A');
const p2 = new Person('B');

p1.age = 30;

console.log(p1.age);
console.log(p2.age);
console.log(p1.hasOwnProperty('age'));
console.log(p2.hasOwnProperty('age'));
```

**Output**

```text
30
20
true
false
```

Why: `p1.age = 30` creates own property on `p1`. `p2` still reads from prototype.

---

### Q3

```js
const animal = {
  walks: true
};

const rabbit = {
  jumps: true,
  __proto__: animal
};

console.log('walks' in rabbit);
console.log(rabbit.hasOwnProperty('walks'));
```

**Output**

```text
true
false
```

---

### Q4

```js
class A {
  constructor() {
    this.x = 1;
  }
  getX() {
    return this.x;
  }
}

class B extends A {
  constructor() {
    super();
    this.x = 2;
  }
}

console.log(new B().getX());
```

**Output**

```text
2
```

Child overwrites `x` after `super()`.

---

### Q5

```js
const obj = {
  name: 'A',
  greet: () => {
    console.log(this.name);
  }
};

obj.greet();
```

**Output (module/strict typically):**

```text
undefined
```

Arrow function does not take `this` from `obj`.

---

## 22. Full Mini Project Style Example (Interview Friendly)

```js
class Vehicle {
  constructor(brand) {
    this.brand = brand;
  }

  start() {
    console.log(this.brand + ' starting');
  }
}

class Car extends Vehicle {
  #speed = 0;

  constructor(brand, model) {
    super(brand);
    this.model = model;
  }

  accelerate(value) {
    this.#speed += value;
  }

  getSpeed() {
    return this.#speed;
  }

  start() {
    super.start();
    console.log(this.model + ' is ready');
  }
}

const c = new Car('Tesla', 'Model 3');
c.start();
c.accelerate(40);
console.log(c.getSpeed()); // 40
```

Explain in interview as:

- Inheritance (`extends`, `super`)
- Encapsulation (`#speed`)
- Polymorphism (`start` overridden)

---

## 23. Angular / Frontend Connection

Why this matters for Angular interviews:

- Components are classes
- Services are injectable classes
- Models/interfaces describe object shapes
- Understanding `this` helps in callbacks
- Prototype knowledge helps debug unexpected property lookup
- Immutability (`...obj`, avoid mutating shared state) is common in UI apps

Example Angular-style class thinking:

```ts
export class UserService {
  private users: User[] = [];

  addUser(user: User) {
    this.users = [...this.users, user]; // immutable update style
  }
}
```

---

## 24. Most Asked Interview Questions With Model Answers

### Q: What is an object in JavaScript?

> An object is a collection of key-value pairs used to store data and behavior. Keys are strings/Symbols, values can be anything including functions.

### Q: Is JavaScript object-oriented?

> Yes, but it is prototype-based. ES6 classes provide cleaner OOP syntax over prototypes.

### Q: What is the prototype chain?

> If a property is not found on an object, JavaScript looks up its prototype, then that prototype’s prototype, until null. This is how inheritance works.

### Q: Difference between `__proto__` and `prototype`?

> `prototype` is a property of functions used by `new`. `__proto__`/[[Prototype]] is the actual link on an object to its prototype.

### Q: What does `new` keyword do?

> Creates object, sets prototype link, binds `this`, runs constructor, returns object.

### Q: Difference between classical inheritance and prototypal inheritance?

> Classical (Java) uses classes as blueprints. Prototypal (JS) lets objects inherit directly from other objects via prototype links. JS classes are syntactic sugar over prototypes.

### Q: What is `this`?

> In normal functions, `this` depends on call site. In arrow functions, `this` is lexical.

### Q: Own property vs inherited property?

> Own exists directly on object. Inherited comes from prototype chain.

### Q: Shallow vs deep copy?

> Shallow copies top level only; nested references remain shared. Deep copy clones nested structures too.

### Q: Why put methods on prototype?

> So all instances share one method function, saving memory.

---

## 25. Practice Path (If You Are Starting From Zero)

### Day 1

- Create objects with literals
- Access properties
- Write methods using `this`
- Practice lost-`this` bug and fix with bind

### Day 2

- Constructor functions + `new`
- Put methods on prototype
- Draw prototype chain on paper

### Day 3

- Convert same example to `class`
- Add `extends` + `super`
- Add private field `#balance`

### Day 4

- Object.assign / freeze / keys/entries
- Shallow vs deep copy examples
- Solve 5 `this`/prototype output questions

---

## 26. One-Page Cheat Sheet

```text
OBJECT
- key-value pair collection
- reference type

CREATE
- {} literal
- new Constructor()
- class + new
- Object.create(proto)

THIS
- method call => object
- detached fn => lost this
- arrow => lexical this

OOP PILLARS
- Encapsulation: hide internals
- Abstraction: simple interface
- Inheritance: reuse via prototype/extends
- Polymorphism: same method, different behavior

PROTOTYPE
- property lookup walks chain
- methods usually on prototype
- Object.prototype at end (usually)
- then null

CLASS
- sugar over constructor + prototype
- extends / super for inheritance
- static on constructor
- #private fields for encapsulation

COPY
- spread/assign = shallow
- structuredClone/custom = deep
```

---

## 27. Final Spoken Answer (60 seconds)

> JavaScript objects are key-value collections that hold data and methods. OOP in JavaScript is prototype-based: objects inherit through a prototype chain. Constructor functions and ES6 classes both create objects with shared methods on prototypes. The four OOP pillars still apply — encapsulation with private fields or closures, abstraction by exposing simple methods, inheritance with extends or Object.create, and polymorphism by overriding methods. `this` depends on how a function is called, unless it is an arrow function, which uses lexical this. For interviews, I always clarify own vs inherited properties, shallow vs deep copy, and what the new keyword does internally.

---

## 28. Tiny Exercises (Do These Now)

### Exercise 1

Create a `Book` class with `title`, `author`, and method `getSummary()`.

### Exercise 2

Create `Animal` and `Cat` with inheritance. Override one method.

### Exercise 3

Show a lost-`this` bug and fix it using `bind`.

### Exercise 4

Create an object with nested data and demonstrate shallow copy bug.

### Exercise 5

Explain this chain on paper:

```js
function User() {}
const u = new User();
```

What is:

- `u.__proto__`
- `User.prototype`
- `User.prototype.__proto__`

---

If you understand this file well, you can handle almost all JavaScript Objects + OOP interview questions confidently.
