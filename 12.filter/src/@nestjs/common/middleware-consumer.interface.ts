import { RequestMethod } from "./request.method.enum";

export interface MiddlewareConsumer {
  //应用多个中间件
  apply(...middlewares): this;
  //配置应用此中间件的路径
  forRoutes(...routes: Array<string | { path: string; method: RequestMethod } | Function>);
  //排除部分路由
  exclude(...routes: Array<string | { path: string; method: RequestMethod }>);
}
