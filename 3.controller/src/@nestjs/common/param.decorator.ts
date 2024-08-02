import "reflect-metadata";

/**
 * 返回一个参数装饰器
 * @param key
 * @returns
 */
export const createParamDecorator = (key: String) => {
  // target控制器原型
  // propertyKey 方法名handleRequest
  // parameterIndex 先走1再走0
  return () => (target: any, propertyKey: string, parameterIndex: number) => {
    const existingParameters = Reflect.getMetadata(`params`, target, propertyKey) || [];
    existingParameters.push({ parameterIndex, key });
    //existingParameters[parameterIndex]=key;
    //[{ parameterIndex: 1, key: 'Request' },{ parameterIndex: 0, key: 'Req' }]
    console.log("existingParameters", existingParameters);

    //给控制器类的原型的propertyKey也就是handleRequest方法属性上添加元数据
    //属性名是params，值是一个数组，数组里应该放置数据，表示哪个位置使用的哪个装饰器
    Reflect.defineMetadata(`params`, existingParameters, target, propertyKey);
  };
};
export const Request = createParamDecorator("Request");
export const Req = createParamDecorator("Req");
