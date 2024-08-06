import "reflect-metadata";
//模块的元数据
interface ModuleMetadata {
  controllers: Function[];
}
//定义模块装饰器，该模块装饰器是一个装饰器工厂，返回一个类装饰器
export function Module(metadata: ModuleMetadata): ClassDecorator {
  /**
   * target:[class AppModule]
   */
  return (target: Function) => {
    //给模块类AppModule添加元数据,元数据的名字叫controllers,值是controllers数组[AppController]
    Reflect.defineMetadata("controllers", metadata.controllers, target);
  };
}
