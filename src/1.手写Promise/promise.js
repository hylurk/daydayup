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

// 测试脚本
Promise.defer = Promise.deferred = function () {
  let dfd = {}
  dfd.promise = new Promise((resolve, reject) => {
     dfd.resolve = resolve
     dfd.reject = reject
  })
  return dfd
}

module.exports = Promise