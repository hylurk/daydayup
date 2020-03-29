# 手写 new 操作符

如果要手写一个 new 操作符，我们必须先搞清楚 new 操作符在执行的过程中都做了什么：

- 1）创建一个新对象

- 2）将构造函数的作用域赋给新对象（因此 this 指向了这个新对象）

- 3）执行构造函数中的代码（为这个新对象添加属性）

- 4）返回新对象

> 注意：我们这个 new 只适用于构造函数，对于 ES6 的 Class 是不适用的。

## 最终代码实现

```js
function DemoFn (name) {
  this.name = name
}
DemoFn.prototype.say = function () {
  console.log(this.name)
}

// 要实现的效果：myNew(A, 'xiaohua')

function myNew (Fn, ...args) {
  const o = {}
  o.__proto__ = Fn.prototype
  Fn.call(o, ...args)
  return o
}

// 或者

function myNew (Fn, ...args) {
  const o = Object.create(Fn.prototype)   // 使用指定的原型对象及其属性去创建一个新的对象
  Fn.call(o, ...args)   // 绑定 this 到obj, 设置 obj 的属性
  return o
}

// 或者

function myNew (Fn, ...args) {
  const o = {}
  Object.setPrototypeOf(o, Fn.prototype)
  Fn.call(o, ...args)
  return o
}
```

其实不管哪种写法，也就只是为对象绑定原型的时候的区别。
