import { Reflector } from "@nestjs/core";

//使用Reflector这个类的createDecorator方法创建一个新的装饰器 Roles2
//此装饰器可以接收参数
export const Roles2 = Reflector.createDecorator();
