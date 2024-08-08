import "reflect-metadata";
import express, { Express, Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import { Logger } from "./logger";
import path from "path";
import { ArgumentsHost, RequestMethod } from "@nestjs/common";
import { APP_FILTER } from "./constants";
import { INJECTED_TOKENS, DESIGN_PARAMTYPES } from "../common/constants";
import { defineModule } from "../common/module.decorator";
import { GlobalHttpExectionFilter } from "../common/custom-global-http-exception.filter";
export class NestApplication {
  //在它的内部私用化一个Express实例
  private readonly app: Express = express();
  //在此处保存所有的provider。key就是token, 值就是类的实例或者值。
  private readonly allProviderInstances = new Map();
  //此入存放着全局可用的provider
  private readonly globalProviders = new Set();
  //记录哪个模块里有哪些providers
  private readonly moduleProviers = new Map();
  //记录所有的中间件 可是中间件的类，也可能是中间件的实例，也可有是一个函数中间件
  private readonly middlewares = [];
  //记录所有的要排除的路径
  private readonly middlewaresExcludedRoutes = [];
  //添加一个默认的全局异常过滤器
  private readonly defaultGlobalHttpExceptionFilter = new GlobalHttpExectionFilter();
  //这里存放着所有的全局的异常过滤器
  private readonly globalHttpExceptionFilters = [];

  constructor(protected readonly rootModule) {
    this.app.use(express.json()); //用来把JSON格式的请求体对象放在req.body上
    this.app.use(express.urlencoded({ extended: true })); //把form表单格式的请求体对象放在req.body
  }

  //启动HTTP服务器
  async listen(port) {
    await this.initProviders(); // 初始化providers
    await this.initMiddlewares(); // 初始化中间件配置
    await this.initGlobalFilters(); //初始化全局的过滤器
    await this.initController(this.rootModule); // 初始化Controller
    //调用express实例的listen方法启动一个HTTP服务器，监听port端口
    this.app.listen(port, () => {
      Logger.log(`Application is running on http://localhost:${port}`, "NestApplication");
    });
  }
  //初始化提供化
  async initProviders() {
    //获取根模块的imports，即其他Module。
    const imports = Reflect.getMetadata("imports", this.rootModule) ?? [];
    //遍历所有的导入的模块
    for (const importModule of imports) {
      //LoggerModule
      let importedModule = importModule;
      //如果导入的是一个Promise，说是它是异步的动态模块
      if (importModule instanceof Promise) {
        importedModule = await importedModule;
      }
      //如果导入的模块有module属性，说明这是一个动态模块
      if ("module" in importedModule) {
        //获取动态模块返回的老的模块定义，新的providers数组，新的导出的token数组
        const { module, providers, controllers, exports } = importedModule;
        //新老controllers、providers、exports、进行合并，此代码未考虑imports
        const oldControllers = Reflect.getMetadata("controllers", module);
        const newControllers = [...(oldControllers ?? []), ...(controllers ?? [])];
        const oldProviders = Reflect.getMetadata("providers", module);
        const newProviders = [...(oldProviders ?? []), ...(providers ?? [])];
        const oldExports = Reflect.getMetadata("exports", module);
        const newExports = [...(oldExports ?? []), ...(exports ?? [])];
        Reflect.defineMetadata("controllers", newControllers, module);
        Reflect.defineMetadata("providers", newProviders, module);
        Reflect.defineMetadata("exports", newExports, module);
        defineModule(module, newControllers);
        defineModule(module, newProviders);
        this.registerProvidersFromModule(module, this.rootModule);
      } else {
        this.registerProvidersFromModule(importedModule, this.rootModule);
      }
    }
    //获取当前模块提供者的元数据
    const providers = Reflect.getMetadata("providers", this.rootModule) ?? [];
    //遍历并添加每个提供者
    for (const provider of providers) {
      this.addProvider(provider, this.rootModule);
    }
  }
  //初始化中间件配置
  initMiddlewares() {
    //调用配置中间的的方法，MiddlewareConsumer就是当前的NestApplication的实例
    this.rootModule.prototype.configure?.(this);
  }

  async initGlobalFilters() {
    // 获取当前的模块的所有的providers
    const providers = Reflect.getMetadata("providers", this.rootModule) ?? [];
    for (const provider of providers) {
      if (provider.provide === APP_FILTER) {
        const providerInstance = this.getProviderByToken(APP_FILTER, this.rootModule);
        this.useGlobalFilters(providerInstance);
      }
    }
  }
  //配置controller
  async initController(module) {
    //取出模块里所有的控制器，然后做好路由配置
    const controllers = Reflect.getMetadata("controllers", module) || [];
    Logger.log(`AppModule dependencies initialized`, "InstanceLoader");
    //路由映射的核心是知道 什么样的请求方法什么样的路径对应的哪个处理函数
    for (const Controller of controllers) {
      //解析出控制器的依赖
      const dependencies = this.resolveDependencies(Controller);
      //创建每个控制器的实例
      const controller = new Controller(...dependencies);
      //获取控制器的路径前缀
      const prefix = Reflect.getMetadata("prefix", Controller) || "/";
      //开始解析路由
      Logger.log(`${Controller.name} {${prefix}}`, "RoutesResolver");
      const controllerPrototype = Controller.prototype;
      // 获取控制器上绑定的异常过滤器数组，UseFilters装饰器
      const controllerFilters = Reflect.getMetadata("filters", Controller) ?? [];
      defineModule(this.rootModule, controllerFilters);
      //遍历类的原型上的方法名
      for (const methodName of Object.getOwnPropertyNames(controllerPrototype)) {
        //获取原型上的方法 index
        const method = controllerPrototype[methodName];
        //取得此函数上绑定的方法名的元数据
        const httpMethod = Reflect.getMetadata("method", method); //GET
        //取得此函数上绑定的路径的元数据
        const pathMetadata = Reflect.getMetadata("path", method);
        const redirectUrl = Reflect.getMetadata("redirectUrl", method);
        const redirectStatusCode = Reflect.getMetadata("redirectStatusCode", method);
        const statusCode = Reflect.getMetadata("statusCode", method);
        const headers = Reflect.getMetadata("headers", method) ?? [];
        //获取方法上绑定的异常过滤器数组，UseFilters装饰器
        const methodFilters = Reflect.getMetadata("filters", method) ?? [];
        defineModule(this.rootModule, methodFilters);
        //如果方法名不存在，则不处理
        if (!httpMethod) continue;
        //拼出来完整的路由路径
        const routePath = path.posix.join("/", prefix, pathMetadata);
        //配置路由，当客户端以httpMethod方法请求routePath路径的时候，会由对应的函数进行处理
        this.app[httpMethod.toLowerCase()](routePath, async (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
          const host: ArgumentsHost = {
            //因为Nest不但支持http,还支持graphql 微服务 websocket
            switchToHttp: () => ({
              getRequest: () => req,
              getResponse: () => res,
              getNext: () => next,
            }),
          };
          try {
            const args = this.resolveParams(controller, methodName, req, res, next, host);
            //执行路由处理函数，获取返回值
            const result = await method.call(controller, ...args);
            if (result?.url) {
              return res.redirect(result.statusCode || 302, result.url);
            }
            //判断如果需要重定向，则直接重定向到指定的redirectUrl
            if (redirectUrl) {
              return res.redirect(redirectStatusCode || 302, redirectUrl);
            }
            if (statusCode) {
              res.statusCode = statusCode;
            } else if (httpMethod === "POST") {
              res.statusCode = 201;
            }
            //判断controller的methodName方法里有没有使用Response或Res参数装饰器，如果用了任何一个则不发响应
            const responseMetadata = this.getResponseMetadata(controller, methodName);
            //或者没有注入Response参数装饰器，或者注入了但是传递了passthrough参数，都会由Nest.js来返回响应
            if (!responseMetadata || responseMetadata?.data?.passthrough) {
              headers.forEach(({ name, value }) => {
                res.setHeader(name, value);
              });
              //把返回值序列化发回给客户端
              res.send(result);
            }
          } catch (error) {
            await this.callExceptionFilters(error, host, methodFilters, controllerFilters);
          }
        });
        Logger.log(`Mapped {${routePath}, ${httpMethod}} route`, "RoutesResolver");
      }
    }
    Logger.log(`Nest application successfully started`, "NestApplication");
  }

  // 从Module中注册Providers
  private registerProvidersFromModule(module, ...parentModules) {
    //获取导入的是不是全局模块
    const global = Reflect.getMetadata("global", module);
    //拿到导入的模块providers进行全量注册
    const importedProviders = Reflect.getMetadata("providers", module) ?? [];
    //1.有可能导入的模块只导出了一部分，并没有全量导出,所以需要使用exports进行过滤
    const exports = Reflect.getMetadata("exports", module) ?? [];
    //遍历导出exports数组
    for (const exportToken of exports) {
      //2.exports里还可能有module
      const isModule = exportToken && exportToken instanceof Function && Reflect.getMetadata("isModule", exportToken);
      if (isModule) {
        //要执行递归操作
        this.registerProvidersFromModule(exportToken, module, ...parentModules);
      } else {
        const provider = importedProviders.find((provider) => provider === exportToken || provider.provide == exportToken);
        // 如果在exports中找到对应的provider
        if (provider) {
          [module, ...parentModules].forEach((module) => {
            this.addProvider(provider, module, global);
          });
        }
      }
    }
    // 从Module注册完之后Providers之后
    this.initController(module);
  }

  /**
   * 解析Module装饰器中的provider四种配置语法
   * @param provider
   * @param module 每个模块都有自己的provider
   * @param global
   * @returns
   */
  addProvider(provider, module, global = false) {
    //providers在global为true的情况下就是 this.globalProviders Set
    //providers在global为false的情况下就是module对应的providers Set
    const providers = global ? this.globalProviders : this.moduleProviers.get(module) || new Set();
    if (!global) {
      this.moduleProviers.set(module, providers);
    }
    //获取要注册的provider的token
    const injectToken = provider.provide ?? provider;
    //如果实例池里已经有此token对应的实例了
    if (this.allProviderInstances.has(injectToken)) {
      //则直接把此token放入到providers这个集合直接返回
      if (!providers.has(injectToken)) {
        providers.add(injectToken);
      }
      return;
    }

    // 处理useValue语法： 如果提供的是一个值，则直接放到Map中
    if (provider.provide && provider.useValue) {
      this.allProviderInstances.set(provider.provide, provider.useValue);
      providers.add(provider.provide);
    } else if (provider.provide && provider.useFactory) {
      // 处理useFactory语法
      const inject = provider.inject ?? []; //获取要注入工厂函数的参数，inject数组可以是provider的token值
      //解析出参数的值
      const injectedValues = inject.map((injectToken) => this.getProviderByToken(injectToken, module));
      //执行工厂方法，获取返回的值
      const value = provider.useFactory(...injectedValues);
      //把token和值注册到Map中
      this.allProviderInstances.set(provider.provide, value);
      providers.add(provider.provide);
    } else if (provider.provide && provider.useClass) {
      // 处理useClass语法
      //获取这个类的定义LoggerService
      const Clazz = provider.useClass;
      // 获取此类所需的依赖
      const dependencies = this.resolveDependencies(Clazz);
      //创建提供者类的实例
      const value = new Clazz(...dependencies);
      //把提供者的token和实例保存到Map中
      this.allProviderInstances.set(provider.provide, value);
      providers.add(provider.provide);
    } else {
      // 处理直接是一个类的语法
      //获取此类的参数['suffix']
      const dependencies = this.resolveDependencies(provider);
      //创建提供者类的实例
      const value = new provider(...dependencies);
      //把提供者的token和实例保存到Map中
      this.allProviderInstances.set(provider, value);
      providers.add(provider);
    }
  }

  /**
   * proivder构造函数中的参数值，应该是当前Module的providers数组里的值或者全局Module里的providers
   * @param Clazz
   * @returns
   */
  private resolveDependencies(Clazz) {
    // 获取使用Inject装饰器注入的token
    const injectedTokens = Reflect.getMetadata(INJECTED_TOKENS, Clazz) ?? [];
    // 获取构造函数的参数类型
    const constructorParams = Reflect.getMetadata(DESIGN_PARAMTYPES, Clazz) ?? [];
    // 根据元数据获取当前Clazz所属的Module
    const module = Reflect.getMetadata("module", Clazz);

    return constructorParams.map((param, index) => {
      // 把每个param中的token默认换成对应的provider值
      return this.getProviderByToken(injectedTokens[index] ?? param, module);
    });
  }

  private getProviderByToken = (injectedToken, module) => {
    //如何通过token在特定模块下找对应的provider
    //先找到此模块对应的token set,再判断此injectedToken在不在此set中,如果存在， 是可能返回对应的provider实例
    if (this.moduleProviers.get(module)?.has(injectedToken) || this.globalProviders.has(injectedToken)) {
      return this.allProviderInstances.get(injectedToken);
    } else {
      return null;
    }
  };

  // 中间件相关
  use(middleware) {
    this.app.use(middleware);
  }
  exclude(...routeInfos): this {
    this.middlewaresExcludedRoutes.push(...routeInfos.map(this.normalizeRouteInfo));
    return this;
  }
  apply(...middlewares) {
    // 让middleware与模块联系起来
    defineModule(this.rootModule, middlewares);
    this.middlewares.push(...middlewares);
    return this;
  }
  forRoutes(...routes) {
    //遍历路径信息
    for (const route of routes) {
      //遍历中间件
      for (const middleware of this.middlewares) {
        //把route格式化为标准对象，一个是路径，一个请求方法
        const { routePath, routeMethod } = this.normalizeRouteInfo(route);
        //use方法的第一个参数就表示匹配的路径,如果不匹配根本就进不来
        this.app.use(routePath, (req, res, next) => {
          //forRoutes 和 exclude调用顺序会不会对程序结果有影响
          //如果当前的路径要排除掉的话，那么不走当前的中间件了
          if (this.isExcluded(req.originalUrl, req.method)) {
            return next();
          }
          // 如果配置方法名是All。或者方法相同完全匹配
          if (routeMethod === RequestMethod.ALL || routeMethod === req.method) {
            //此处middleware可能是一个类，也可能是一个实例，也可能只是一个函数
            if ("use" in middleware.prototype || "use" in middleware) {
              const middlewareInstance = this.getMiddelwareInstance(middleware);
              middlewareInstance.use(req, res, next);
            } else if (middleware instanceof Function) {
              middleware(req, res, next);
            } else {
              next();
            }
          } else {
            next();
          }
        });
      }
    }
    // apply和forRoutes是一个组合，第一个apply不能应用到链式调用的第二个forRoutes
    this.middlewares.length = 0;
    return this;
  }
  normalizeRouteInfo(route) {
    let routePath = ""; //转化路径
    let routeMethod = RequestMethod.ALL; //默认是支持所有的方法
    if (typeof route === "string") {
      routePath = route; //传的就是一个路径
    } else if ("path" in route) {
      //如果传入的是一个路径对象，
      routePath = route.path;
      routeMethod = route.method ?? RequestMethod.ALL;
    } else if (route instanceof Function) {
      //如果route是一个控制器的话，以它的路径前缀作为路径
      routePath = Reflect.getMetadata("prefix", route);
    }
    //  cats=>/cats
    routePath = path.posix.join("/", routePath);
    return { routePath, routeMethod };
  }
  getMiddelwareInstance(middleware) {
    // 如果middleware是一个类
    if (middleware instanceof Function) {
      const dependencies = this.resolveDependencies(middleware);
      return new middleware(...dependencies);
    }
    return middleware;
  }
  //this.isExcluded执行的时候 也没有返回this 有影响吗
  isExcluded(reqPath: string, method: RequestMethod) {
    //遍历要排除的路径，看看哪个一个排除的路径和当前的请求路径和方法名匹配
    return this.middlewaresExcludedRoutes.some((routeInfo) => {
      const { routePath, routeMethod } = routeInfo;
      return routePath === reqPath && (routeMethod === RequestMethod.ALL || routeMethod === method);
    });
  }

  private getResponseMetadata(controller, methodName) {
    const paramsMetaData = Reflect.getMetadata(`params`, controller, methodName) ?? [];
    return paramsMetaData.filter(Boolean).find((param) => param.key === "Response" || param.key === "Res" || param.key === "Next");
  }
  private resolveParams(instance: any, methodName: string, req: ExpressRequest, res: ExpressResponse, next: NextFunction, host) {
    //获取参数的元数据
    const paramsMetaData = Reflect.getMetadata(`params`, instance, methodName) ?? [];
    //[{ parameterIndex: 0, key: 'Req' },{ parameterIndex: 1, key: 'Request' }]
    //此处就是把元数据变成实际的参数
    return paramsMetaData.map((paramMetaData) => {
      const { key, data, factory } = paramMetaData; //{passthrough:true}

      switch (key) {
        case "Request":
        case "Req":
          return req;
        case "Query":
          return data ? req.query[data] : req.query;
        case "Headers":
          return data ? req.headers[data] : req.headers;
        case "Session":
          return data ? req.session[data] : req.session;
        case "Ip":
          return req.ip;
        case "Param":
          return data ? req.params[data] : req.params;
        case "Body":
          return data ? req.body[data] : req.body;
        case "Response":
        case "Res":
          return res;
        case "Next":
          return next;
        case "DecoratorFactory":
          return factory(data, host);
        default:
          return null;
      }
    });
    //[req,req]
  }
  // 过滤器相关
  private callExceptionFilters(error, host, methodFilters, controllerFilters) {
    //按方法过滤器、控制器过滤器、用户配置全局过滤器和默认全局过滤的顺序进行遍历，找到第一个能处理这个错误的过滤器进行处理就可以了
    const allFilters = [...methodFilters, ...controllerFilters, ...this.globalHttpExceptionFilters, this.defaultGlobalHttpExceptionFilter];
    for (const filter of allFilters) {
      let filterInstance = this.getFilterInstance(filter);
      // 取出此异常过滤器关心的异步或者说要处理的异常
      const exceptions = Reflect.getMetadata("catch", filterInstance.constructor) ?? [];
      // 如果没有配置catch,或者说当前的错误刚好就是配置的catch的exection的类型或者它的子类
      if (exceptions.length === 0 || exceptions.some((exception) => error instanceof exception)) {
        filterInstance.catch(error, host);
        break;
      }
    }
  }
  // 全局过滤器
  useGlobalFilters(...filters) {
    defineModule(
      this.rootModule,
      filters.filter((filter) => filter instanceof Function)
    );
    this.globalHttpExceptionFilters.push(...filters);
  }
  getFilterInstance(filter) {
    if (filter instanceof Function) {
      const dependencies = this.resolveDependencies(filter);
      return new filter(...dependencies);
    }
    return filter;
  }
}
