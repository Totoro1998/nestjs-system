import "reflect-metadata";

//返回类或者方法装饰器
export function UseFilters(...filters: any[]) {
  return (target: object | Function, propertyKey?: string | symbol, descriptor?: any) => {
    if (descriptor) {
      //如果是方法装饰器，绑到方法上
      Reflect.defineMetadata("filters", filters, descriptor.value);
    } else {
      //如果是类装饰器，绑定到类上
      Reflect.defineMetadata("filters", filters, target);
    }
  };
}
