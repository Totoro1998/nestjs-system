import "reflect-metadata";

// 类装饰器
// @Injectable装饰器用于标记一个类可以被注入为依赖项。它告诉NestJS这个类可以被注入到其他类中，从而实现依赖注入。
// 该类实例的创建交给Nest IOC容器
export function Injectable(): ClassDecorator {
  return function (target: Function) {
    //给类的定义添加一个元数据，数据名称为injectable,值为true，说明该类可被注入
    Reflect.defineMetadata("injectable", true, target);
  };
}
