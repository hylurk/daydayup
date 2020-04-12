# 深入剖析浏览器块级作用域机制

我们都知道，块级作用域的概念是在 ES6 中才引入的。而浏览器必须做到向后兼容，所以有些处理就让人很迷惑，我们来看下面一道题：

```js
var a = 0
if (true) {
  a = 1
  function a() {}
  a = 21
  console.log(a)
}
console.log(a)

// 以上代码的输出结果是？
```

我们先不着急回答，因为 99% 的概率你会答错。先从简单的开始：

## 例子1

```js
// 例子1
console.log(a)
var a = 0
console.log(a)
function a() {}
console.log(a)
```

不论是ES5 还是 ES6 ，对于 var 和 function 关键字的声明都存在变量提升且函数优先，而且对于 function 关键字来说，是 **声明+赋值** 都提升，且在遇到声明代码的时候不再重复运行。所以以上代码的实际执行其实是这样的：

```js
function a() {}
// var a 重复声明被忽略掉
console.log(a)
a = 0
console.log(a)
console.log(a)
```

所以上面例子1 的实际输出结果就是：

```js
// 例子1
console.log(a)   // f a() {}
var a = 0
console.log(a)   // 0
function a() {}
console.log(a)   // 0
```

接下来，我们再进阶一下：

## 例子2

```js
console.log(a)
if (true) {
  console.log(a)
  var a = 0
  console.log(a)
}
console.log(a)

// 以上代码的输出结果是？
```

在分析这个例子之前，我们必须先明确一点：块级作用域只对 let、const、function 声明的变量起作用（function 会被提升到当前作用域），对 var 是不起作用的，var 还是会被提升到全局作用域。

所以上面的例子实际执行是这样的：

```js
var a
console.log(a)
if (true) {
  console.log(a)
  a = 0
  console.log(a)
}
console.log(a)
```

所以例子2 的执行结果如下：

```js
console.log(a)   // undefined
if (true) {
  console.log(a)   // undefined
  var a = 0
  console.log(a)   // 0
}
console.log(a)   // 0
```

接下来，我们再进阶：

## 例子3

```js
console.log(a)
var a = 0
if (true) {
  console.log(a)
  function a() {}
  console.log(a)
}
console.log(a)
```

在分析这个例子之前，我们还是要先明确一点：块级作用域在老版本浏览器（未实现 ES6 ）中，对 function 也是不起作用的，function 声明的变量同样会提升到全局作用域 EC(G)，而且不管条件是否成立，都要进行变量提升。而对于块级作用域在新版本浏览器中，为了兼容 ES5 ，function 还是会在全局进行变量提升，只不过此时只是声明，不赋值。

所以，在老版本浏览器中，实际执行如下：

```js
function a() {}
// var a 重复声明被忽略掉
console.log(a)
a = 0
if (true) {
  console.log(a)
  console.log(a)
}
console.log(a)
```

运行结果如下：

```js
console.log(a)   // f a() {}
var a = 0
if (true) {
  console.log(a)   // 0
  function a() {}
  console.log(a)   // 0
}
console.log(a)   // 0
```

在新版本浏览器中，实际执行如下：

```js
function a
// var a 重复声明被忽略掉
console.log(a)
a = 0
if (true) {
  function a() {}   // 变量提升，a 为块作用域中的私有变量
  console.log(a)
  // function a() {}   // 到这一步，不会在对 a 重新赋值，但是为了兼容 ES5，会把之前代码修改的 a 的值，映射到全局作用域
  console.log(a)
}
console.log(a)   // 被映射了
```

运行结果如下：

```js
console.log(a)   // undefined
var a = 0
if (true) {
  console.log(a)   // f a() {}
  function a() {}
  console.log(a)   // f a() {}
}
console.log(a)   // f a() {}
```

明白了这些，我们终于可以来解答我们最初的问题了：

## 解答

最初问题在新版本浏览器中实际执行如下：

```js
function a
// var a 重复声明被忽略掉
a = 0
if (true) {
  function a() {}
  a = 1   // 在执行下一行的时候，把我映射了
  // function a() {}   // 不再重复执行，但是会将之前结果映射到全局
  a = 21
  console.log(a)
}
console.log(a)
```

所以执行结果为：

```js
var a = 0
if (true) {
  a = 1
  function a() {}
  a = 21
  console.log(a)   // 21
}
console.log(a)   // 1
```

最初问题在老版本浏览器中实际执行如下：

```js
function a() {}
// var a 重复声明被忽略掉
a = 0
if (true) {
  a = 1 
  a = 21
  console.log(a)
}
console.log(a)
```

执行结果为：

```js
var a = 0
if (true) {
  a = 1
  function a() {}
  a = 21
  console.log(a)   // 21
}
console.log(a)   // 21
```

还要注意有个变态，在 IE Edge下，虽然他也实现了 ES6 ，但是它有点变态。

在 IE Edge 实际执行如下：

```js
function a
// var a 重复声明被忽略掉
a = 0
if (true) {
  function a() {}
  a = 1
  // function a() {}   // 此时不会将这行代码之前的结果映射，而是将这行代码映射
  a = 21
  console.log(a)
}
console.log(a)
```

执行结果为：

```js
var a = 0
if (true) {
  a = 1
  function a() {}
  a = 21
  console.log(a)   // 21
}
console.log(a)   // f a() {}
```

## 总结

- 在所有浏览器中，关键字 var 和 function 声明的变量都会进行变量提升，且函数优先。
- 在所有浏览器中，块级作用域对 var 的变量提升没有限制，都提升到全局作用域 EC(G)。
- 在所有浏览器中，function 一旦提升之后，在遇到代码声明和赋值实际所在的地方，将不会重复执行；在老版本浏览器中，块级作用域对于 function 的变量提升没有限制，都提升到全局作用域且声明+赋值；在新版本浏览器中，function 的变量的声明会提升到全局作用域，在块级作用域中会提升到当前作用域顶部并重新声明+赋值。
- 在新版本浏览器中，当实际执行到 function 声明赋值变量的代码时，为了对 ES5 兼容，会将该变量之前运行的结果映射到全局作用域中，也就是说会改变全局作用域该变量的值。
- IE Edge 除外，虽然它实现了 ES6 ，但映射的时候，如果该变量变成了函数，会把函数作为高优先级映射出去。