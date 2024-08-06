/**
 * 依赖倒置原则要求高层模块不应该原来低层模块，二者都应该依赖抽象，也就是接口或抽象类
 * 依赖关系应该是通过抽象来实现，而不是通过具体来实现
 *
 */

/* class MYSQLDatabase{
    connect(){}
    save(user){

    }
}
class UserStore{
    private database:MYSQLDatabase
    constructor(){
        this.database = new MYSQLDatabase();
    }
    save(user){
        this.database.connect();
        this.database.save(user);
    }
} */

interface Database {
  connect(): void;
  save(obj): void;
}

class UserStore {
  database: Database;
  //依赖倒置指的是在此处参数里依赖的是接口而不是实现
  //此处依赖的是一个接口，但是在真正创建UserStore的时候还是需要一个实例的
  //这个实例可能是用户手工创建的
  //也可是由容器创建注入进去的
  constructor(database: Database) {
    this.database = database;
  }
  save(user) {
    this.database.connect();
    this.database.save(user);
  }
}
class MYSQLDatabase implements Database {
  connect(): void {
    throw new Error("Method not implemented.");
  }
  save(obj: any): void {
    throw new Error("Method not implemented.");
  }
}
class MongodbDatabase implements Database {
  connect(): void {
    throw new Error("Method not implemented.");
  }
  save(obj: any): void {
    throw new Error("Method not implemented.");
  }
}
//这个实例可能是用户手工创建的
const mySQLDatabase = new MYSQLDatabase();
const userStore = new UserStore(mySQLDatabase);
userStore.save({ id: 1, name: "nick" });
