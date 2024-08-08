import "reflect-metadata";
//模块的元数据
interface ModuleMetadata {
  controllers?: Function[]; // 此模块中定义的一组控制器，这些控制器必须被实例化
  providers?: any[]; // 将由 Nest 注入器实例化的提供者，这些提供者至少可以在此模块内共享
  exports?: any[]; // 此模块提供的 providers 子集，这些提供者应在导入此模块的其他模块中可用。您可以使用提供者本身或其 token（provide 值）
  imports?: any[]; // 导入的模块列表，这些模块导出此模块中需要的提供者
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
