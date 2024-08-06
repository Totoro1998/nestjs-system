//方法装饰器
//方法装饰器可以装饰方法
//(target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => void | PropertyDescriptor。

//1.日志记录 AOP
/**
 *
 * @param target 装饰的目标对象，对于静态属性来说就是类的构造函数，对于实例属性来说就是类的prototype属性，即实例的原型
 * @param propertyKey 装饰的成员名称
 * @param descriptor 成员的属性描述符
 */
function log(target, propertyKey, descriptor) {
  //获取老的函数
  const originalMethod = descriptor.value;
  //重定原型上的属性
  descriptor.value = function (...args: any[]) {
    console.log(`Calling ${propertyKey} with arguments:${args}`);
    // this指的是Calculator实例。
    // 如果不使用apply，假如add方法里使用了this，add方法里的this会是undefined。
    const result = originalMethod.apply(this, args);
    // const result = originalMethod(...args);
    console.log(`Result:${result}`);
    return result;
  };
}
class Calculator {
  @log
  add(a: number, b: number): number {
    this.test();
    return a + b;
  }
  test() {
    console.log("test");
  }
}
const calculator = new Calculator();
calculator.add(1, 2);
