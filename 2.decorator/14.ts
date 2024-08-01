function first() {
  console.log("first(): factory evaluated");
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    console.log("first(): called");
  };
}

function second() {
  console.log("second(): factory evaluated");
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    console.log("second(): called");
  };
}

function third(target, propertyKey) {
  console.log("third(): called");
}

function fourth(target, propertyKey) {
  console.log("fourth(): called");
}

class ExampleClass {
  @first()
  @second()
  @third
  @fourth
  method() {}
}

// first(): factory evaluated
// second(): factory evaluated
// fourth(): called
// third(): called
// second(): called
// first(): called
