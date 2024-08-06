import "reflect-metadata";

// 返回一个方法装饰器
export function Get(path: string = ""): MethodDecorator {
  /**
   * target 类原型 AppController.prototype
   * propertyKey方法键名 即index
   * descriptor 即index方法的属性描述器
   */
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    //给descriptor.value，也就是index函数添加元数据，path=path
    Reflect.defineMetadata("path", path, descriptor.value);
    //给descriptor.value，也就是index函数添加元数据，method=GET
    Reflect.defineMetadata("method", "GET", descriptor.value);
  };
}
