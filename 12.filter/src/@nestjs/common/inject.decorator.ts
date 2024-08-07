import "reflect-metadata";
import { INJECTED_TOKENS } from "./";

// 属性装饰器
// @Inject装饰器用于显式地指定一个依赖项的注入。
// 构造函数在一些情况下，自动注入可能无法满足需求，比如当你需要注入一个具体的令牌或标识符时。
// 此实现只考虑了@Inject使用在构造函数中的情况，未考虑基于属性的注入。
export function Inject(token: string): ParameterDecorator {
  //target类本身 propertyKey方法的名称 parameterIndex参数的索引
  return (target: Object, propertyKey: string, parameterIndex: number) => {
    //取出被注入到此类的构建函数中的token数组
    const existingInjectedTokens = Reflect.getMetadata(INJECTED_TOKENS, target) ?? [];
    //[0,1] [empty,'StringToken']
    existingInjectedTokens[parameterIndex] = token;
    //把token数组保存在target的元数据上
    Reflect.defineMetadata(INJECTED_TOKENS, existingInjectedTokens, target);
  };
}
