//属性访问控制
//这段代码和compilerOptions的target版本有关系，新版本ESNext不行， "target": "es2015"时可以生效

function defaultValue(value: any) {
  return function (target: any, propertyKey: string) {
    let val = value;
    const getter = function () {
      return val;
    };
    const setter = function (newValue) {
      val = newValue;
    };
    //在类的原型上定义了一个属性
    Object.defineProperty(target, propertyKey, {
      enumerable: true,
      configurable: true,
      get: getter,
      set: setter,
    });
  };
}

class Settings {
  @defaultValue("dark")
  theme: string;
}

const settings = new Settings();
console.log(settings.theme);
