# 手写Promise

当前大前端的环境下，Promise 作为 ES6+ 里的大将，其重要性已无需多说，而且当下前端面试，Promise 的出镜率也是十分高的。我们将通过本文，手动实现一个符合 [PromiseAPlus 规范](https://promisesaplus.com/)的 Promise 。接下来，让我们进入正题。

## 预备

在手写 Promise 之前，我们需要先学点基础：一个是高阶函数，另一个就是设计模式里的发布订阅模式。

### 高阶函数

1. 什么叫高阶函数？

   1）如果一个函数的参数是一个函数，那这个函数就叫高阶函数，如回调函数。

   ```js
   function fn () {
     console.log('I\'m a simple function')
   }
   
   function higherOrderFn (fn) { // 高阶函数
     fn()
     console.log('I\'m a higher-order function')
   }
   ```

   2）如果一个函数返回了另一个函数，那这个函数也叫高阶函数，如闭包。

   ```js
   function higherOrderFn () { // 高阶函数
     return function () {
       console.log(this)
     }
   }
   ```

2. 函数的柯里化？

   函数的柯里化其实就是把接受多个参数的函数转换成接受单一参数的函数的操作。柯里化函数具有延迟计算的效应，因为除了最后一步，每一步都只是返回新的函数。

   ```js
   function multiply (a) {
     return function (b) {
       return function (c) {
         return a * b * c
       }
     }
   }
   
   multiply(1)(2)(3)   // 6
   ```

   通用的柯里化函数：

   ```js
   function currying (fn) {
   	const slice = Array.prototype.slice
     const __args = slice.call(arguments, 1)
     return function () {
   		const __inargs = slice.call(arguments)
   		return fn.apply(null, __args.concat(__inargs))
   	}
   }
   
   function multiply (a, b, c) {
     return a * b * c
   }
   const curryingMultiply = currying(multiply)
   curryingMultiply(2,3,4)   // 24
   ```

3. 函数的反柯里化？

   乍看名字，感觉反柯里化与柯里化互反，难道就是把一个柯里化函数转变为普通函数？No！其实不是这样，反柯里化是指可以让任何对象拥有原生对象的方法。

   举个例子：

   ```js
   const obj = {}
   const push = Array.prototype.push.uncurrying()
   push(obj, 'first')
   console.log(obj[0])   // first
   ```

   而反柯里化的实现就简单很多：

   ```js
   Function.prototype.uncurrying = function() {
   	const that = this
   	return function() {
   		return Function.prototype.call.apply(that, arguments)
   	}
   }
   ```

### 发布订阅模式 VS 观察者模式

1. 发布订阅模式？

   顾名思义，发布订阅模式就必然会有一个发布者（emit）和订阅者（on）。通俗来讲，我们可以理解为事件监听和事件上报，主要通过回调函数用在异步编程中。**发布者和订阅者完全解耦，彼此互不认识，没有任何关系。**通常会把订阅者订阅的事件存放在数组中，每次发布消息的时候，都会找到数组中对应的订阅事件去执行（如有多个，依次执行）。

   概念比较模糊，我们通过一个例子来清晰的理解（貌似例子比较重，但确实是我们很常用的场景）：

   ```js
   // 假设我有一个播放器的类，并初始化了一个实例
   const player = new MyPlayer()
   
   // 用户需要在监听到视频播放和暂停的时候触发自己的事件
   player.on('play', function () {   // 触发实例方法订阅
     console.log('I\'m playing')
   })
   player.on('pause', function () {   // 触发实例方法订阅
     console.log('I\'m paused')
   })
   
   // 在 MyPlayer 类内部，我们需要这样实现
   class MyPlayer {
     constructor () {
       // ... 省略代码
       this.video = video
       this.eventsCache = {
         key: [],
         value: []
       }
     }
     on (key, cb) {   // 订阅，将每个订阅的事件都存放到数组中
       this.eventsCache.key.push(key)
       this.eventsCache.value.push(cb)
     }
     emit (key) {   // 发布事件
       this.eventsCache.value[this.eventsCache.key.findIndex(v => v === key)]()
     }
     play () {
       this.video.addEventListener('play', () => {
         this.emit ('play')
       })
     }
     pause () {
       this.video.addEventListener('pause', () => {
         this.emit ('pause')
       })
     }
   }
   ```

2. 观察者模式？

   观察者（Observer）模式其实相对更好理解，比如 Vue 里面的 Watcher ，有观察者就必然会有被观察者，而且两者是有关联的，当被观察者状态发生变化，需要通知观察者。其本质还是发布订阅模式，只不过增加了强耦合。

## 开始

Promise 是用来解决异步问题的，对于 Promise 的实现，官方规定是需要遵循 [PromiseAPlus 规范](https://promisesaplus.com/) 。

- Promise 应该是一个对象或者函数，需要传入一个 Executor 执行器函数，该执行器没有返回值且默认立即执行。
- Promise 应该有三个状态：等待态（pending）、成功态（fulfilled）和失败态（rejected）。默认为等待态，等待态可以转化为成功态或失败态，一旦成功就不能再失败，一旦失败也就不能再成功。失败态有两种情况，一种是调用了 reject 修改状态，另一种就是抛出异常。
- Executor 执行器接收两个参数：resolve 和 reject ，这两个参数也各自都是一个函数，可以用来修改 Promise 的状态，且没有返回值。resolve 用来将状态修改为成功态，reject 用来将状态修改为失败态。
- resolve 和 reject 都接收一个参数，分别用来存放成功的内容（value）和失败的原因（reason），默认参数值都为 undefined 。
- Promise 的实例应该拥有 then 方法，该方法可以访问到成功的值（value）和失败的原因（reason）。then 方法接收两个函数作为参数，第一个是 onfulfilled （成功的回调），第二个是 onrejected （失败的回调）。
- 一个 Promise 可以 then 多次，所以需要用到发布订阅模式，将 then 里面的方法全部先存起来，等到异步执行完毕后再一次执行 then 里面的方法。
- 如果一个 then 里面返回的是一个普通值或者是一个成功态的 Promise ，则会继续走下一个 then 的成功方法；如果一个 then 里面抛出了异常或者返回的是一个失败态的 Promise ，则会继续走下一个 then 的失败方法。
- Promise 中实现链式调用，依赖的是每一个链都返回一个新的 Promise 。

## 最终代码实现

```js
// 定义常量状态
const PENDING = 'PENDING'
const FULFILLED = 'FULFILLED'
const REJECTED = 'REJECTED'

// 判断x的状态，让promise2 变成成功态还是失败态
const resolvePromise = (promise2, x, resolve, reject) => {
  // 此方法是为了兼容所有 Promise ，比如一些非规范的实现
  // 1）引用同一个对象的问题 promise2 === x
  if (promise2 === x) {   // 此时形成锁死，promise2 一直在等待自身变为成功或者失败，但永远又不会变为成功和失败，因为没有调用 resolve 或者 reject
    return reject(new TypeError('Chaining cycle detected for promise #<Promise>'))
  }
  // 2）判断如果 x 是一个对象或者函数，那么它有可能是个 Promise
  let called   // 设置标识，只要调过一次 resolve 或者 reject ，就忽略后面的
  if ((typeof x === 'object' && x !== null) || typeof x === 'function') {
    try {
      // 因为取得 x.then 的时候，也可能报错，所以也需要用个 trycatch 包起来
      let then = x.then
      if (typeof then === 'function') {   // 只能认定它是 Promise 了，js 也只能判断到这了 
        // 只取一次，因为再次取得 x.then 的时候，还有报错的风险，所使用 call
        then.call(x, y => {   // 这个结果 y 有可能还是 Promise ，所以还得继续解析，直到出现普通值或者错误
          // 成功的函数，递归解析 y 的值
          if (called) return
          called = true
          resolvePromise(promise2, y, resolve, reject)
        }, r => {
          // 失败的函数
          if (called) return
          called = true
          reject(r)
        })
      } else {
        resolve(x)
      }
    } catch (error) {
      // 防止别人的 Promise 在 失败里面调用 resolve
      if (called) return
      called = true
      reject(error)
    }
  } else {   // 如果不是对象或者函数，那肯定就是个简单值，那直接成功就可以了
    resolve(x)
  }
}

// 定义 Promise 类
class Promise {
  constructor (executor) {
    this.status = PENDING   // 默认是等待态
    this.value = undefined   // 定义 resolve 默认参数值
    this.reason = undefined   // 定义 reason 默认参数值
    this.fulfilledQueues = []   // 存放 then 里面的成功的回调函数
    this.rejectedQueues = []   // 存放 then 里面的失败的回调函数
    const resolve = value => {
      if (value instanceof Promise) {
        value.then(resolve, reject)
        return
      }
      if (this.status === PENDING) {   // 只有状态是等待态的时候，才能更改状态
        this.value = value
        this.status = FULFILLED
        // 执行成功队列里的函数
        this.fulfilledQueues.forEach(fn => fn())
      }
    }
    const reject = reason => {
      if (this.status === PENDING) {   // 只有状态是等待态的时候，才能更改状态
        this.reason = reason 
        this.status = REJECTED
        // 执行失败队列里的函数
        this.rejectedQueues.forEach(fn => fn())
      }
    }
    try {   // 只能捕获同步错误
      // executor 会立即执行，但有可能会剖错，所以要使用 try catch
      // 因为要定义在每个实例上而不是原型上，所以需要在 executor 里调用的时候，重新绑定 this 指向。
      executor(resolve, reject)
    } catch (error) {
      reject(error)
    }
  }

  // 应该拥有 then 方法，then 方法接收两个函数作为参数，第一个是 onfullfilled （成功的回调），第二个是 onrejected （失败的回调）。
  then (onfullfilled, onrejected) {
    // 实现穿透，不传参数也可继续执行
    if (typeof onfullfilled !== 'function') {
      onfullfilled = v => v
    }
    if (typeof onrejected !== 'function') {
      onrejected = r => {
        throw r 
      }
    }
    // const { status, value } = this
    // 为能实现链式调用，需要创建一个新的 Promise 并返回
    const promise2 = new Promise((onfullfilledNext, onrejectedNext) => {   // 此处不要有疑惑，因为新的 Promise 的 Executor 会立即执行
      if (this.status === FULFILLED) {
        // 如果上一个 Promise 的状态是 FULFILLED，那我们只需要拿到上一个成功态的返回值
        // 该返回值有可能是个普通值，有可能是个 Promise，如果是个 Promise ，需要让它执行并采用它的状态
        // 也有可能会抛出错误
        setTimeout(() => {
          try {
            const x = onfullfilled(this.value)
            resolvePromise(promise2, x, onfullfilledNext, onrejectedNext)
          } catch (error) {   // 一旦执行 then 方法报错，就会调用新的 Promise 的 reject 方法
            onrejectedNext(error)
          }
        }, 0)
      }
      if (this.status === REJECTED) {
        // 如果上一个 Promise 的状态是 REJECTED，那我们只需要拿到上一个失败态的返回值
        setTimeout(() => {
          try {
            const x = onrejected(this.reason)
            resolvePromise(promise2, x, onfullfilledNext, onrejectedNext)
          } catch (error) {
            onrejectedNext(error)
          }
        }, 0)
      }
      // 判断当前状态，执行对应操作
      if (this.status === PENDING) {   // 如果 exector 里面是异步方法，则先存储 then 里面的方法
        this.fulfilledQueues.push(() => {   // 面向切片编程
          setTimeout(() => {
            try {
              const x = onfullfilled(this.value)
              resolvePromise(promise2, x, onfullfilledNext, onrejectedNext)
            } catch (error) {
              onrejectedNext(error)
            }
          }, 0)
        })
        this.rejectedQueues.push(() => {
          setTimeout(() => {
            try {
              const x = onrejected(this.reason)
              resolvePromise(promise2, x, onfullfilledNext, onrejectedNext)
            } catch (error) {
              onrejectedNext(error)
            }
          }, 0)
        })
      }
    })
    return promise2
  }

  // 以下方法都不是规范里的
  // catch 方法
  catch (onrejected) {
    return this.then(null, onrejected)
  }
  finally (cb) {
    return this.then(value => {
      this.resolve(cb()).then(() => value)
    }, reason => {
      this.resolve(cb()).then(() => { throw reason })
    })
  }
  // 其他静态方法
  // resolve 方法，参数还可以是 Promise 并且具有延迟等待效果
  static resolve (value) {
    return new Promise((resolve, reject) => resovle(value))
  }
  // reject 方法，参数如果是 Promise 则是无意义的
  static reject (reason) {
    return new Promise((resolve, reject) => reject(reason))
  }
  // Promise.all() 该方法接收一个数组，数组里的每一项可以是 promise 也可以是普通值，且会按照传入的次序对应返回值，如果一个出错了，那整体都完蛋
  static all (promises) {
    let arr = []
    let count = 0
    return new Promise((resolve, reject) => {
      for (let [i, x] of promises.entries) {
        this.resovle(x).then(y => {
          arr[i] = y
          count++
          if (count === promises.length) {
            resolve(arr)
          }
        }, reject)   // 只要有一个是 reject 态，就直接 reject
      }
    })
  }
  static rece (promises) {
    return new Promise((resolve, reject) => {
      for (let x of promises.entries) {
        this.resolve(x).then(resolve, reject)
      }
    })
  }
}

// 测试脚本，以供官方提供的库 promises-aplus-tests 来测试
Promise.defer = Promise.deferred = function () {
  let dfd = {}
  dfd.promise = new Promise((resolve, reject) => {
     dfd.resolve = resolve
     dfd.reject = reject
  })
  return dfd
}

module.exports = Promise
```

## Promise Aplus 规范官方提供测试库

[promises-aplus-tests](https://github.com/promises-aplus/promises-tests)

安装：

```shell
npm i promises-aplus-tests -g
```

使用：

```shell
promises-aplus-tests promise.js
```