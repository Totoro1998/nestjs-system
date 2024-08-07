import "reflect-metadata";
//模块的元数据
interface ModuleMetadata {
  controllers?: Function[];
  providers?: any[];
  exports?: any[]; //模块的导出 可以把自己的一部分providers导出给别的模块的，别的模块只要导入了自己这个模块，
  imports?: any[]; //导入的模块 可以导入别的模块，把别的模块的导出的providers给自己用
}
//定义模块装饰器
export function Module(metadata: ModuleMetadata): ClassDecorator {
  //类装饰器
  return (target: Function) => {
    //当一个类使用Module装饰器的时候就可以添加标识它是一个模块的元数据
    Reflect.defineMetadata("isModule", true, target);
    // 在类上保存controllers、providers、exports、imports元数据。
    Reflect.defineMetadata("controllers", metadata.controllers, target);
    Reflect.defineMetadata("providers", metadata.providers, target);
    Reflect.defineMetadata("exports", metadata.exports, target);
    Reflect.defineMetadata("imports", metadata.imports, target);
    //就是把控制器的类和提供者的类和对应的模块进行了关联
    //我得知道此控制器属于哪个模块
    defineModule(target, metadata.controllers);
    //我得知道此providers属于哪个模块，但因为providers有多种语法，所以此处做了一些额外处理。只获取是类的provider，并进行关联。
    defineModule(
      target,
      (metadata.providers ?? []).map((provider) => (provider instanceof Function ? provider : provider.useClass)).filter(Boolean)
    );
  };
}

export function defineModule(targetModule, targets = []) {
  targets.forEach((target) => {
    Reflect.defineMetadata("module", targetModule, target);
  });
}
// 全局模块装饰器
export function Global() {
  return (target: Function) => {
    Reflect.defineMetadata("global", true, target);
  };
}

export interface DynamicModule extends ModuleMetadata {
  module: Function;
}
