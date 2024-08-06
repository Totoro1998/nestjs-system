import { Injectable, Inject } from "@nestjs/common";
@Injectable()
export class LoggerClassService {
  log(message) {
    console.log("---LoggerClassServic log---", message);
  }
}
@Injectable()
export class LoggerService {
  constructor(@Inject("SUFFIX") private suffix: string) {
    console.log("---LoggerService constructor---", this.suffix);
  }
  log(message) {
    console.log("---LoggerService log---", message);
  }
}

@Injectable()
export class UseValueService {
  constructor(prefix: string) {
    console.log("---UseValueService constructor---", prefix);
  }
  log(message) {
    console.log("---UseValueService log---", message);
  }
}

@Injectable()
export class UseFactory {
  constructor(private prefix1: string, private suffix: string) {
    console.log("---UseFactory constructor---", prefix1, suffix);
  }
  log(message) {
    console.log("---UseFactory log---", this.suffix, message);
  }
}
